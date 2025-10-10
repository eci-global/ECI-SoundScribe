-- Create automations schema
CREATE SCHEMA IF NOT EXISTS automations;

-- Automation Rules Table
CREATE TABLE IF NOT EXISTS automations.rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,

  -- Trigger configuration
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('schedule', 'event', 'webhook', 'manual')),
  trigger_config JSONB NOT NULL DEFAULT '{}',

  -- Conditions and actions
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',

  -- Execution tracking
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Automation Executions Table
CREATE TABLE IF NOT EXISTS automations.executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automations.rules(id) ON DELETE CASCADE,

  -- Execution context
  trigger_type TEXT NOT NULL,
  trigger_data JSONB DEFAULT '{}',
  execution_context JSONB DEFAULT '{}',

  -- Execution results
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'partial')),
  success BOOLEAN NOT NULL,
  message TEXT,
  error TEXT,

  -- Metrics
  execution_time_ms INTEGER,
  actions_executed INTEGER DEFAULT 0,
  actions_failed INTEGER DEFAULT 0,
  action_results JSONB DEFAULT '[]',

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Scheduled Jobs Table (for cron-based automations)
CREATE TABLE IF NOT EXISTS automations.scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES automations.rules(id) ON DELETE CASCADE,

  -- Schedule configuration
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',

  -- Job status
  is_active BOOLEAN DEFAULT true,
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_result JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rules_org_id ON automations.rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_rules_enabled ON automations.rules(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_rules_trigger_type ON automations.rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_executions_rule_id ON automations.executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_executions_started_at ON automations.executions(started_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_rule_id ON automations.scheduled_jobs(rule_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run ON automations.scheduled_jobs(next_run_at) WHERE is_active = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION automations.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_rules_updated_at
  BEFORE UPDATE ON automations.rules
  FOR EACH ROW
  EXECUTE FUNCTION automations.update_updated_at_column();

CREATE TRIGGER update_scheduled_jobs_updated_at
  BEFORE UPDATE ON automations.scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION automations.update_updated_at_column();

-- Function to update rule statistics after execution
CREATE OR REPLACE FUNCTION automations.update_rule_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE automations.rules
  SET
    execution_count = execution_count + 1,
    success_count = CASE WHEN NEW.success THEN success_count + 1 ELSE success_count END,
    error_count = CASE WHEN NOT NEW.success THEN error_count + 1 ELSE error_count END,
    last_executed_at = NEW.completed_at
  WHERE id = NEW.rule_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when execution completes
CREATE TRIGGER update_rule_stats_on_execution
  AFTER INSERT ON automations.executions
  FOR EACH ROW
  EXECUTE FUNCTION automations.update_rule_stats();

-- RLS Policies for rules
ALTER TABLE automations.rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rules in their organization"
  ON automations.rules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage rules in their organization"
  ON automations.rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organizations uo
      JOIN role_permissions rp ON uo.role_id = rp.role_id
      WHERE uo.user_id = auth.uid()
        AND uo.organization_id = automations.rules.organization_id
        AND rp.permission = 'admin:automations:manage'
    )
  );

-- RLS Policies for executions
ALTER TABLE automations.executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view executions for rules in their organization"
  ON automations.executions FOR SELECT
  USING (
    rule_id IN (
      SELECT r.id FROM automations.rules r
      JOIN user_organizations uo ON r.organization_id = uo.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert executions"
  ON automations.executions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for scheduled jobs
ALTER TABLE automations.scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scheduled jobs for rules in their organization"
  ON automations.scheduled_jobs FOR SELECT
  USING (
    rule_id IN (
      SELECT r.id FROM automations.rules r
      JOIN user_organizations uo ON r.organization_id = uo.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage scheduled jobs in their organization"
  ON automations.scheduled_jobs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM automations.rules r
      JOIN user_organizations uo ON r.organization_id = uo.organization_id
      JOIN role_permissions rp ON uo.role_id = rp.role_id
      WHERE uo.user_id = auth.uid()
        AND r.id = automations.scheduled_jobs.rule_id
        AND rp.permission = 'admin:automations:manage'
    )
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA automations TO authenticated;
GRANT ALL ON automations.rules TO authenticated;
GRANT ALL ON automations.executions TO authenticated;
GRANT ALL ON automations.scheduled_jobs TO authenticated;

-- Comments for documentation
COMMENT ON TABLE automations.rules IS 'Automation rules that define triggers, conditions, and actions';
COMMENT ON TABLE automations.executions IS 'Execution history and results for automation rules';
COMMENT ON TABLE automations.scheduled_jobs IS 'Scheduled jobs for cron-based automation rules';
COMMENT ON COLUMN automations.rules.trigger_type IS 'Type of trigger: schedule, event, webhook, or manual';
COMMENT ON COLUMN automations.rules.trigger_config IS 'Configuration specific to the trigger type (e.g., cron expression, event name)';
COMMENT ON COLUMN automations.rules.conditions IS 'Array of conditions that must be met for actions to execute';
COMMENT ON COLUMN automations.rules.actions IS 'Array of actions to execute when conditions are met';
