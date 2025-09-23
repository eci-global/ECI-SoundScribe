// AI Agent Engine API Service
// Handles all communication with the AI Agent Engine backend

const API_BASE_URL = import.meta.env.VITE_AGENT_ENGINE_API_URL || 'http://localhost:3001';
const WS_URL = import.meta.env.VITE_AGENT_ENGINE_WS_URL || 'ws://localhost:3001';

export interface SystemStatus {
  running: boolean;
  startTime: string;
  uptime: number;
  agents: AgentStatus[];
  oversight: OversightStatus;
  providers: any;
  fileSystem: any;
}

export interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'thinking' | 'working' | 'paused' | 'error';
  currentTask?: string;
  tasksCompleted: number;
  tasksFailed: number;
  workingSince?: string;
  lastActivity: string;
  autonomyLevel: string;
  metrics: {
    tasksCompleted: number;
    tasksInProgress: number;
    tasksFailed: number;
    averageTaskTime: number;
    successRate: number;
    lastUpdated: string;
  };
}

export interface BoardData {
  agents: any[];
  tasks: Task[];
  tasksByStatus: {
    backlog: Task[];
    'in-progress': Task[];
    review: Task[];
    done: Task[];
  };
  statistics: BoardStatistics;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  agentName: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedDuration: number;
  progress: number;
  type: string;
}

export interface BoardStatistics {
  totalTasks: number;
  tasksInProgress: number;
  tasksCompleted: number;
  totalAgents: number;
  activeAgents: number;
  averageTaskTime: number;
  tasksPerHour: number;
}

export interface OversightStatus {
  killSwitchActive: boolean;
  requireApprovalForWrite: boolean;
  requireApprovalForExecution: boolean;
  suspendedAgents: string[];
  alerts: Alert[];
  statistics: {
    totalApprovals: number;
    pendingApprovals: number;
    deniedOperations: number;
    emergencyStops: number;
  };
}

export interface Alert {
  id: string;
  timestamp: string;
  level: 'low' | 'medium' | 'high' | 'critical';
  agentId?: string;
  type: string;
  message: string;
  resolved: boolean;
}

class AgentEngineAPI {
  private baseUrl: string;
  private wsConnection: WebSocket | null = null;
  private wsReconnectInterval: NodeJS.Timeout | null = null;
  private wsListeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // HTTP API Methods
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await fetch(`${this.baseUrl}/api/status`);
    if (!response.ok) throw new Error('Failed to fetch system status');
    return response.json();
  }

  async getAgents(): Promise<AgentStatus[]> {
    const response = await fetch(`${this.baseUrl}/api/agents`);
    if (!response.ok) throw new Error('Failed to fetch agents');
    return response.json();
  }

  async getBoardData(): Promise<BoardData> {
    const response = await fetch(`${this.baseUrl}/api/board/data`);
    if (!response.ok) throw new Error('Failed to fetch board data');
    return response.json();
  }

  async getTaskHistory(limit: number = 50): Promise<Task[]> {
    const response = await fetch(`${this.baseUrl}/api/tasks/history?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch task history');
    return response.json();
  }

  async getOversightStatus(): Promise<OversightStatus> {
    const response = await fetch(`${this.baseUrl}/api/oversight/status`);
    if (!response.ok) throw new Error('Failed to fetch oversight status');
    return response.json();
  }

  async assignTask(agentId: string, task: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!response.ok) throw new Error('Failed to assign task');
    return response.json();
  }

  async moveTask(taskId: string, status: string, agentId?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, agentId })
    });
    if (!response.ok) throw new Error('Failed to move task');
    return response.json();
  }

  async emergencyStop(reason: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/emergency/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!response.ok) throw new Error('Failed to trigger emergency stop');
    return response.json();
  }

  async resetEmergencyStop(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/emergency/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to reset emergency stop');
    return response.json();
  }

  // WebSocket Methods
  connectWebSocket(): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) return;

    try {
      this.wsConnection = new WebSocket(WS_URL);

      this.wsConnection.onopen = () => {
        console.log('Connected to AI Agent Engine WebSocket');
        if (this.wsReconnectInterval) {
          clearInterval(this.wsReconnectInterval);
          this.wsReconnectInterval = null;
        }
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.notifyListeners(message.type, message.data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('WebSocket connection closed');
        this.scheduleReconnect();
      };

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.wsReconnectInterval) return;

    this.wsReconnectInterval = setInterval(() => {
      console.log('Attempting to reconnect WebSocket...');
      this.connectWebSocket();
    }, 5000);
  }

  disconnectWebSocket(): void {
    if (this.wsReconnectInterval) {
      clearInterval(this.wsReconnectInterval);
      this.wsReconnectInterval = null;
    }
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // Event subscription
  on(event: string, callback: (data: any) => void): () => void {
    if (!this.wsListeners.has(event)) {
      this.wsListeners.set(event, new Set());
    }
    this.wsListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.wsListeners.get(event)?.delete(callback);
    };
  }

  private notifyListeners(event: string, data: any): void {
    this.wsListeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in WebSocket listener for ${event}:`, error);
      }
    });
  }

  // Utility method to check if API is available
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const agentEngineApi = new AgentEngineAPI();