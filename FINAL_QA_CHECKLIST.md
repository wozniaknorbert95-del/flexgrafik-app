# FINAL QA CHECKLIST - ADHD Accountability Assistant

## PRE-FLIGHT

- [ ] `npm run build` - PASS
- [ ] `npm test` - 72/72 PASS
- [ ] Dev server działa: `npm run dev`

## FLOW 1: New User (pusta baza)

- [ ] Wejście → Dashboard pokazuje "Start here"
- [ ] Klik "Add your first goal" → scroll do formularza
- [ ] Stworzenie celu MAIN → pojawia się na Dashboard z GOLD badge
- [ ] Dodanie taska z Definition of DONE
- [ ] Wejście do Finish Mode → pokazuje task do wyboru (nie empty state)
- [ ] Start sesji → DONE + Strategy widoczne
- [ ] End sesji → klasyfikacja DONE → GOLD glow nagrody
- [ ] Powrót do Dashboard → task oznaczony jako done

## FLOW 2: Existing User (dane w storage)

- [ ] Wejście → Dashboard pokazuje cele i rekomendacje
- [ ] MAIN goal ma GOLD badge, SECONDARY/LAB mają subtle badge
- [ ] Klik rekomendacji → Finish Mode startuje sesję (1 klik)
- [ ] Top-bar w Finish Mode: "← Dashboard" i "🧠 AI" działają
- [ ] AI Chat → bąbelki User (magenta) vs Assistant (cyan)
- [ ] Quick actions w AI działają (4 produkcyjne prompty)

## FLOW 3: Navigation

- [ ] Bottom nav: Dashboard / Finish / AI / Więcej
- [ ] "Więcej" → Today, Timer, Sprint, Accountability, Rules, Settings
- [ ] Każdy screen w "Więcej" ładuje się bez błędów
- [ ] Powrót do Dashboard działa z każdego miejsca

## FLOW 4: Settings

- [ ] Settings → sekcja "Cele" z maxActive slider (1-5)
- [ ] Zmiana maxActive → działa natychmiast
- [ ] AI status pokazuje prawdziwy stan (Disabled / Enabled no key / Enabled + key)
- [ ] Sync status używa tokenów (cyan/danger)

## FLOW 5: Mobile (375px viewport lub telefon)

- [ ] Bottom nav nie nachodzi na home indicator (iOS)
- [ ] Top-bar w Finish Mode nie nachodzi na notch
- [ ] Wszystkie przyciski mają min 44px touch target
- [ ] Tekst jest czytelny (min 14px)

## FLOW 6: Visual Consistency

- [ ] ZERO różowych/cyan kolorów które "nie pasują"
- [ ] Glow pojawia się TYLKO na hover/tap, nie idle
- [ ] Karty mają spójny border (subtle, nie jaskrawy)
- [ ] Dark theme spójny na wszystkich screenach

## FLOW 7: Edge Cases

- [ ] Offline mode → app działa (PWA)
- [ ] AI disabled → brak błędów fetch, fallback działa
- [ ] > 3 aktywne cele → migracja do max 3 + backlog
- [ ] > 1 MAIN goal → migracja do 1 MAIN

## POST-QA

- [ ] Wszystkie checkboxy PASS
- [ ] Screenshot kluczowych screenów (opcjonalnie)
- [ ] Ready to push
