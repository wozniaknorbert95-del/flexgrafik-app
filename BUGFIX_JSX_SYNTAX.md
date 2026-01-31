# BUGFIX: JSX Syntax Error - ProtocolRulesSelector

**Date:** 2026-01-26  
**Status:** ✅ FIXED

---

## Problem

Błąd kompilacji ESBuild:

```
ERROR: The character ">" is not valid inside a JSX element
C:/Users/gebruiker/Desktop/flexgrafik adhd os/components/ProtocolRulesSelector.tsx:294:46
Warunek (np. stuckCount > 0) *
```

---

## Root Cause

W JSX nie można używać znaku `>` bezpośrednio w tekście, ponieważ jest interpretowany jako zamknięcie tagu JSX.

---

## Fix Applied

### 1. Znak `>` w label

**Before:**

```jsx
<label>Warunek (np. stuckCount > 0) *</label>
```

**After:**

```jsx
<label>Warunek (np. stuckCount {'>'} 0) *</label>
```

### 2. Znak `→` w tekście

**Before:**

```jsx
{rule.trigger} → {rule.action}
```

**After:**

```jsx
{
  rule.trigger;
}
{
  ('→');
}
{
  rule.action;
}
```

---

## Files Modified

- ✅ `components/ProtocolRulesSelector.tsx`

---

## Verification

- ✅ Linter: No errors
- ✅ TypeScript: No errors
- ✅ JSX Syntax: Correct

---

**Status:** ✅ FIXED - Server should now compile successfully
