# USABILITY IMPROVEMENTS - Implementation Plan

**Based on:** Professional UX Audit  
**Priority:** Critical → High → Medium  
**Estimated Time:** 2-3 weeks

---

## PHASE 1: CRITICAL FIXES (Week 1)

### 1.1 Onboarding Flow

**Problem:** New users don't know what to do first.

**Solution:**

1. Create `components/onboarding/OnboardingFlow.tsx`
2. Show on first app load (check localStorage flag)
3. 3-step guide:
   - Step 1: "Welcome - This app helps you finish things"
   - Step 2: "Evening Protocol - Plan tomorrow tonight"
   - Step 3: "Finish Mode - Work on tasks with focus"

**Files:**

- `components/onboarding/OnboardingFlow.tsx` (NEW)
- `components/onboarding/OnboardingStep.tsx` (NEW)
- `App.tsx` - Add onboarding check

**Acceptance Criteria:**

- ✅ Shows only on first visit
- ✅ Can skip
- ✅ Can go back/forward
- ✅ Sets localStorage flag when completed

---

### 1.2 Improve Empty States

**Problem:** Empty states don't guide user to action.

**Solution:**

1. Enhance `DeclarationsDisplay` empty state
2. Add illustration/icon
3. Better CTA button
4. Add "Why?" explanation

**Files:**

- `components/DeclarationsDisplay.tsx`
- `components/common/EmptyState.tsx` (NEW - reusable)

**Changes:**

```tsx
// Before
<p>Brak deklaracji na dziś...</p>
<button>🌙 Evening Protocol</button>

// After
<div className="text-center py-12">
  <Illustration /> {/* SVG or icon */}
  <h3>Planuj jutro wieczorem</h3>
  <p>Evening Protocol pomaga zaplanować zadania na jutro...</p>
  <button>Plan Tomorrow →</button>
  <a href="#why">Dlaczego to działa?</a>
</div>
```

---

### 1.3 Reduce Dashboard Cognitive Load

**Problem:** Too many sections, unclear hierarchy.

**Solution:**

1. Move Ideas Vault to "More" menu
2. Make AI Assistant collapsible
3. Add visual hierarchy (size, spacing)
4. Add "Focus Mode" toggle

**Files:**

- `components/DashboardPremium.tsx`
- `components/common/CollapsibleSection.tsx` (NEW)

**Changes:**

- Ideas Vault: Remove from dashboard, add to Navigation "More"
- AI Assistant: Add collapse/expand button
- Declarations: Make 2x larger, more prominent
- Add "Focus Mode" button (hides everything except declarations)

---

## PHASE 2: HIGH PRIORITY (Week 2)

### 2.1 Improve Navigation

**Problem:** Evening Protocol hard to find.

**Solution:**

1. Add Evening Protocol to primary navigation
2. Add breadcrumbs
3. Reorganize "More" menu

**Files:**

- `components/Navigation.tsx`
- `components/common/Breadcrumbs.tsx` (NEW)

**Changes:**

```tsx
// Primary nav: Add Evening Protocol
const primaryItems = [
  { id: 'home', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'evening_protocol', label: 'Protocol', icon: Moon }, // NEW
  { id: 'finish', label: 'Finish', icon: Flag },
  { id: 'ai_coach', label: 'AI', icon: Sparkles },
];
```

---

### 2.2 Visual Timeline for Declarations

**Problem:** Declarations shown as list, no time awareness.

**Solution:**

1. Add timeline view option
2. Show: Past → Now → Upcoming
3. Visual timeline with time markers

**Files:**

- `components/DeclarationsDisplay.tsx`
- `components/declarations/DeclarationsTimeline.tsx` (NEW)

**Features:**

- Toggle: List view / Timeline view
- Timeline shows time of day
- Color-coded by status
- Shows "now" marker

---

### 2.3 Enhance Evening Protocol UX

**Problem:** Long form, validation errors at top, button at bottom.

**Solution:**

1. Sticky "Complete" button
2. Inline validation errors
3. Add "Review" step before completion

**Files:**

- `components/EveningProtocolPremium.tsx`

**Changes:**

- Sticky footer with "Complete Protocol" button
- Show validation errors next to each step
- Add "Review & Complete" step (summary of all inputs)

---

## PHASE 3: MEDIUM PRIORITY (Week 3)

### 3.1 Smart Defaults

**Problem:** User must manually select everything.

**Solution:**

1. AI suggests tasks based on history
2. Pre-fill time windows from previous protocols
3. Suggest implementation intentions

**Files:**

- `utils/protocolSuggestions.ts` (NEW)
- `components/EveningProtocolPremium.tsx`

---

### 3.2 Accessibility Improvements

**Problem:** Missing focus indicators, color-only status.

**Solution:**

1. Add visible focus rings
2. Add icons + text for status
3. High contrast mode

**Files:**

- `src/index.css` - Focus styles
- `components/DeclarationsDisplay.tsx` - Status icons
- `components/SettingsPremium.tsx` - High contrast toggle

---

### 3.3 Undo/Recovery

**Problem:** No undo, fear of mistakes.

**Solution:**

1. Undo last action (toast with undo button)
2. Recover drafts
3. Show "Auto-saved" indicator

**Files:**

- `utils/undoManager.ts` (NEW)
- `components/EveningProtocolPremium.tsx` - Auto-save indicator

---

## IMPLEMENTATION ORDER

**Week 1:**

1. Onboarding flow (1.1)
2. Empty states (1.2)
3. Dashboard cleanup (1.3)

**Week 2:** 4. Navigation improvements (2.1) 5. Visual timeline (2.2) 6. Protocol UX (2.3)

**Week 3:** 7. Smart defaults (3.1) 8. Accessibility (3.2) 9. Undo/recovery (3.3)

---

## SUCCESS METRICS

**Before:**

- Time to first protocol: Unknown
- Protocol completion rate: Unknown
- User confusion: High

**After:**

- Time to first protocol: < 5 minutes
- Protocol completion rate: > 80%
- User confusion: Low (measured via feedback)

---

**Status:** Ready for Implementation  
**Next Step:** Start with Phase 1 (Critical Fixes)
