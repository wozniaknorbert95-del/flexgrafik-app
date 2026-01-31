# 🔍 DIAGNOZA PROBLEMÓW - Co powinno być widoczne

**Data:** 2026-01-26  
**Status:** ❌ ZNALEZIONE PROBLEMY

---

## ❌ PROBLEMY ZNALEZIONE

### 1. Timer NIE został usunięty ❌

**Lokalizacja:** `components/Navigation.tsx`

- Linia 14: `Timer` importowany
- Linia 106: `{ id: 'timer' as ViewState, label: 'Timer', icon: Timer }` - nadal w menu
- Linia 175: Timer w "więcej" menu

**Powinno być:** Timer całkowicie usunięty z Navigation

---

### 2. Evening Protocol NIE ma przycisku w Dashboard ❌

**Lokalizacja:** `components/DashboardPremium.tsx`

- **Brakuje:** Przycisk "🌙 Evening Protocol" w headerze Dashboard
- **Powinno być:** Przycisk obok "🏁 Finish Mode" w headerze

**Obecny stan:**

- Jest tylko przycisk "🏁 Finish Mode" (linia 288-290, 607-614)
- Brak przycisku Evening Protocol

---

### 3. Sekcja "Na czym dziś się skupić" NIE została usunięta ❌

**Lokalizacja:** `components/DashboardPremium.tsx`

- Linia 227: `Na czym dziś się skupić, żeby realnie domknąć rzeczy?` - nadal w headerze
- Linia 580-635: Sekcja z przyciskiem Finish Mode i listą zadań - nadal istnieje

**Powinno być:**

- Usunięta sekcja "Na czym dziś się skupić"
- Zastąpiona przez `DeclarationsDisplay` (który jest dodany w linii 638, ale stara sekcja nadal istnieje)

---

### 4. DeclarationsDisplay jest dodany, ale stara sekcja też istnieje ⚠️

**Lokalizacja:** `components/DashboardPremium.tsx`

- Linia 638: `DeclarationsDisplay` jest dodany ✅
- Linia 580-635: Stara sekcja "Na czym dziś się skupić" nadal istnieje ❌

**Problem:** Obie sekcje są widoczne jednocześnie

---

## ✅ CO DZIAŁA POPRAWNIE

1. ✅ `DeclarationsDisplay` komponent istnieje i jest zaimportowany
2. ✅ `EveningProtocolPremium` komponent istnieje i jest w RouteManager
3. ✅ Routing dla `evening_protocol` działa (linia 274-275 w RouteManager)
4. ✅ Integracja z Finish Mode (status updates) działa

---

## 🔧 CO TRZEBA NAPRAWIĆ

### Priorytet 1: Usunąć Timer

- Usunąć `Timer` z importów w `Navigation.tsx`
- Usunąć `timer` z `secondaryItems` w `Navigation.tsx`
- Usunąć `timer` z menu "więcej"

### Priorytet 2: Dodać przycisk Evening Protocol w Dashboard

- Dodać przycisk "🌙 Evening Protocol" w headerze Dashboard
- Obok przycisku "🏁 Finish Mode"

### Priorytet 3: Usunąć starą sekcję "Na czym dziś się skupić"

- Usunąć sekcję z linii 580-635 (przycisk Finish Mode + lista zadań)
- Zostawić tylko `DeclarationsDisplay` (linia 638)

### Priorytet 4: Usunąć tekst "Na czym dziś się skupić" z headera

- Zmienić tekst w linii 227 na coś bardziej ogólnego lub usunąć

---

## 📋 PLAN NAPRAWY

1. **Usuń Timer** z Navigation
2. **Dodaj przycisk Evening Protocol** w Dashboard header
3. **Usuń starą sekcję** "Na czym dziś się skupić"
4. **Zaktualizuj header** Dashboard
5. **Przetestuj** wszystkie zmiany

---

**Status:** Problemy zidentyfikowane, gotowe do naprawy
