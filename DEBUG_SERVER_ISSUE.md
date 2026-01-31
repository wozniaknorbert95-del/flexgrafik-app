# DEBUG: Server Connection Issue

**Date:** 2026-01-26  
**Status:** 🔍 Investigating

---

## Problem

Aplikacja nie działa - "localhost odmówiono nawiązania połączenia"

- Serwer dev nie odpowiada
- Aplikacja nie wyświetla się w przeglądarce

---

## Fixes Applied

### 1. TimeWindowSelector - Unused Imports ✅

- ✅ Removed unused imports: `formatTime`, `parseTimeToDate`
- ✅ Kept only `isTimeInWindow` which is actually used

### 2. ProtocolRulesSelector - Default Time Value ✅

- ✅ Fixed default time value: `'09:00'` instead of `''`
- ✅ Fixed validation for time input

---

## Verification Checklist

- ✅ All components properly exported
- ✅ All imports correct
- ✅ No unused imports
- ✅ No linter errors
- ✅ No TypeScript errors

---

## Next Steps

1. **Restart dev server:**

   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Check terminal output** for compilation errors

3. **Clear Vite cache** if needed:

   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

4. **Check port 3000** - Vite should be running on port 3000 (not 5173)

---

## Files Modified

- ✅ `components/TimeWindowSelector.tsx` - Removed unused imports
- ✅ `components/ProtocolRulesSelector.tsx` - Fixed default time value

---

**Status:** ✅ Code fixes applied - Restart server to test
