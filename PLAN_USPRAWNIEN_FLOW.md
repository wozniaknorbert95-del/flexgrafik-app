# PLAN USPRAWNIEŃ FLOW UŻYTKOWNIKA

**Data:** 2026-01-26  
**Cel:** Maksymalne usprawnienie flow użytkownika, usunięcie rozpraszaczy, fokus na wieczorny protokół i deklaracje

---

## 📋 ANALIZA OBECNEJ STRUKTURY

### Obecne sekcje Dashboard:

1. ✅ **3 aktywne cele** - ZOSTAJE (core feature)
2. ❌ **"Na czym dziś się skupić?"** - DO ZMIANY (pokazać deklaracje z protokołu)
3. ✅ **Statystyki** - ZOSTAJE (przeniesione do Accountability)
4. ❌ **Timer** - DO USUNIĘCIA (czas mierzymy w Finish Mode)
5. ✅ **Ideas Vault** - ZOSTAJE (przydatne)
6. ✅ **Finish Mode** - ZOSTAJE (główny workbench)

### Obecne problemy:

- Sekcja "Na czym dziś się skupić" duplikuje Finish Mode
- Brak wieczornego protokołu
- Brak systemu deklaracji z kontrolą przez agenta celu
- Rules są kłopotliwe do dodawania
- Timer jest zbędny (czas w Finish Mode)

---

## 🎯 NOWA WIZJA FLOW

### **Rano:**

1. Otwieram Dashboard
2. Widzę **deklaracje z wieczornego protokołu** (zamiast "Na czym dziś się skupić")
3. Agent celu pokazuje status: ✅ spełnione / ⚠️ w trakcie / ❌ nie spełnione
4. Klikam deklarację → Finish Mode

### **W ciągu dnia:**

1. Finish Mode = główny workbench
2. Czas mierzony w Finish Mode (już jest)
3. AI Coach dostępny z menu (już jest)

### **Wieczorem:**

1. **Wieczorny Protokół** (nowy ekran/flow):
   - Wybór tasków na jutro (tylko z aktywnych celów)
   - Uzupełnienie Done Criteria dla każdego taska
   - Implementation Intentions (minimum 3)
   - Rules (minimum 1) - uproszczone dodawanie
   - Podsumowanie deklaracji

### **Accountability:**

- Wszystkie statystyki w jednym miejscu
- Historia deklaracji i ich spełnienia
- Raporty z agentów celów

---

## 📐 ETAPY IMPLEMENTACJI

### **ETAP 1: USUNIĘCIE ROZPRASZACZY** (Priorytet: WYSOKI)

#### 1.1. Usunięcie Timer

- **Pliki:**
  - `components/TimerPremium.tsx` - usunąć
  - `components/RouteManager.tsx` - usunąć routing 'timer'
  - `components/Navigation.tsx` - usunąć z secondaryItems
  - `types.ts` - usunąć 'timer' z ViewState
- **Czas:** 15 min
- **Ryzyko:** Niskie

#### 1.2. Przeniesienie statystyk do Accountability

- **Pliki:**
  - `components/DashboardPremium.tsx` - usunąć sekcję statystyk
  - `components/RouteManager.tsx` - rozbudować 'accountability' view
- **Czas:** 30 min
- **Ryzyko:** Niskie

#### 1.3. Zmiana sekcji "Na czym dziś się skupić" na "Deklaracje z protokołu"

- **Pliki:**
  - `components/DashboardPremium.tsx` - zmienić logikę sekcji
- **Czas:** 45 min
- **Ryzyko:** Średnie (wymaga nowego modelu danych)

---

### **ETAP 2: WIECZORNY PROTOKÓŁ** (Priorytet: WYSOKI)

#### 2.1. Model danych dla protokołu

- **Nowe typy w `types.ts`:**

  ```typescript
  interface EveningProtocol {
    id: string;
    date: string; // ISO date
    tasks: ProtocolTask[];
    implementationIntentions: ImplementationIntention[];
    rules: CustomRule[];
    completed: boolean;
    createdAt: string;
  }

  interface ProtocolTask {
    taskId: number;
    goalId: number;
    doneCriteria: DoneCriterion[]; // uzupełnione wieczorem
    declaredStartTime?: string; // "09:00"
    declaredEndTime?: string; // "12:00"
  }

  interface Declaration {
    id: string;
    protocolId: string;
    taskId: number;
    goalId: number;
    declaredStartTime: string;
    declaredEndTime: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    completedAt?: string;
    penaltyPoints?: number; // odejmowane przez agenta
  }
  ```

- **Czas:** 30 min
- **Ryzyko:** Niskie

#### 2.2. Komponent EveningProtocol

- **Nowy plik:** `components/EveningProtocolPremium.tsx`
- **Funkcjonalność:**
  - Wybór tasków (tylko z aktywnych celów)
  - Formularz Done Criteria per task
  - Formularz Implementation Intentions (min 3)
  - Formularz Rules (min 1) - uproszczony
  - Walidacja: nie można zapisać bez min wymagań
  - Zapis do `AppData.eveningProtocols[]`
- **Czas:** 2-3h
- **Ryzyko:** Średnie

#### 2.3. Routing i nawigacja

- **Dodaj do `types.ts`:** `'evening_protocol'` do ViewState
- **Dodaj do Navigation:** przycisk "🌙 Protokół" (tylko wieczorem, 18:00-23:59)
- **Czas:** 20 min
- **Ryzyko:** Niskie

---

### **ETAP 3: DEKLARACJE NA DASHBOARD** (Priorytet: WYSOKI)

#### 3.1. Wyświetlanie deklaracji zamiast "Na czym dziś się skupić"

- **Plik:** `components/DashboardPremium.tsx`
- **Zmiana:**
  - Zamiast `todaysFocus` (rekomendacje) → `todaysDeclarations` (z protokołu)
  - Pokazuj status: ✅ / ⚠️ / ❌
  - Kliknięcie → Finish Mode z wybranym taskiem
- **Czas:** 1h
- **Ryzyko:** Średnie

#### 3.2. Logika statusu deklaracji

- **Funkcja:** `checkDeclarationStatus(declaration)`
  - `pending` - przed declaredStartTime
  - `in_progress` - między declaredStartTime a declaredEndTime
  - `completed` - task zakończony w Finish Mode przed declaredEndTime
  - `failed` - declaredEndTime minęło, task nie zakończony
- **Czas:** 45 min
- **Ryzyko:** Niskie

---

### **ETAP 4: AGENT CELU I KONTROLA DEKLARACJI** (Priorytet: ŚREDNI)

#### 4.1. System agentów celów

- **Nowy plik:** `utils/goalAgent.ts`
- **Funkcjonalność:**
  - Agent zna: strategię celu, done definition, deklaracje
  - Sprawdza spełnienie deklaracji (co X minut)
  - Odejmuje punkty nagrody jeśli deklaracja nie spełniona
  - Komunikuje status użytkownikowi
- **Czas:** 2-3h
- **Ryzyko:** Średnie (wymaga integracji z systemem nagród)

#### 4.2. Integracja z systemem nagród

- **Plik:** `contexts/AppContext.tsx`
- **Zmiana:**
  - Agent odejmuje punkty z nagrody celu
  - Pokazuje komunikat: "Nie spełniłeś deklaracji X, -Y punktów z nagrody"
- **Czas:** 1h
- **Ryzyko:** Niskie

---

### **ETAP 5: UPROSZCZENIE RULES** (Priorytet: ŚREDNI)

#### 5.1. Nowy interfejs dodawania Rules

- **Plik:** `components/RulesPremium.tsx`
- **Zmiana:**
  - Zamiast formularza z condition/action → **wizard krok po kroku**
  - Krok 1: Wybierz trigger (time/data)
  - Krok 2: Ustaw warunek (proste pola, nie eval)
  - Krok 3: Wybierz akcję (voice/notification/block)
  - Krok 4: Napisz wiadomość
- **Czas:** 2h
- **Ryzyko:** Średnie

#### 5.2. Template Rules

- **Dodaj gotowe szablony:**
  - "Poranna motywacja" (time: 07:00, voice)
  - "Przypomnienie o Finish Mode" (time: 10:00, notification)
  - "Blokada nowych projektów" (data: stuck@90%, block)
- **Czas:** 1h
- **Ryzyko:** Niskie

---

## 🎨 PROPOZYCJE ULEPSZEŃ (Z POZIOMU PRO)

### 1. **Smart Defaults w Wieczornym Protokole**

- AI sugeruje taski na podstawie:
  - Postępu celu (co jest blisko finiszu)
  - Historii (co było wczoraj)
  - Stuck tasks (co wymaga dokończenia)
- **Czas:** 1h
- **Wartość:** Wysoka

### 2. **Wizualizacja deklaracji na Dashboard**

- Timeline pokazujący:
  - Które deklaracje są teraz aktywne
  - Które minęły
  - Które są przed nami
- **Czas:** 1.5h
- **Wartość:** Średnia

### 3. **Quick Actions w Dashboard**

- Przy każdej deklaracji:
  - "Start Finish Mode" (jeśli pending/in_progress)
  - "Mark as done" (jeśli completed)
  - "Reschedule" (jeśli failed)
- **Czas:** 45 min
- **Wartość:** Wysoka

### 4. **Agent Goal - Komunikaty**

- Agent pokazuje komunikaty w Dashboard:
  - "Deklaracja X zaczyna się za 15 min"
  - "Nie spełniłeś deklaracji Y, -5 punktów"
  - "Świetnie! Wszystkie deklaracje spełnione ✅"
- **Czas:** 1h
- **Wartość:** Wysoka

### 5. **Evening Protocol - Reminder**

- Automatyczne przypomnienie o protokole (20:00)
- Możliwość szybkiego powtórzenia wczorajszego protokołu
- **Czas:** 30 min
- **Wartość:** Średnia

---

## 📊 PRIORYTETYZACJA ETAPÓW

### **FAZA 1: Quick Wins** (1-2 dni)

1. ✅ Usunięcie Timer
2. ✅ Przeniesienie statystyk do Accountability
3. ✅ Uproszczenie Rules (wizard)

### **FAZA 2: Core Features** (3-5 dni)

4. ✅ Model danych protokołu
5. ✅ Komponent EveningProtocol
6. ✅ Deklaracje na Dashboard

### **FAZA 3: Advanced** (5-7 dni)

7. ✅ Agent celu i kontrola
8. ✅ Integracja z nagrodami
9. ✅ Smart defaults i ulepszenia

---

## 🔧 SZCZEGÓŁY TECHNICZNE

### Nowe pola w `AppData`:

```typescript
interface AppData {
  // ... istniejące pola
  eveningProtocols: EveningProtocol[];
  declarations: Declaration[];
  goalAgents: {
    [goalId: number]: {
      lastCheck: string;
      penaltyPoints: number;
      status: 'active' | 'paused';
    };
  };
}
```

### Nowe funkcje w `AppContext`:

- `createEveningProtocol(protocol: EveningProtocol): void`
- `getTodaysDeclarations(): Declaration[]`
- `checkDeclarationStatus(declarationId: string): DeclarationStatus`
- `agentCheckDeclarations(goalId: number): void`
- `applyPenalty(goalId: number, points: number): void`

---

## ✅ CHECKLIST PRZED STARTEM

- [ ] Backup obecnych danych
- [ ] Przegląd wszystkich miejsc używających Timer
- [ ] Przegląd wszystkich miejsc używających statystyk
- [ ] Testy migracji danych (dodanie nowych pól)
- [ ] Dokumentacja nowych funkcji

---

## 🚀 REKOMENDACJA STARTU

**Zacznij od FAZY 1:**

1. Usuń Timer (najprostsze, szybkie)
2. Przenieś statystyki (jasne, bez ryzyka)
3. Uprość Rules (duża wartość dla UX)

**Potem FAZA 2:** 4. Wieczorny protokół (core feature) 5. Deklaracje na Dashboard (główny flow)

**Na końcu FAZA 3:** 6. Agent celu (zaawansowane, wymaga testów)

---

**Status:** Gotowy do implementacji  
**Szacowany czas:** 7-10 dni roboczych  
**Priorytet:** WYSOKI (usprawnienie core flow)
