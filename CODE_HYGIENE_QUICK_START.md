# CODE HYGIENE - Quick Start Guide

**For immediate execution of critical fixes**

---

## 🚨 CRITICAL FIXES (Do First)

### 1. Replace Unsafe Eval (5 minutes)

**File:** `utils/errorHandler.ts` line 100

**Current:**

```typescript
const safeEval = new Function(...) // UNSAFE!
```

**Fix:** Replace with declarative rule system or safe parser

**Priority:** 🔴 CRITICAL SECURITY

---

### 2. Replace alert() with Toast (10 minutes)

**File:** `utils/errorHandler.ts` line 49

**Current:**

```typescript
alert(userMessage); // Bad UX
```

**Fix:** Use toast service

**Priority:** 🔴 CRITICAL UX

---

### 3. Create Type Guards (30 minutes)

**File:** `utils/typeGuards.ts` (NEW)

**Why:** Foundation for eliminating all `any` types

**Priority:** 🟡 HIGH

---

## 📋 QUICK WINS (1-2 hours each)

### 4. Replace console.log in NotificationCenter (15 minutes)

- Replace with toast.info()

### 5. Replace console.log in App.tsx (20 minutes)

- Replace with toast.success/error/info

### 6. Fix RouteManager types (10 minutes)

- Replace `any` with proper types

### 7. Fix DeclarationsDisplay types (10 minutes)

- Replace `any[]` with `EveningProtocol[]`
- Replace `any` with `FinishSession | null`

---

## 🎯 RECOMMENDED STARTING POINT

**Start with:** Task 1 (Unsafe Eval) - **5 minutes, critical security fix**

**Then:** Task 2 (alert → toast) - **10 minutes, better UX**

**Then:** Task 3 (Type Guards) - **30 minutes, foundation for everything else**

**Total:** ~45 minutes for 3 critical fixes

---

**After quick wins, proceed with full plan in CODE_ARCHITECTURE_HYGIENE_PLAN.md**
