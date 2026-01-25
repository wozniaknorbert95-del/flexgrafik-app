# 🏗️ FlexGrafik ADHD OS - Architecture Overview

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [State Management System](#state-management-system)
- [Component Architecture](#component-architecture)
- [Custom Hooks](#custom-hooks)
- [Performance Patterns](#performance-patterns)
- [Testing Strategy](#testing-strategy)
- [Migration Guide](#migration-guide)

## Architecture Overview

FlexGrafik ADHD OS is built with modern React patterns, emphasizing:

- **Atomic Design** for component composition
- **Focused Contexts** for state management
- **Custom Hooks** for reusable logic
- **TypeScript** for type safety
- **Performance Optimization** for scalability

## State Management System

### Context Architecture

The application uses a **focused context pattern** instead of a monolithic context:

```
contexts/
├── AppProvider.tsx      # Composite provider
├── AuthContext.tsx      # User authentication & profile
├── UIContext.tsx        # Navigation, modals, notifications
├── DataContext.tsx      # Application data with normalization
└── README.md           # Context documentation
```

### Key Principles

1. **Single Responsibility**: Each context manages one domain
2. **Composition over Inheritance**: Contexts compose together
3. **Type Safety**: Full TypeScript coverage
4. **Performance**: Focused re-renders and memoization

### Usage Pattern

```tsx
// In index.tsx
import { AppProvider } from '@/contexts';

<AppProvider>
  <App />
</AppProvider>;

// In components
import { useAuth, useUI, useData } from '@/contexts';

const { user, login } = useAuth();
const { navigate, addNotification } = useUI();
const { updateTask, getAllTasks } = useData();
```

## Component Architecture

### Atomic Design Pattern

Components are organized following **Atomic Design** principles:

```
components/
├── atoms/              # Basic UI elements
│   ├── Button.tsx      # Buttons with variants
│   ├── Input.tsx       # Form inputs with validation
│   ├── Icon.tsx        # Icons with animations
│   ├── ProgressBar.tsx # Progress indicators
│   └── Badge.tsx       # Status badges
├── molecules/          # Combined atoms
│   ├── SearchBox.tsx   # Search with debouncing
│   ├── FormField.tsx   # Form fields with validation
│   ├── TaskCard.tsx    # Task display components
│   └── Modal.tsx       # Compound modal component
├── organisms/          # Complex UI sections
│   ├── Header.tsx      # Navigation header
│   ├── Dashboard.tsx   # Dashboard layout
│   └── TaskList.tsx    # Task management
└── templates/          # Page layouts
    └── PageLayout.tsx  # Page structure templates
```

### Component Patterns

#### Compound Components

```tsx
// Modal with sub-components
<Modal isOpen={isOpen} onClose={onClose}>
  <Modal.Header title="Confirm Action" />
  <Modal.Body>Are you sure?</Modal.Body>
  <Modal.Footer>
    <Modal.CancelButton>Cancel</Modal.CancelButton>
    <Modal.ConfirmButton onClick={confirm}>Confirm</Modal.ConfirmButton>
  </Modal.Footer>
</Modal>
```

#### Render Props Pattern

```tsx
// Flexible data display
<DataProvider>
  {({ data, loading, error }) =>
    loading ? <Skeleton /> : error ? <ErrorMessage /> : <DataDisplay data={data} />
  }
</DataProvider>
```

## Custom Hooks

### Available Hooks

#### State Management Hooks

```tsx
// Authentication
const { user, login, logout, isAuthenticated } = useAuth();

// UI State
const { navigate, addNotification, openModal } = useUI();

// Data Operations
const { updateTask, getAllTasks, taskCount } = useData();
```

#### Form Management

```tsx
const { values, errors, handleSubmit, getFieldProps } = useForm({
  initialValues: { email: '', password: '' },
  validationSchema: {
    email: formValidators.email(),
    password: formValidators.minLength(8),
  },
  onSubmit: handleSubmit,
});
```

#### Data Fetching

```tsx
// Query with caching
const { data, loading, refetch } = useAPIQuery('/api/tasks', {
  cacheTime: 5 * 60 * 1000,
  refetchOnWindowFocus: true,
});

// Mutation
const { mutate, loading } = useAPIMutation('/api/tasks', 'POST');
```

#### Persistent State

```tsx
// Local storage with cross-tab sync
const [userPrefs, setUserPrefs] = useLocalStorage('prefs', {
  defaultValue: { theme: 'dark' },
  syncTabs: true,
});

// Key-value store
const [store, { get, set }] = useLocalStorageStore('app_data');
```

#### Performance Optimization

```tsx
// Debounced search
const { query, debouncedQuery, isSearching } = useDebouncedSearch();

// Debounced callback
const debouncedFn = useDebouncedCallback(callback, 300);

// Debounced state
const [value, setValue, debouncedValue] = useDebouncedState('', 500);
```

### Hook Categories

| Category        | Hooks                                     | Purpose                      |
| --------------- | ----------------------------------------- | ---------------------------- |
| **State**       | `useAuth`, `useUI`, `useData`             | Application state management |
| **Forms**       | `useForm`                                 | Form state and validation    |
| **API**         | `useAPIQuery`, `useAPIMutation`           | Data fetching and mutations  |
| **Storage**     | `useLocalStorage`, `useLocalStorageStore` | Persistent state             |
| **Performance** | `useDebounce`, `useDebouncedCallback`     | Performance optimization     |
| **UI**          | Custom UI hooks                           | Component-specific logic     |

## Performance Patterns

### Optimization Techniques

#### 1. Context Optimization

- **Focused contexts** prevent unnecessary re-renders
- **Selector pattern** for computed values
- **Memoization** of expensive operations

#### 2. Data Management

- **Normalization** for O(1) lookups
- **Caching** with TTL for API responses
- **Optimistic updates** for immediate UI feedback

#### 3. Component Optimization

- **React.memo** for expensive components
- **useMemo** for computed values
- **useCallback** for event handlers

#### 4. Bundle Optimization

- **Dynamic imports** for code splitting
- **Lazy loading** of heavy components
- **Tree shaking** of unused code

### Performance Monitoring

```tsx
// Performance tracking
import { useEffect } from 'react';

const usePerformanceTracking = (componentName: string) => {
  useEffect(() => {
    const start = performance.now();

    return () => {
      const end = performance.now();
      console.log(`${componentName} render time: ${end - start}ms`);
    };
  });
};
```

## Testing Strategy

### Testing Pyramid

```
┌─────────────────┐
│  E2E Tests      │  (User journeys)
├─────────────────┤
│  Integration    │  (Context + Components)
├─────────────────┤
│  Unit Tests     │  (Hooks, Utils, Components)
└─────────────────┘
```

### Testing Patterns

#### Context Testing

```tsx
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '@/contexts';

test('auth flow', () => {
  render(
    <AuthProvider>
      <AuthComponent />
    </AuthProvider>
  );

  // Test authentication flow
});
```

#### Hook Testing

```tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useLocalStorage } from '@/hooks';

test('localStorage hook', () => {
  const { result } = renderHook(() => useLocalStorage('test', { defaultValue: 'default' }));

  act(() => {
    result.current[1]('updated');
  });

  expect(result.current[0]).toBe('updated');
});
```

#### Component Testing

```tsx
import { render, fireEvent } from '@testing-library/react';
import { Button } from '@/components';

test('button click', () => {
  const handleClick = jest.fn();
  const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>);

  fireEvent.click(getByRole('button'));
  expect(handleClick).toHaveBeenCalled();
});
```

### Test Categories

| Test Type       | Tools                       | Coverage              |
| --------------- | --------------------------- | --------------------- |
| **Unit**        | Jest, React Testing Library | Hooks, utils, atoms   |
| **Integration** | React Testing Library       | Component composition |
| **E2E**         | Playwright/Cypress          | User workflows        |
| **Performance** | Lighthouse, React DevTools  | Performance metrics   |

## Migration Guide

### From Monolithic Context

#### Step 1: Update Providers

```tsx
// Before
import { AppProvider } from './contexts/AppContext';

// After
import { AppProvider } from './contexts/AppProvider';
```

#### Step 2: Update Hook Usage

```tsx
// Before
const { data, currentView, handleToggleTask } = useAppContext();

// After
const { user } = useAuth();
const { currentView, navigate } = useUI();
const { updateTask } = useData();
```

#### Step 3: Update Event Handlers

```tsx
// Before
const handleTaskUpdate = () => {
  handleToggleTask(taskId);
};

// After
const handleTaskUpdate = async () => {
  try {
    await updateTask(taskId.toString(), { progress: 100 });
    addNotification({ type: 'success', message: 'Task updated' });
  } catch (error) {
    addNotification({ type: 'error', message: 'Update failed' });
  }
};
```

### Benefits of Migration

- **Performance**: Focused re-renders and optimized updates
- **Maintainability**: Clear separation of concerns
- **Scalability**: Easy to add new contexts and features
- **Developer Experience**: Better TypeScript support and IntelliSense
- **Testing**: Easier to test isolated pieces
- **Error Handling**: Comprehensive error boundaries and recovery

## Development Workflow

### Code Organization

```
src/
├── components/         # Atomic Design components
├── contexts/          # State management contexts
├── hooks/            # Custom hooks
├── types/            # TypeScript definitions
├── utils/            # Utility functions
└── services/         # External service integrations
```

### Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Type checking
npm run type-check

# Lint code
npm run lint
```

### Code Quality

- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type checking
- **Jest** for testing
- **Husky** for git hooks

## Production Considerations

### Performance

- **Bundle analysis** with `webpack-bundle-analyzer`
- **Code splitting** for route-based loading
- **Image optimization** and lazy loading
- **Service worker** for caching

### Monitoring

- **Error tracking** with Sentry
- **Performance monitoring** with analytics
- **User feedback** collection
- **A/B testing** framework

### Security

- **Content Security Policy** (CSP)
- **Input sanitization** and validation
- **Secure headers** and HTTPS
- **Authentication** and authorization

## Future Enhancements

### Planned Features

- [ ] **Offline support** with service workers
- [ ] **Real-time collaboration** with WebSockets
- [ ] **Advanced analytics** and insights
- [ ] **Mobile app** with React Native
- [ ] **Plugin system** for extensibility

### Architecture Improvements

- [ ] **GraphQL integration** for efficient data fetching
- [ ] **Redux Toolkit** migration for complex state
- [ ] **Micro-frontend** architecture for scalability
- [ ] **Internationalization** (i18n) support

---

## Quick Start

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Start development**: `npm run dev`
4. **Run tests**: `npm test`
5. **Build for production**: `npm run build`

## Contributing

1. Follow the **Atomic Design** principles
2. Use **TypeScript** for all new code
3. Write **tests** for new features
4. Follow the **commit message conventions**
5. Use **pull requests** for code review

## Support

- **Documentation**: Check the README files in each directory
- **Examples**: See `/components/examples/` for usage patterns
- **Issues**: Use GitHub issues for bug reports
- **Discussions**: Use GitHub discussions for questions

---

**Built with ❤️ using React, TypeScript, and modern web technologies.**

_Last updated: January 2026_
