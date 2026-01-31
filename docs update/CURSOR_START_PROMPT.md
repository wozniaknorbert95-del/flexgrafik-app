# CURSOR START PROMPT

## Wklej ten prompt do Cursora na początku sesji pracy

---

```
Jesteś senior developerem pracującym nad aplikacją ADHD Mission Control - systemem do realizacji celów dla osób z ADHD.

## KONTEKST PROJEKTU

Przeczytaj następujące pliki w tej kolejności:
1. PLAN_v2.md - pełna wizja produktu i model danych
2. DECISIONS.md - decyzje architektoniczne (D-100 do D-109)
3. ARCHITECTURE.md - kontekst techniczny, struktura kodu
4. CURSOR_TASKS.md - szczegółowe zadania do wykonania

## TWOJA ROLA

- Implementujesz zadania z CURSOR_TASKS.md
- Pracujesz **po kolei** - najpierw FAZA 1, potem FAZA 2, itd.
- Po każdym zadaniu robisz commit z opisem
- Raportujesz problemy w sekcji "Problemy napotkane" w CURSOR_TASKS.md

## ZASADY PRACY

### NIE RÓB:
- Nie modyfikuj `src/components/` - to deprecated
- Nie usuwaj istniejącej funkcjonalności
- Nie zmieniaj struktury danych bez kompatybilności wstecznej
- Nie używaj `alert()` - używaj toast
- Nie pisz UI po angielsku - tylko polski

### ZAWSZE RÓB:
- Testuj na mobile viewport (375px)
- Używaj TypeScript strict
- Dodawaj wartości domyślne dla nowych pól
- Commituj po każdym zadaniu
- Pisz UI po polsku, kod po angielsku

## KLUCZOWE PLIKI

- `types.ts` - modele danych (dodawaj, nie usuwaj!)
- `contexts/AppContext.tsx` - single source of truth
- `components/` - główna warstwa UI (używaj tej!)
- `utils/aiPrompts.ts` - budowanie promptów AI

## START

Zacznij od TASK-101 w CURSOR_TASKS.md.

Przed rozpoczęciem każdego taska:
1. Przeczytaj wymagania
2. Sprawdź "Definition of DONE"
3. Zaimplementuj
4. Przetestuj
5. Zacommituj
6. Przejdź do następnego taska

Gotowy? Zacznij od przeczytania plików dokumentacji, a potem przejdź do TASK-101.
```

---

## ALTERNATYWNY PROMPT - KRÓTSZY

Jeśli Cursor ma limit kontekstu, użyj tego:

```
Jesteś senior developerem. Pracujesz nad ADHD Mission Control (React + TypeScript + Vite).

ZASADY:
- UI tylko po polsku
- Nie modyfikuj src/components/ (deprecated)
- Używaj components/ dla UI
- Nie usuwaj pól z types.ts - tylko dodawaj
- Testuj na mobile (375px)
- Commituj po każdym zadaniu

PLIKI DO PRZECZYTANIA:
1. PLAN_v2.md - wizja i model danych
2. CURSOR_TASKS.md - zadania do wykonania

Zacznij od TASK-101 w CURSOR_TASKS.md.
```

---

## PROMPT NA KONTYNUACJĘ PRACY

Gdy wracasz do projektu po przerwie:

```
Kontynuuję pracę nad ADHD Mission Control.

Sprawdź CURSOR_TASKS.md i znajdź ostatni ukończony task (oznaczony ✅).
Kontynuuj od następnego taska.

Pamiętaj o zasadach:
- UI po polsku
- Nie modyfikuj src/components/
- Testuj na mobile viewport
- Commituj po każdym zadaniu
```

---

## PROMPT NA DEBUGOWANIE

Gdy coś nie działa:

```
Mam problem w ADHD Mission Control:

[OPISZ PROBLEM]

Stack: React 19 + TypeScript + Vite + Tailwind

Kluczowe pliki:
- types.ts - modele danych
- contexts/AppContext.tsx - stan aplikacji
- utils/ - logika biznesowa

Znajdź przyczynę i zaproponuj rozwiązanie.
```

---

## PROMPT NA REVIEW KODU

Przed mergem:

```
Zrób review zmian w ADHD Mission Control.

Sprawdź:
1. TypeScript - czy nie ma błędów?
2. Kompatybilność wsteczna - czy stare dane się załadują?
3. UI - czy po polsku?
4. Mobile - czy działa na 375px?
5. Definition of DONE z CURSOR_TASKS.md - czy spełnione?

Raportuj problemy.
```
