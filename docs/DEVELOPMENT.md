# Development Guide

## Quick Start for New Developers

### Prerequisites
- Node.js 18+ with npm
- Git for version control
- VS Code (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint

### Local Development Setup
```bash
# 1. Clone and setup
git clone <repository-url>
cd echo-ai-scribe-app
npm install

# 2. Environment configuration
cp .env.example .env.local
# Configure your API keys and endpoints

# 3. Start Supabase locally (optional)
npx supabase start

# 4. Apply database schema
npx supabase db push

# 5. Start development server
npm run dev
```

### Environment Variables Setup
```env
# Required for local development
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Integration
VITE_AZURE_OPENAI_ENDPOINT=your_azure_endpoint
VITE_AZURE_OPENAI_API_KEY=your_api_key
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment

# Outreach Integration
VITE_OUTREACH_CLIENT_ID=your_outreach_client_id
VITE_OUTREACH_CLIENT_SECRET=your_outreach_client_secret
OUTREACH_WEBHOOK_SECRET=your_webhook_secret

# Optional - Token encryption
TOKEN_ENCRYPTION_KEY=your_32_character_encryption_key
```

## Architecture Overview

### Technology Stack
```
Frontend: React 18 + TypeScript + Tailwind CSS + shadcn/ui
State: React Query (server) + Zustand (client)
Backend: Supabase (PostgreSQL + Edge Functions + Real-time)
AI: Azure OpenAI (Whisper + GPT-4)
Integration: Outreach.io API v2
```

### Project Structure
```
echo-ai-scribe-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui base components
│   │   ├── admin/          # Admin-specific components
│   │   ├── profile/        # User profile components
│   │   └── integrations/   # Integration UI components
│   ├── pages/              # Route components
│   │   ├── admin/          # Admin dashboard pages
│   │   ├── integrations/   # Integration setup pages
│   │   └── help/           # Documentation pages
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   │   └── outreach/       # Outreach API client
│   ├── types/              # TypeScript definitions
│   └── utils/              # Helper functions
├── supabase/
│   ├── functions/          # Edge Functions
│   │   ├── process-recording/       # AI processing
│   │   ├── sync-to-outreach/        # Individual sync
│   │   ├── discover-organization-users/  # Auto-discovery
│   │   └── sync-organization-calls/      # Bulk sync
│   ├── migrations/         # Database schema changes
│   └── config.toml         # Supabase configuration
├── docs/
│   └── architecture/       # Detailed architecture docs
├── CLAUDE.md              # AI assistant knowledge base
└── DEVELOPMENT.md         # This file
```

## Development Workflow

### Daily Development
```bash
# Start development environment
npm run dev                 # Frontend development server
npx supabase start         # Local Supabase (if needed)
npx supabase functions serve  # Local edge functions

# Code quality checks
npm run lint               # ESLint checks
npm run type-check         # TypeScript validation
npm run format             # Prettier formatting

# Database operations
npx supabase db push       # Apply schema changes
npx supabase db reset      # Reset local database
npx supabase migration new <name>  # Create new migration
```

### Testing Strategy
```bash
# Unit tests
npm run test               # Run all tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report

# Integration tests
npm run test:integration   # Test API integrations
npm run test:e2e           # End-to-end tests with Playwright

# Edge function testing
npx supabase functions serve  # Start local functions
curl http://localhost:54321/functions/v1/process-recording
```

## Common Development Tasks

### Adding a New Component
1. Create component in appropriate directory:
   ```typescript
   // src/components/feature/NewComponent.tsx
   import React from 'react';
   import { Button } from '@/components/ui/button';
   
   interface NewComponentProps {
     title: string;
     onAction: () => void;
   }
   
   export default function NewComponent({ title, onAction }: NewComponentProps) {
     return (
       <div className="p-4 border rounded-lg">
         <h3 className="text-lg font-semibold">{title}</h3>
         <Button onClick={onAction}>Take Action</Button>
       </div>
     );
   }
   ```

2. Add to appropriate page or parent component
3. Add tests if complex logic involved

### Creating a New Page
1. Create page component in `src/pages/`
2. Add route to `src/App.tsx`:
   ```typescript
   <Route path="/new-page" element={<NewPage />} />
   ```
3. Update navigation if needed

### Adding Database Tables
1. Create migration:
   ```bash
   npx supabase migration new add_new_table
   ```

2. Write SQL migration:
   ```sql
   -- supabase/migrations/xxxx_add_new_table.sql
   CREATE TABLE new_table (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Enable RLS
   ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
   
   -- Add policies
   CREATE POLICY "Users can view own records" ON new_table
   FOR SELECT USING (auth.uid() = user_id);
   ```

3. Apply migration:
   ```bash
   npx supabase db push
   ```

### Creating Edge Functions
1. Create function directory:
   ```bash
   npx supabase functions new my-function
   ```

2. Implement function:
   ```typescript
   // supabase/functions/my-function/index.ts
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
   
   serve(async (req) => {
     const { name } = await req.json();
     
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL') ?? '',
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
     );
     
     // Function logic here
     
     return new Response(
       JSON.stringify({ message: `Hello ${name}!` }),
       { headers: { 'Content-Type': 'application/json' } }
     );
   });
   ```

3. Add to config.toml:
   ```toml
   [functions.my-function]
   verify_jwt = false
   ```

4. Deploy:
   ```bash
   npx supabase functions deploy my-function
   ```

### Working with React Query
```typescript
// Data fetching hook
export const useRecordings = () => {
  return useQuery({
    queryKey: ['recordings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Mutation hook
export const useUploadRecording = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      // Upload logic
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
    },
  });
};
```

### Using Zustand for Client State
```typescript
// Store definition
interface UIState {
  sidebarOpen: boolean;
  currentModal: string | null;
  toggleSidebar: () => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  currentModal: null,
  
  toggleSidebar: () => 
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    
  openModal: (modal) => 
    set({ currentModal: modal }),
    
  closeModal: () => 
    set({ currentModal: null }),
}));

// Usage in component
const Component = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  
  return (
    <button onClick={toggleSidebar}>
      {sidebarOpen ? 'Close' : 'Open'} Sidebar
    </button>
  );
};
```

## Debugging and Troubleshooting

### Common Issues and Solutions

#### 1. RLS Policy Errors
**Error**: `new row violates row-level security policy`
**Solution**: Check that RLS policies allow the operation:
```sql
-- Debug RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Test policy logic
SELECT auth.uid(); -- Should return user ID
SELECT * FROM your_table; -- Should return user's data
```

#### 2. Real-time Subscription Issues
**Error**: Real-time updates not working
**Solution**: Verify subscription setup:
```typescript
// Check channel subscription
useEffect(() => {
  const channel = supabase
    .channel('test-channel')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'recordings' },
      (payload) => console.log('Change received!', payload)
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
    });
    
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

#### 3. Token Refresh Issues
**Error**: `401 Unauthorized` from Outreach API
**Solution**: Check token refresh logic:
```typescript
// Debug token expiration
const connection = await getOutreachConnection(id);
console.log('Token expires:', connection.token_expires_at);
console.log('Current time:', new Date().toISOString());

// Force token refresh
await OutreachTokenManager.getInstance().refreshToken(connection);
```

#### 4. Edge Function Errors
**Error**: Edge function timeouts or errors
**Solution**: Check function logs:
```bash
# View function logs
npx supabase functions logs process-recording

# Test function locally
npx supabase functions serve
curl -X POST http://localhost:54321/functions/v1/process-recording \
  -H "Content-Type: application/json" \
  -d '{"recordingId": "test-id"}'
```

### Performance Debugging

#### React Query DevTools
```typescript
// Add to App.tsx for development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

#### Zustand DevTools
```typescript
// Enable Redux DevTools for Zustand
import { devtools } from 'zustand/middleware';

export const useStore = create<State>()(
  devtools(
    (set) => ({
      // Your store
    }),
    {
      name: 'app-store', // Store name in DevTools
    }
  )
);
```

#### Database Query Performance
```sql
-- Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Explain query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM recordings 
WHERE user_id = 'user-id' 
ORDER BY created_at DESC;
```

## Code Style and Best Practices

### TypeScript Guidelines
- Always use explicit types for function parameters and return values
- Prefer interfaces over types for object shapes
- Use strict mode configuration
- Avoid `any` type; use `unknown` when type is uncertain

### React Best Practices
- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for expensive components
- Keep components small and focused (< 100 lines)

### CSS/Styling Guidelines
- Use Tailwind utility classes for styling
- Follow mobile-first responsive design
- Use shadcn/ui components as base, customize with Tailwind
- Avoid custom CSS files; use utility classes

### Database Best Practices
- Always enable RLS on new tables
- Use proper indexing for query performance
- Follow naming conventions: snake_case for columns
- Write migrations that can be rolled back

## Deployment and Production

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] ESLint warnings resolved
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Security review completed

### Production Deployment
```bash
# Build for production
npm run build

# Deploy edge functions
npx supabase functions deploy

# Apply database migrations
npx supabase db push --linked

# Verify deployment
npm run test:production
```

### Monitoring and Alerts
- Monitor Supabase dashboard for performance
- Set up alerts for edge function errors
- Track API rate limits (Outreach, Azure OpenAI)
- Monitor real-time connection health

## Team Collaboration

### Git Workflow
```bash
# Feature development
git checkout -b feature/new-feature
git commit -m "feat: add new feature"
git push origin feature/new-feature
# Create PR for review

# Bug fixes
git checkout -b fix/bug-description
git commit -m "fix: resolve issue with component"

# Database changes
git checkout -b db/add-new-table
git commit -m "db: add new table for feature"
```

### Code Review Guidelines
- Review for security issues (RLS policies, input validation)
- Check TypeScript types and error handling
- Verify performance implications
- Ensure accessibility standards
- Test integration points

### Documentation Updates
- Update CLAUDE.md for architectural changes
- Add inline comments for complex logic
- Update API documentation for new endpoints
- Document breaking changes in migration notes

## Getting Help

### Internal Resources
- Check CLAUDE.md for architecture context
- Review docs/architecture/ for detailed guides
- Look at existing similar implementations
- Check git history for context on changes

### External Resources
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Outreach API Documentation](https://api.outreach.io/api/v2/docs)
- [Azure OpenAI Documentation](https://docs.microsoft.com/en-us/azure/cognitive-services/openai/)

### Community Support
- Supabase Discord community
- React community forums
- Stack Overflow for specific technical issues
- GitHub issues for library-specific problems