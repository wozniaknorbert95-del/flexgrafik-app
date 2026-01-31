# ARCHITECTURE.md – Kontekst techniczny

## ADHD Mission Control

**Dla:** Cursor AI / Developerów  
**Data:** 2026-01-30

---

## 1. Stack technologiczny

| Warstwa  | Technologia                  | Wersja |
| -------- | ---------------------------- | ------ |
| Runtime  | React                        | 19     |
| Język    | TypeScript                   | 5.x    |
| Build    | Vite                         | 6      |
| Styling  | Tailwind CSS                 | 4      |
| Animacje | Framer Motion                | -      |
| Ikony    | Lucide React                 | -      |
| Testy    | Jest                         | -      |
| PWA      | Custom SW                    | -      |
| Storage  | IndexedDB + localStorage     | -      |
| AI       | Groq API (OpenAI compatible) | -      |

---

## 2. Struktura katalogów

```
/
├── components/           # ✅ GŁÓWNA warstwa UI (używaj tej!)
│   ├── common/          # Wspólne komponenty (LoadingSpinner, EmptyState)
│   ├── onboarding/      # Onboarding flow
│   ├── screens/         # Ekrany (AICoachPremium, etc.)
│   └── *.tsx            # Główne komponenty (Dashboard, FinishMode, etc.)
│
├── contexts/
│   └── AppContext.tsx   # ⭐ SINGLE SOURCE OF TRUTH - cały stan aplikacji
│
├── utils/               # Logika biznesowa
│   ├── aiProvider.ts    # Komunikacja z AI (Groq)
│   ├── aiPrompts.ts     # Budowanie promptów
│   ├── storageManager.ts # Persystencja danych
│   ├── indexedDBStorage.ts
│   ├── taskHelpers.ts   # Helpery dla tasków
│   ├── goalHelpers.ts   # Helpery dla celów
│   └── ...
│
├── types.ts             # ⭐ MODELE DANYCH - wszystkie interfejsy
│
├── src/                 # ⚠️ DEPRECATED - nie rozwijaj!
│   └── components/      # Atomic design (nieużywane)
│
├── public/
│   ├── sw.js           # Service Worker
│   ├── manifest.json   # PWA manifest
│   └── offline.html    # Offline fallback
│
└── App.tsx              # Root component
```

---

## 3. Kluczowe pliki

### types.ts

Wszystkie interfejsy danych. **Zawsze** modyfikuj przez dodawanie, nie usuwanie (kompatybilność wsteczna).

```typescript
// Główne typy:
interface Pillar { ... }     // Cel (Goal)
interface Task { ... }       // Zadanie
interface FinishSession { ... }
interface EveningProtocol { ... }
interface AppData { ... }    // Cały stan aplikacji
```

### contexts/AppContext.tsx

Single source of truth. ~1600 linii. Zawiera:

- Stan aplikacji (`appData`)
- Wszystkie akcje (CRUD dla celów, tasków, sesji)
- Persystencję do IndexedDB
- Integrację z AI

**Jak używać:**

```typescript
const { appData, updatePillar, addTask, ... } = useApp();
```

### utils/aiProvider.ts

Komunikacja z Groq API. Funkcje:

- `generateAIResponse(prompt, options)` - główna funkcja
- Fallback gdy API niedostępne

### utils/storageManager.ts

Eksport/Import danych. Backup/Restore.

---

## 4. Konwencje kodu

### Nazewnictwo

- Komponenty: PascalCase (`DashboardPremium.tsx`)
- Funkcje/zmienne: camelCase (`updatePillar`)
- Typy/Interfejsy: PascalCase (`GoalStrategy`)
- Pliki utils: camelCase (`taskHelpers.ts`)

### Styling

- **Tailwind CSS** - preferowany
- Dark mode domyślny
- Mobile-first (testuj na 375px viewport)
- Kolory z design systemu (sprawdź istniejące komponenty)

### Język

- **UI:** Polski
- **Kod:** Angielski (zmienne, funkcje, komentarze)

### State management

- Używaj **AppContext** dla globalnego stanu
- Lokalny stan (`useState`) tylko dla UI (formularze, modals)
- Nie twórz nowych kontekstów bez uzasadnienia

---

## 5. Flow danych

```
┌─────────────────┐
│   IndexedDB     │  ← persystencja
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   AppContext    │  ← single source of truth
│   (appData)     │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ Comp1 │ │ Comp2 │  ← komponenty UI
└───────┘ └───────┘
```

**Zasady:**

1. Komponenty czytają z `appData`
2. Zmiany przez akcje (`updatePillar`, `addTask`, etc.)
3. AppContext automatycznie persystuje do IndexedDB

---

## 6. Routing

**Brak react-router!** Routing przez stan:

```typescript
// types.ts
type ViewState =
  | 'home'          // Dashboard
  | 'today'         // Today view
  | 'finish'        // Finish Mode
  | 'pillar_detail' // Widok celu
  | 'ai_coach'      // AI Chat
  | 'settings'      // Ustawienia
  | ...

// Nawigacja
const { setCurrentView } = useApp();
setCurrentView('finish');
```

---

## 7. AI Integration

### Provider

```typescript
// utils/aiProvider.ts
const response = await generateAIResponse(prompt, {
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  maxTokens: 1000,
});
```

### Budowanie promptów

```typescript
// utils/aiPrompts.ts
// Tu dodawaj nowe funkcje budujące prompty
```

### API Key

- Przechowywany w osobnym storage (D-105)
- NIE eksportowany domyślnie z backupem

---

## 8. PWA

### Service Worker (`public/sw.js`)

- Cache-first dla assetów
- Network-first dla API
- **NIE** modyfikuj bez potrzeby - jest stabilny

### Offline

- Aplikacja działa offline (local-first)
- AI niedostępne offline → pokazuj fallback

---

## 9. Migracje danych

Przy zmianie struktury danych:

1. Dodaj migrację w `utils/dataMigration.ts`
2. **Nigdy** nie usuwaj pól - tylko dodawaj
3. Nowe pola muszą mieć wartości domyślne

```typescript
// Przykład migracji
function migrateToV2(data: any): AppData {
  // Dodaj nowe pole jeśli nie istnieje
  data.pillars = data.pillars.map((p) => ({
    ...p,
    strategy: p.strategy || defaultStrategy,
  }));
  return data;
}
```

---

## 10. Testowanie

### Build test

```bash
npm run build
```

Musi przechodzić bez błędów.

### Manual test checklist

- [ ] Mobile viewport (375px)
- [ ] Offline mode
- [ ] Eksport/Import danych
- [ ] AI chat (z kluczem i bez)
- [ ] Finish Mode full flow

---

## 11. Częste problemy

### "Cannot find module X"

Sprawdź importy - mogą być względne vs absolutne.

### "appData is undefined"

Komponent nie jest w AppProvider. Sprawdź hierarchię w App.tsx.

### "Invalid Date"

Problem z parsowaniem dat. Używaj ISO strings (`toISOString()`) w storage.

### TypeScript errors

Uruchom `npm run build` żeby zobaczyć wszystkie błędy.

---

## 12. Nie rób

❌ Nie modyfikuj `src/components/` - deprecated  
❌ Nie dodawaj react-router  
❌ Nie twórz nowych kontekstów React  
❌ Nie usuwaj istniejących pól z types.ts  
❌ Nie hardcoduj tekstów po angielsku w UI  
❌ Nie używaj `alert()` - używaj toast

---

## 13. Zawsze rób

✅ Testuj na mobile viewport (375px)  
✅ Używaj TypeScript strict  
✅ Dodawaj kompatybilność wsteczną przy zmianach danych  
✅ Commituj po każdym zadaniu  
✅ Pisz UI po polsku  
✅ Używaj istniejących helperów z `utils/`

---

_Dokument dla Cursora - aktualizuj gdy architektura się zmienia._
