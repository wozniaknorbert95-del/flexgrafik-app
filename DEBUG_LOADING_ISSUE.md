# DEBUG: Application Loading Issue

**Problem:** Aplikacja się nie wczytuje

**Possible Causes:**

1. Import errors
2. Type errors
3. Runtime errors
4. Missing dependencies
5. Circular dependencies

**Checklist:**

## 1. Browser Console Errors

- [ ] Open browser DevTools (F12)
- [ ] Check Console tab for errors
- [ ] Check Network tab for failed requests
- [ ] Check if any files fail to load (404 errors)

## 2. Common Issues

### Import Errors

- Check if all imports are correct
- Verify file paths are correct
- Check if all exported functions/types exist

### Type Errors

- Check TypeScript compilation
- Verify all types are imported correctly
- Check for missing type definitions

### Runtime Errors

- Check for undefined variables
- Check for null pointer exceptions
- Check for missing function calls

## 3. Files to Check

### Critical Files

- `index.tsx` - Entry point
- `App.tsx` - Main app component
- `contexts/AppContext.tsx` - Context provider
- `components/RouteManager.tsx` - Routing

### Recently Modified Files

- `contexts/AppContext.tsx` - Added declaration updates
- `utils/goalAgentService.ts` - Agent service
- `utils/scheduler.ts` - Agent scheduler
- `components/EveningProtocolPremium.tsx` - Protocol component

## 4. Quick Fixes to Try

### Fix 1: Check Dependencies

```bash
npm install
```

### Fix 2: Clear Cache

- Clear browser cache
- Clear localStorage
- Clear IndexedDB

### Fix 3: Check Console

- Look for specific error messages
- Check stack traces
- Verify which file is failing

### Fix 4: Verify Imports

- Check if `scheduleGoalAgentChecks` is exported correctly
- Check if `setData` is available in App.tsx
- Verify all type imports

## 5. Debug Steps

1. **Check Browser Console**
   - Open DevTools (F12)
   - Look for red error messages
   - Copy error message and stack trace

2. **Check Network Tab**
   - Look for failed file loads
   - Check if all JS files load correctly
   - Verify no 404 errors

3. **Check Application Tab**
   - Check IndexedDB
   - Check localStorage
   - Verify data structure

4. **Check Source Tab**
   - Set breakpoints in critical files
   - Step through code execution
   - Find where it fails

## 6. Common Error Patterns

### "Cannot read property X of undefined"

- Check if object exists before accessing
- Add null checks

### "X is not defined"

- Check imports
- Verify variable names

### "Module not found"

- Check file paths
- Verify exports

### "Type error"

- Check TypeScript types
- Verify type definitions

## 7. Quick Test

Try commenting out recent changes:

1. Comment out `scheduleGoalAgentChecks` call in App.tsx
2. Comment out declaration updates in AppContext.tsx
3. See if app loads
4. Uncomment one by one to find issue

## 8. Next Steps

Once you identify the error:

1. Note the exact error message
2. Note which file is failing
3. Note the line number
4. Share with developer for fix
