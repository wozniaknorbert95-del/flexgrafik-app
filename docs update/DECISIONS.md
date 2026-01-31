# DECISIONS.md – Rejestr decyzji architektonicznych

## ADHD Mission Control

**Ostatnia aktualizacja:** 2026-01-30

---

## Spis decyzji

| ID    | Decyzja                                              | Status          | Data       |
| ----- | ---------------------------------------------------- | --------------- | ---------- |
| D-100 | Architektura AI: 3 Strategów + Kalendarz             | ✅ Zatwierdzona | 2026-01-30 |
| D-101 | Struktura strategii: OKR + Implementation Intentions | ✅ Zatwierdzona | 2026-01-30 |
| D-102 | Ton AI per cel (3 warianty)                          | ✅ Zatwierdzona | 2026-01-30 |
| D-103 | Historia rozmów AI per cel                           | ✅ Zatwierdzona | 2026-01-30 |
| D-104 | Wspólny kalendarz dla Strategów                      | ✅ Zatwierdzona | 2026-01-30 |
| D-105 | Separacja API key od danych użytkownika              | ✅ Zatwierdzona | 2026-01-30 |
| D-106 | Architektura kodu: zostajemy przy components/        | ✅ Zatwierdzona | 2026-01-30 |
| D-107 | Język UI: tylko polski                               | ✅ Zatwierdzona | 2026-01-30 |
| D-108 | Priorytet zmian: Funkcje → Tech → UX                 | ✅ Zatwierdzona | 2026-01-30 |
| D-109 | AI tryb reaktywny (odpowiada gdy pytasz)             | ✅ Zatwierdzona | 2026-01-30 |

---

## D-100: Architektura AI – 3 Strategów + Kalendarz

**Data:** 2026-01-30  
**Status:** ✅ Zatwierdzona  
**Autor:** Główny architekt

### Kontekst

Aplikacja wspiera max 3 aktywne cele. Każdy cel wymaga innego podejścia AI (ton, kontekst, strategia). Potrzebujemy mechanizmu gdzie AI "pamięta" i "rozumie" każdy cel osobno.

### Decyzja

Implementujemy model "3 Strategów":

- Każdy aktywny cel ma przypisanego "Stratega AI"
- Strateg zna: strategię celu, historię rozmów, stan tasków, sesje Finish Mode
- Strategowie współdzielą dostęp do wspólnego kalendarza
- Wejście do AI z kontekstu celu → odpowiada właściwy Strateg
- Wejście do AI z Dashboard → AI widzi wszystkich 3 Strategów + kalendarz

### Konsekwencje

- **Pozytywne:** Spersonalizowane odpowiedzi per cel, pełny kontekst, AI może sugerować bazując na kalendarzu
- **Negatywne:** Większa złożoność promptów, więcej danych do przekazania API

### Alternatywy rozważane

1. Jeden globalny AI bez kontekstu celów → odrzucone (zbyt generyczne odpowiedzi)
2. Osobne instancje AI (różne API calls) → odrzucone (za drogie, niepraktyczne)

---

## D-101: Struktura strategii – OKR + Implementation Intentions

**Data:** 2026-01-30  
**Status:** ✅ Zatwierdzona  
**Autor:** Główny architekt

### Kontekst

Użytkownik chce, żeby każdy cel miał strategię ze strukturą. Potrzebujemy metodologii sprawdzonej dla mózgów ADHD.

### Decyzja

Struktura strategii składa się z:

1. **Vision** (Wizja) – dlaczego ten cel jest ważny
2. **Success Criteria** (Kryteria sukcesu) – 3-5 mierzalnych kryteriów DONE
3. **Milestones** (Kamienie milowe) – etapy z opcjonalnymi deadline i nagrodą
4. **If-Then Plans** (Plany implementacji) – automatyczne reguły decyzyjne
5. **Obstacles** (Przeszkody) – przewidziane problemy + plany B
6. **AI Context** – ton i dodatkowe instrukcje dla AI

### Dlaczego ta struktura

- **Vision** – dopamina potrzebuje emocjonalnego "dlaczego"
- **Success Criteria** – obiektywne DONE eliminuje syndrom 90%
- **Milestones** – małe zwycięstwa po drodze (dopamina)
- **If-Then Plans** – oszczędzają energię decyzyjną (deficyt ADHD)
- **Obstacles** – przygotowanie redukuje porzucenia

### Konsekwencje

- **Pozytywne:** Kompletna strategia, AI ma pełny kontekst
- **Negatywne:** Może być przytłaczające dla użytkownika

### Mitygacja

- Kreator strategii krok-po-kroku
- AI pomaga wypełnić strategię
- Minimum wymagane: vision + 1 kryterium sukcesu

---

## D-102: Ton AI per cel – 3 warianty

**Data:** 2026-01-30  
**Status:** ✅ Zatwierdzona  
**Autor:** Główny architekt

### Kontekst

Różne cele wymagają różnego podejścia AI. Ważny cel biznesowy może wymagać surowego tonu, podczas gdy eksperymentalny projekt – luźniejszego.

### Decyzja

Trzy predefiniowane tony AI:

| Ton               | Nazwa PL         | Opis                                            |
| ----------------- | ---------------- | ----------------------------------------------- |
| `military`        | Wojskowy         | Surowy, bez owijania, rozkazy, krótkie zdania   |
| `psychoeducation` | Psychoedukacyjny | Empatyczny, wyjaśnia mechanizmy ADHD, stanowczy |
| `raw_facts`       | Surowe fakty     | Zero emocji, statystyki, dane, konkrety         |

### Implementacja

```typescript
interface AIContext {
  tone: 'military' | 'psychoeducation' | 'raw_facts';
  customInstructions?: string; // opcjonalne dodatkowe instrukcje
}
```

### Konsekwencje

- **Pozytywne:** Użytkownik kontroluje jak AI do niego mówi
- **Negatywne:** Trzeba napisać 3 warianty promptów

---

## D-103: Historia rozmów AI per cel

**Data:** 2026-01-30  
**Status:** ✅ Zatwierdzona  
**Autor:** Główny architekt

### Kontekst

AI musi pamiętać całą historię realizacji celu, żeby dawać spójne rady i pilnować ukończenia.

### Decyzja

- Każdy cel ma własną historię rozmów z AI (`aiConversationHistory`)
- Historia jest persystowana w IndexedDB razem z innymi danymi celu
- Przy każdej interakcji AI otrzymuje ostatnie N wiadomości z historii
- Historia jest eksportowana z backupem (bez API key)

### Model danych

```typescript
interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  goalId: string;
}

interface Goal {
  // ...
  aiConversationHistory: AIMessage[];
}
```

### Konsekwencje

- **Pozytywne:** AI pamięta kontekst, może odwoływać się do wcześniejszych ustaleń
- **Negatywne:** Większy rozmiar danych, dłuższe prompty (limity tokenów)

### Mitygacja

- Limit historii: ostatnie 50 wiadomości per cel
- Podsumowanie starszych wiadomości przez AI (opcjonalne, przyszłość)

---

## D-104: Wspólny kalendarz dla Strategów

**Data:** 2026-01-30  
**Status:** ✅ Zatwierdzona  
**Autor:** Główny architekt

### Kontekst

Strategowie AI muszą wiedzieć o dostępności czasowej użytkownika, żeby sugerować sensowne działania.

### Decyzja

Implementujemy prosty kalendarz współdzielony między Strategami:

- Użytkownik może dodawać bloki czasowe (sesje, deep work, przerwy)
- System automatycznie wykrywa luki (> 30 min wolnego)
- AI przy interakcji dostaje kontekst kalendarza
- Deadlines z milestones automatycznie trafiają do kalendarza

### Model danych

```typescript
interface SharedCalendar {
  scheduledBlocks: CalendarBlock[];
  availableSlots: TimeSlot[]; // automatycznie wyliczane
  upcomingDeadlines: Deadline[]; // z milestones
}

interface CalendarBlock {
  id: string;
  goalId?: string;
  type: 'finish_session' | 'deep_work' | 'break' | 'other';
  title: string;
  startTime: Date;
  endTime: Date;
  isCompleted: boolean;
}
```

### Konsekwencje

- **Pozytywne:** AI może sugerować "Masz lukę o 14:00, proponuję sesję Finish Mode"
- **Negatywne:** Kolejna funkcja do utrzymania, może być obciążająca

### Mitygacja

- Kalendarz jest opcjonalny – aplikacja działa bez niego
- Prosty UI (widok tygodnia, drag & drop)
- AI sugeruje, nie wymusza

---

## D-105: Separacja API key od danych użytkownika

**Data:** 2026-01-30  
**Status:** ✅ Zatwierdzona  
**Autor:** Główny architekt

### Kontekst

Audyt wskazał ryzyko bezpieczeństwa: API key AI jest eksportowany razem z backupem danych.

### Decyzja

Rozdzielamy dane na dwa storage:

```typescript
// Dane użytkownika (eksportowalne)
interface AppData {
  goals: Goal[];
  tasks: Task[];
  sessions: FinishSession[];
  calendar: SharedCalendar;
  settings: AppSettings; // BEZ api key
  // ...
}

// Dane wrażliwe (osobny storage)
interface SecureSettings {
  aiApiKey?: string;
  // inne wrażliwe dane w przyszłości
}
```

### Zachowanie przy eksporcie/imporcie

- **Eksport domyślny:** NIE zawiera API key
- **Eksport z kluczem:** opcja "Dołącz klucz API" z ostrzeżeniem
- **Import:** pyta "Czy nadpisać istniejący klucz API?" (jeśli backup zawiera)

### Konsekwencje

- **Pozytywne:** Bezpieczeństwo klucza API
- **Negatywne:** Dwa źródła storage do zarządzania

---

## D-106: Architektura kodu – zostajemy przy components/

**Data:** 2026-01-30  
**Status:** ✅ Zatwierdzona  
**Autor:** Główny architekt

### Kontekst

Repo ma dwie warstwy UI:

- `components/` – aktualnie używana, działająca
- `src/components/` – docelowy atomic design, częściowo zaimplementowany

### Decyzja

- Zostajemy przy `components/` jako głównej warstwie
- `src/components/` oznaczamy jako deprecated (nie rozwijamy)
- Nowe komponenty tworzymy w `components/`
- W przyszłości (post-release) ewentualna konsolidacja

### Uzasadnienie

- Aplikacja działa w 90%
- Migracja do atomic design to duży koszt bez wartości dla użytkownika
- Priorytet: funkcje AI, nie refaktoring architektury

### Konsekwencje

- **Pozytywne:** Szybszy development, mniej ryzyka regresji
- **Negatywne:** Dług techniczny zostaje (ale jest zarządzany)

---

## D-107: Język UI – tylko polski

**Data:** 2026-01-30  
**Status:** ✅ Zatwierdzona  
**Autor:** Product Owner

### Kontekst

Audyt wskazał mix PL/EN w UI.

### Decyzja

- Cały UI w języku polskim
- Kod (zmienne, funkcje) pozostaje w angielskim
- Komentarze w kodzie: polski lub angielski (bez miksu w jednym pliku)

### Konsekwencje

- **Pozytywne:** Spójność, lepszy UX dla polskojęzycznego użytkownika
- **Negatywne:** Utrudnia przyszłe i18n (ale nie jest planowane)

---

## D-108: Priorytet zmian – Funkcje → Tech → UX

**Data:** 2026-01-30  
**Status:** ✅ Zatwierdzona  
**Autor:** Product Owner

### Kontekst

Po audycie mamy trzy obszary do poprawy: funkcje AI, problemy techniczne, UX/flow.

### Decyzja

Kolejność priorytetów:

1. **Funkcje AI** (strategia per cel, kontekst, ton, kalendarz)
2. **Problemy techniczne** (martwy kod, błędy, bezpieczeństwo)
3. **UX/Flow** (Dashboard, Finish Mode, nawigacja)

### Uzasadnienie

- AI jest core value proposition aplikacji
- Bez AI strategia per cel nie ma sensu
- UX można poprawić po ustabilizowaniu funkcji

---

## D-109: AI tryb reaktywny

**Data:** 2026-01-30  
**Status:** ✅ Zatwierdzona  
**Autor:** Product Owner

### Kontekst

AI może działać proaktywnie (sam się odzywa) lub reaktywnie (odpowiada gdy pytasz).

### Decyzja

- AI jest **reaktywny** – odpowiada tylko gdy użytkownik pyta
- AI może **sugerować** przy okazji interakcji (np. wykryta luka w kalendarzu)
- AI NIE wysyła samodzielnych powiadomień/przypomnień (to robią inne mechanizmy)

### Uzasadnienie

- Proaktywne AI może być nachalne i męczące dla ADHD
- Kontrola nad interakcją pozostaje przy użytkowniku
- Powiadomienia to osobny system (scheduler, rules)

### Konsekwencje

- **Pozytywne:** Użytkownik nie jest bombardowany
- **Negatywne:** AI nie "pilnuje" sam z siebie (ale to może być dobre)

---

## Historia zmian

| Data       | Decyzja        | Zmiana               |
| ---------- | -------------- | -------------------- |
| 2026-01-30 | D-100 do D-109 | Utworzenie dokumentu |

---

_Dokument żywy – aktualizować przy każdej nowej decyzji architektonicznej._
