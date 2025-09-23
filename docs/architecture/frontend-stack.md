# Frontend Stack Architecture

## React 18 with TypeScript

### Key Features Implementation
- **Concurrent Rendering**: Enables interruptible rendering for better UX
- **Automatic Batching**: Multiple state updates grouped into single re-render
- **Suspense for Data Fetching**: Integration with React Query for loading states
- **Strict Mode**: Enhanced development checks for better code quality

### TypeScript Integration
```typescript
// Component typing pattern
interface ComponentProps {
  user: {
    id: string;
    email: string;
    role: 'admin' | 'user';
  };
  onUpdate: (data: UpdateData) => Promise<void>;
}

const Component: React.FC<ComponentProps> = ({ user, onUpdate }) => {
  // Implementation
};
```

### Performance Optimizations
- Use `startTransition` for non-urgent updates
- Implement `useMemo` and `useCallback` for expensive calculations
- Leverage React 18's automatic batching for better performance

## Tailwind CSS + shadcn/ui

### Styling Philosophy
- **Utility-First**: Compose designs directly in markup
- **Copy-Paste Components**: No external dependencies, full customization
- **Design System**: Consistent spacing, colors, and typography

### Component Architecture
```typescript
// shadcn/ui component structure
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Custom component composition
const FeatureCard: React.FC<FeatureProps> = ({ title, description }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-600">{description}</p>
    </CardContent>
  </Card>
);
```

### Performance Benefits
- Bundle size under 10kB after purging
- No runtime CSS-in-JS overhead
- JIT compilation for optimal builds
- Automatic unused CSS removal

## Vite Build Tool

### Configuration Optimizations
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dropdown-menu', '@radix-ui/react-dialog']
        }
      }
    }
  }
});
```

### Development Features
- Hot Module Replacement (HMR)
- Fast development server startup
- Optimized dependency pre-bundling
- TypeScript support out-of-the-box

## Responsive Design Strategy

### Breakpoint System
```css
/* Tailwind breakpoints used in project */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X Extra large devices */
```

### Mobile-First Implementation
- Design for mobile first, enhance for larger screens
- Use responsive utility classes: `md:flex-row`, `lg:grid-cols-3`
- Implement touch-friendly interactions
- Optimize for various screen densities

## Accessibility Implementation

### ARIA Standards
- Semantic HTML elements as foundation
- ARIA labels and descriptions where needed
- Focus management for dynamic content
- Screen reader compatibility

### Keyboard Navigation
- Tab order management
- Escape key handling for modals
- Arrow key navigation for lists
- Enter/Space activation for interactive elements

## Code Organization

### File Structure
```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── admin/        # Admin-specific components
│   ├── profile/      # User profile components
│   └── integrations/ # Integration components
├── pages/            # Route components
├── hooks/            # Custom React hooks
├── lib/              # Utility libraries
├── types/            # TypeScript definitions
└── utils/            # Helper functions
```

### Import Conventions
```typescript
// Absolute imports using path mapping
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
```

## Development Best Practices

### Component Design
- Prefer composition over inheritance
- Keep components small and focused
- Use TypeScript interfaces for props
- Implement proper error boundaries

### Performance Guidelines
- Use React.memo for expensive components
- Implement code splitting for routes
- Optimize bundle size with tree shaking
- Minimize re-renders with proper deps arrays

### Testing Strategy
- Unit tests for utility functions
- Component tests with React Testing Library
- Integration tests for critical user flows
- E2E tests for complete workflows