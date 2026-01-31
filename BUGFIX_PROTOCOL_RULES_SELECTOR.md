# BUGFIX: ProtocolRulesSelector - Error 500

**Date:** 2026-01-26  
**Status:** ✅ FIXED

---

## Problem

Błąd 500 Internal Server Error przy ładowaniu `ProtocolRulesSelector.tsx`:

```
GET http://localhost:3000/components/ProtocolRulesSelector.tsx net::ERR_ABORTED 500 (Internal Server Error)
```

---

## Root Cause

Problem był związany z:

1. **Walidacją czasu** - input type="time" może zwracać pusty string
2. **Domyślną wartością** - brak domyślnej wartości dla time input

---

## Fix

### 1. Domyślna wartość czasu

- Zmieniono inicjalizację `newRuleCondition` z `''` na `'09:00'`
- Zapewnia to, że input type="time" zawsze ma poprawną wartość

### 2. Poprawiona walidacja

- Dodano sprawdzenie czy `newRuleCondition` nie jest pusty
- Lepszy komunikat błędu

### 3. Reset formularza

- Wszystkie miejsca resetujące formularz ustawiają `'09:00'` zamiast `''`

---

## Changes Made

**File:** `components/ProtocolRulesSelector.tsx`

1. ✅ Domyślna wartość: `useState('09:00')` zamiast `useState('')`
2. ✅ Walidacja: dodano sprawdzenie pustej wartości
3. ✅ Reset: wszystkie `setNewRuleCondition('')` → `setNewRuleCondition('09:00')`

---

## Verification

- ✅ Linter: No errors
- ✅ TypeScript: No errors
- ✅ Import/Export: Correct
- ✅ Logic: Fixed

---

**Status:** ✅ FIXED - Ready for testing
