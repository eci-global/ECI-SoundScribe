# State Management Architecture

## React Query (TanStack Query) - Server State

### Core Philosophy
React Query handles all server state, providing intelligent caching, background updates, and optimistic UI patterns. It eliminates the need to sync server data into client state managers.

### Implementation Patterns

#### Query Configuration
```typescript
// Global query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});
```

#### Data Fetching Hooks
```typescript
// Recording data fetching
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
  });
};

// Single recording with caching
export const useRecording = (id: string) => {
  return useQuery({
    queryKey: ['recording', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};
```

#### Mutations with Optimistic Updates
```typescript
// Recording upload with optimistic UI
export const useUploadRecording = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      // Upload logic
      const response = await uploadToSupabase(formData);
      return response;
    },
    onMutate: async (formData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['recordings'] });
      
      // Snapshot previous value
      const previousRecordings = queryClient.getQueryData(['recordings']);
      
      // Optimistically update
      queryClient.setQueryData(['recordings'], (old: any[]) => {
        return [
          {
            id: 'temp-' + Date.now(),
            title: formData.get('title'),
            status: 'uploading',
            created_at: new Date().toISOString(),
          },
          ...old,
        ];
      });
      
      return { previousRecordings };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousRecordings) {
        queryClient.setQueryData(['recordings'], context.previousRecordings);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['recordings'] });
    },
  });
};
```

### Real-time Integration
```typescript
// Real-time subscriptions with React Query
export const useRealtimeRecordings = () => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const subscription = supabase
      .channel('recordings-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'recordings' 
        },
        (payload) => {
          // Update cache based on change type
          queryClient.invalidateQueries({ queryKey: ['recordings'] });
        }
      )
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);
};
```

## Zustand - Client State Management

### Store Design Philosophy
Zustand manages local UI state, user preferences, and application state that doesn't come from the server. Each feature should have its own focused store.

### Implementation Patterns

#### Feature-Based Stores
```typescript
// UI State Store
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  currentModal: string | null;
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: 'light',
  currentModal: null,
  
  toggleSidebar: () => 
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    
  setTheme: (theme) => 
    set({ theme }),
    
  openModal: (modal) => 
    set({ currentModal: modal }),
    
  closeModal: () => 
    set({ currentModal: null }),
}));

// Recording Upload State
interface UploadState {
  uploadProgress: Record<string, number>;
  processingStatus: Record<string, 'pending' | 'processing' | 'completed' | 'error'>;
  setUploadProgress: (id: string, progress: number) => void;
  setProcessingStatus: (id: string, status: string) => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  uploadProgress: {},
  processingStatus: {},
  
  setUploadProgress: (id, progress) =>
    set((state) => ({
      uploadProgress: { ...state.uploadProgress, [id]: progress }
    })),
    
  setProcessingStatus: (id, status) =>
    set((state) => ({
      processingStatus: { ...state.processingStatus, [id]: status }
    })),
}));
```

#### Persistent State with Storage
```typescript
// User preferences with localStorage persistence
interface PreferencesState {
  autoSync: boolean;
  notificationsEnabled: boolean;
  defaultUploadSettings: UploadSettings;
  setAutoSync: (enabled: boolean) => void;
  setNotifications: (enabled: boolean) => void;
  updateUploadSettings: (settings: Partial<UploadSettings>) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      autoSync: true,
      notificationsEnabled: true,
      defaultUploadSettings: {
        quality: 'high',
        autoProcess: true,
        syncToOutreach: false,
      },
      
      setAutoSync: (enabled) => set({ autoSync: enabled }),
      setNotifications: (enabled) => set({ notificationsEnabled: enabled }),
      updateUploadSettings: (settings) =>
        set((state) => ({
          defaultUploadSettings: { ...state.defaultUploadSettings, ...settings }
        })),
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

#### Advanced Patterns - Selectors and Subscriptions
```typescript
// Selective subscriptions to prevent unnecessary re-renders
const Component = () => {
  // Only re-render when sidebarOpen changes
  const sidebarOpen = useUIStore(state => state.sidebarOpen);
  
  // Only re-render when upload progress for specific ID changes
  const progress = useUploadStore(state => state.uploadProgress['recording-123']);
  
  return (
    <div className={sidebarOpen ? 'with-sidebar' : 'full-width'}>
      <ProgressBar value={progress} />
    </div>
  );
};

// Computed values with selectors
const useUploadStats = () => {
  return useUploadStore(state => {
    const total = Object.keys(state.uploadProgress).length;
    const completed = Object.values(state.processingStatus)
      .filter(status => status === 'completed').length;
    
    return {
      total,
      completed,
      percentage: total > 0 ? (completed / total) * 100 : 0
    };
  });
};
```

## Integration Patterns

### Connecting Server and Client State
```typescript
// Component that uses both stores
const RecordingCard = ({ recordingId }: { recordingId: string }) => {
  // Server state from React Query
  const { data: recording, isLoading } = useRecording(recordingId);
  
  // Client state from Zustand
  const uploadProgress = useUploadStore(state => 
    state.uploadProgress[recordingId]
  );
  const processingStatus = useUploadStore(state => 
    state.processingStatus[recordingId]
  );
  
  // Handle sync between server and client state
  useEffect(() => {
    if (recording?.status === 'completed' && processingStatus !== 'completed') {
      useUploadStore.getState().setProcessingStatus(recordingId, 'completed');
    }
  }, [recording?.status, processingStatus, recordingId]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{recording?.title}</CardTitle>
        {uploadProgress && <ProgressBar value={uploadProgress} />}
      </CardHeader>
    </Card>
  );
};
```

### Form State Management
```typescript
// Temporary form state in Zustand
interface FormState {
  recordingForm: Partial<RecordingFormData>;
  updateRecordingForm: (data: Partial<RecordingFormData>) => void;
  resetRecordingForm: () => void;
}

export const useFormStore = create<FormState>((set) => ({
  recordingForm: {},
  
  updateRecordingForm: (data) =>
    set((state) => ({
      recordingForm: { ...state.recordingForm, ...data }
    })),
    
  resetRecordingForm: () =>
    set({ recordingForm: {} }),
}));

// Form component
const RecordingForm = () => {
  const { recordingForm, updateRecordingForm, resetRecordingForm } = useFormStore();
  const uploadMutation = useUploadRecording();
  
  const handleSubmit = async () => {
    try {
      await uploadMutation.mutateAsync(recordingForm);
      resetRecordingForm();
    } catch (error) {
      // Error handling
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={recordingForm.title || ''}
        onChange={(e) => updateRecordingForm({ title: e.target.value })}
      />
    </form>
  );
};
```

## Performance Optimization

### React Query Optimizations
- Use `staleTime` to reduce unnecessary refetches
- Implement proper `queryKey` structures for cache invalidation
- Use `select` option to transform data and prevent re-renders
- Implement infinite queries for large datasets

### Zustand Optimizations
- Create multiple small stores instead of one large store
- Use selectors to subscribe to specific state slices
- Implement middleware only when needed (persist, devtools)
- Use `shallow` comparison for object selections

## Error Handling

### Global Error Boundaries
```typescript
// Error boundary for React Query errors
const QueryErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div>
              <h2>Something went wrong:</h2>
              <pre>{error.message}</pre>
              <button onClick={resetErrorBoundary}>Try again</button>
            </div>
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};
```

### State Validation
```typescript
// Zustand store with validation
const useValidatedStore = create<State>((set, get) => ({
  // ... state
  
  updateValue: (value: unknown) => {
    // Validate before setting
    if (typeof value === 'string' && value.length > 0) {
      set({ validatedValue: value });
    } else {
      console.error('Invalid value provided');
    }
  },
}));
```

## Testing Strategies

### React Query Testing
```typescript
// Test utilities for React Query
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
};

// Test component with queries
test('renders recording data', async () => {
  const queryClient = createTestQueryClient();
  
  render(
    <QueryClientProvider client={queryClient}>
      <RecordingComponent />
    </QueryClientProvider>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Recording Title')).toBeInTheDocument();
  });
});
```

### Zustand Testing
```typescript
// Test Zustand stores
test('updates UI state correctly', () => {
  const { result } = renderHook(() => useUIStore());
  
  act(() => {
    result.current.toggleSidebar();
  });
  
  expect(result.current.sidebarOpen).toBe(false);
});
```