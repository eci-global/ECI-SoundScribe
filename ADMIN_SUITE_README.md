# Admin Suite - Complete Multi-Page Dashboard

A comprehensive administrative interface built with React 18, TypeScript, and TailwindCSS, featuring real-time data updates and modern UI components.

## 🚀 Features

### **Core Architecture**
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **TailwindCSS** for utility-first styling
- **React Router 6** for client-side routing
- **SWR** for data fetching and caching
- **Supabase** for real-time database operations
- **Jest** with React Testing Library for comprehensive testing

### **Admin Dashboard Pages**
1. **Admin Home** (`/admin`) - Business KPI tiles and system overview
2. **Library Dashboard** (`/admin/library`) - Storage bucket management
3. **Recording Table** (`/admin/recordings`) - Real-time recording monitoring  
4. **File Manager** (`/admin/files`) - File upload, move, delete operations
5. **Storage Analytics** (`/admin/storage-analytics`) - Prometheus metrics integration
6. **Organization Overview** (`/admin/org`) - Okta organization stats
7. **User Management** (`/admin/org/users`) - SCIM user administration
8. **Access Control** (`/admin/access`) - Permission policies management
9. **Admin Tools** (`/admin/tools`) - System maintenance utilities
10. **Audit Log Viewer** (`/admin/audit`) - Real-time security event monitoring
11. **Target Rules** (`/admin/targeting`) - Automated targeting configuration
12. **Automation Builder** (`/admin/automations`) - Workflow management
13. **Integration Status** (`/admin/integrations`) - Health monitoring dashboard
14. **Privacy Settings** (`/admin/privacy`) - GDPR/CCPA compliance configuration
15. **System Activity** (`/admin/activity`) - Prometheus alerting dashboard

### **Key Performance Indicators (KPI Tiles)**
The Admin Home features four business-critical metrics:

1. **Instant Summaries Delivered**
   - Today + Last 7 days counts with trend analysis
   - Data source: `jobs` table where `status='done'`

2. **Rep Adoption Rate** 
   - Percentage of reps actively using the system
   - Calculated from `user_events` and Okta user counts
   - Status thresholds: ≥70% healthy, <40% critical

3. **Average Coaching Score Δ**
   - 30-day rolling delta in coaching effectiveness
   - Pre-computed from `kpi_scores` table

4. **Failure & Retry Monitor**
   - System reliability metrics from Prometheus
   - Status: >2% failure rate triggers critical alert

## 🛠 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase project (optional)
- Prometheus instance (optional)  
- Okta domain (optional)

### Environment Variables
Create a `.env` file with the following variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-supabase-anon-key

# Prometheus Configuration  
VITE_PROM_URL=http://localhost:9090

# Okta Configuration
VITE_OKTA_DOMAIN=your-okta-domain

# Optional: Additional integrations
VITE_OPENAI_API_KEY=your-openai-key
VITE_SENDGRID_API_KEY=your-sendgrid-key
```

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd echo-ai-scribe-app

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 🏗 Architecture Overview

### **Component Structure**
```
src/
├── components/
│   ├── MetricTile.tsx           # KPI display component
│   ├── Sparkline.tsx            # Mini chart visualization
│   ├── LicenseWidget.tsx        # Okta license information
│   ├── AuditLogTable.tsx        # Real-time audit events
│   ├── QueuePanel.tsx           # Worker queue monitoring
│   ├── IntegrationHeartbeat.tsx # Service health checks
│   └── QuickActions.tsx         # Admin shortcuts
├── hooks/
│   ├── useKpiMetrics.ts         # Business metrics fetching
│   ├── useSupabaseLive.ts       # Real-time data subscriptions
│   ├── usePrometheus.ts         # System metrics integration
│   └── useOkta.ts               # Organization/user data
├── pages/admin/
│   ├── AdminHome.tsx            # Main dashboard with KPIs
│   ├── LibraryDashboard.tsx     # Storage management
│   ├── RecordingTable.tsx       # Live recording monitoring
│   └── [12 other admin pages]
```

### **Data Integration Patterns**

#### **Real-time Updates**
Uses Supabase's real-time subscriptions for live data:
```typescript
const { data: logs } = useSupabaseLive<AuditLog>('audit_logs', {
  orderBy: { column: 'timestamp', ascending: false },
  limit: 100
});
```

#### **Metrics Collection**
Integrates with Prometheus for operational metrics:
```typescript
const { data: metrics } = usePrometheus({
  query: 'jobs_failed_total',
  interval: '5m',
  range: '24h'
});
```

#### **Organization Management**
Connects to Okta for user and license management:
```typescript
const { users, orgData } = useOkta();
```

## 🎨 Design System

### **Brand Colors**
- Primary Red: `#F5333F` (`brand-red`)
- Accent Lavender: `#E3DBFF` (`lavender`)  
- ECI Gray Scale: `#404040` to `#f8fafc`

### **Component Patterns**

## 🧭 Admin Architecture (New)

- Centralized admin routes and nav live in `src/admin/routes.tsx`:
  - `adminNav`: Sidebar items (icon, title, path)
  - `adminRouteMap` + `resolveAdminComponent()`: Path → component
- `src/components/admin/AdminLayout.tsx` renders the sidebar from `adminNav` and shows breadcrumbs; use this layout for admin pages.
- Shared shells for consistent UI:
  - `AdminTableShell`: standard header/actions/loading/empty for lists and tables
  - `AdminFormShell`: standard header/alerts/actions for forms
- Example pages using shells:
  - `src/components/admin/RecordingsTable.tsx` → AdminTableShell
  - `src/components/admin/UserCreator.tsx` → AdminFormShell
  - `src/pages/admin/UserManagement.tsx` (table area) → AdminTableShell
  - `src/pages/admin/LibraryDashboard.tsx` (overview section) → AdminTableShell
  - `src/pages/admin/AclSettings.tsx` (policies list) → AdminTableShell
  - `src/pages/admin/AdminTools.tsx` (categories) → AdminTableShell

## 🧪 Testing

- Unit: `src/tests/admin-routing.test.tsx` confirms `/admin/analytics` renders.
- E2E: `cypress/e2e/admin-smoke.cy.ts` visits key admin routes and asserts chrome.
- CI: `.github/workflows/admin-smoke.yml` runs build + Cypress smoke on pushes/PRs to `main`.
- **Cards**: `bg-white shadow-sm rounded-xl p-6`
- **Active Navigation**: `bg-lavender text-brand-red`
- **Status Indicators**: Color-coded badges (green/orange/red)
- **Loading States**: Skeleton loaders with pulse animation

### **Responsive Design**
- Sidebar collapses to icons below 1024px
- Grid layouts adapt from 4-column to stacked
- Touch-friendly button sizes on mobile

## 🧪 Testing Strategy

### **Test Coverage**
- **Component Tests**: All major UI components
- **Hook Tests**: Data fetching and state management
- **Integration Tests**: Real-time data flow
- **Accessibility Tests**: ARIA compliance

### **Running Tests**
```bash
# Run all tests
npm test

# Run tests in watch mode  
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### **Example Test**
```typescript
test('AdminHome renders four KPI tiles', async () => {
  render(<AdminHome />);
  
  await waitFor(() => {
    expect(screen.getByText('Instant Summaries Delivered')).toBeInTheDocument();
    expect(screen.getByText('Rep Adoption Rate')).toBeInTheDocument();
    expect(screen.getByText('Average Coaching Score Δ')).toBeInTheDocument();
    expect(screen.getByText('Failure & Retry Monitor')).toBeInTheDocument();
  });
});
```

## 📊 Data Sources & Integrations

### **Supabase Tables**
- `recordings` - Call recording metadata
- `audit_logs` - Security and user activity events  
- `access_policies` - Permission configuration
- `kpi_scores` - Pre-computed business metrics

### **Prometheus Metrics**
- `jobs_failed_total` - System failure rates
- `bucket_size_bytes` - Storage utilization
- `cpu_usage_percent` - Resource monitoring
- `alertmanager_alerts` - Active system alerts

### **Okta SCIM API**
- Organization information and license usage
- User management and group membership
- Single sign-on integration

### **Mock Data Fallbacks**
All integrations include comprehensive mock data for development:
- No external dependencies required for local development
- Realistic data patterns for UI testing
- Graceful degradation when services unavailable

## 🔐 Security & Compliance

### **Access Control**
- Role-based permission system
- Audit logging for all administrative actions
- Session management with automatic timeout

### **Privacy Features**
- GDPR compliance configuration
- Data retention policy management  
- Right to deletion support
- Automatic data anonymization options

### **Security Monitoring**
- Real-time audit event streaming
- Failed login attempt tracking
- Suspicious activity detection
- Integration health monitoring

## 🚀 Deployment

### **Build Configuration**
```bash
# Development build
npm run build:dev

# Production build  
npm run build

# Preview production build
npm run preview
```

### **Environment-Specific Settings**
- Development: Mock data endpoints active
- Staging: Partial integration testing
- Production: Full external service integration

## 📈 Performance Optimizations

### **Data Fetching**
- SWR caching reduces redundant API calls
- Real-time subscriptions for live updates only
- Configurable polling intervals (30s default)

### **UI Optimizations**  
- Lazy loading for secondary components
- Skeleton loading states prevent layout shifts
- Virtualized lists for large datasets

### **Bundle Optimization**
- Tree-shaking removes unused code
- Dynamic imports for route-based code splitting
- Optimized asset loading

## 🤝 Contributing

### **Development Guidelines**
1. Follow TypeScript strict mode
2. Use existing UI components from `@/components/ui`
3. Implement proper loading and error states
4. Add comprehensive tests for new features
5. Update documentation for API changes

### **Code Style**
- ESLint + Prettier for consistent formatting
- Conventional commits for change tracking
- Component-driven development approach

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [React Router Documentation](https://reactrouter.com/docs)
- [SWR Documentation](https://swr.vercel.app/docs)
- [Jest Testing Framework](https://jestjs.io/docs)

---

**Built with ❤️ for ECI Software Solutions**

For questions or support, please contact the development team or create an issue in the repository.
