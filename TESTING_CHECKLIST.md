# TESTING CHECKLIST - Evening Protocol & Declaration System

**Date:** 2026-01-26  
**Status:** Ready for Testing

---

## 🧪 TESTING SCENARIOS

### Phase 1: Evening Protocol Creation

#### Test 1.1: Create New Protocol

- [ ] Navigate to Evening Protocol from Dashboard
- [ ] Verify tomorrow's date is displayed
- [ ] Verify empty state if no tasks available
- [ ] Verify task list shows only active goals' incomplete tasks

#### Test 1.2: Task Selection

- [ ] Select a task → declaration should be created
- [ ] Deselect a task → declaration should be removed
- [ ] Select multiple tasks → multiple declarations created
- [ ] Verify progress indicator updates (1/4 steps)

#### Test 1.3: Done Criteria Definition

- [ ] Expand declaration card
- [ ] Add Done Criteria
- [ ] Edit Done Criteria
- [ ] Remove Done Criteria
- [ ] Verify criteria are saved in protocol
- [ ] Verify progress indicator updates (2/4 steps)

#### Test 1.4: Time Window Selection

- [ ] Set start time
- [ ] Set end time
- [ ] Test midnight crossover (e.g., 23:00 - 01:00)
- [ ] Verify validation (start < end)
- [ ] Verify time window is saved

#### Test 1.5: Implementation Intentions

- [ ] Add first intention
- [ ] Add second intention
- [ ] Add third intention (minimum met)
- [ ] Add more intentions
- [ ] Edit intention
- [ ] Delete intention
- [ ] Verify minimum 3 required
- [ ] Verify progress indicator updates (3/4 steps)

#### Test 1.6: Rules Selection

- [ ] Link existing rule
- [ ] Create new rule
- [ ] Verify minimum 1 required
- [ ] Verify progress indicator updates (4/4 steps)

#### Test 1.7: Protocol Completion

- [ ] Try to complete without tasks → should show validation error
- [ ] Try to complete without Done Criteria → should show validation error
- [ ] Try to complete without time windows → should show validation error
- [ ] Try to complete with < 3 intentions → should show validation error
- [ ] Try to complete with < 1 rule → should show validation error
- [ ] Complete valid protocol → should show success message
- [ ] Verify redirect to Dashboard after 2 seconds
- [ ] Verify protocol status is 'completed'
- [ ] Verify declarations are created in AppData

---

### Phase 2: Declaration Display

#### Test 2.1: Dashboard Display

- [ ] Verify DeclarationsDisplay component shows on Dashboard
- [ ] Verify today's declarations are displayed
- [ ] Verify declarations are grouped by status
- [ ] Verify empty state if no declarations

#### Test 2.2: Real-time Status Updates

- [ ] Verify status updates every minute
- [ ] Test status transitions:
  - `pending` → `active` (when time window starts)
  - `active` → `in_progress` (when Finish Mode starts)
  - `in_progress` → `completed` (when task completed)
  - `active` → `failed` (when time window passes)

#### Test 2.3: Time Window Display

- [ ] Verify time windows are displayed correctly
- [ ] Verify "Time until active" countdown
- [ ] Verify "Time remaining" countdown

#### Test 2.4: Done Criteria Progress

- [ ] Verify Done Criteria progress bar
- [ ] Verify completed/total criteria count

#### Test 2.5: Agent Penalties Display

- [ ] Verify penalty points are displayed
- [ ] Verify penalty reason is shown
- [ ] Verify severity indicator (minor/major/critical)

---

### Phase 3: Finish Mode Integration

#### Test 3.1: Start Finish Mode from Declaration

- [ ] Click "Start Finish Mode" button on declaration
- [ ] Verify Finish Mode opens with correct task selected
- [ ] Verify declaration status changes to `in_progress`
- [ ] Verify `startedAt` timestamp is set

#### Test 3.2: Declaration Status During Finish Mode

- [ ] Verify declaration shows "in_progress" status
- [ ] Verify agent does NOT apply penalties during active session
- [ ] Verify DeclarationsDisplay shows active session indicator

#### Test 3.3: Complete Task in Finish Mode

- [ ] Complete task (progress = 100, status = 'done')
- [ ] Verify all Done Criteria are met
- [ ] End Finish Mode session with status 'completed'
- [ ] Verify declaration status changes to `completed`
- [ ] Verify `completedAt` timestamp is set

#### Test 3.4: Complete Task Without Meeting Criteria

- [ ] Complete task (progress = 100)
- [ ] Leave some Done Criteria incomplete
- [ ] End Finish Mode session
- [ ] Verify declaration status does NOT change to `completed`
- [ ] Verify declaration remains `in_progress` or `active`

#### Test 3.5: Abort Finish Mode Session

- [ ] Start Finish Mode
- [ ] Abort session (status = 'aborted')
- [ ] Verify declaration status reverts appropriately
- [ ] Verify no penalties applied if within time window

---

### Phase 4: Agent Monitoring

#### Test 4.1: Agent Check Scheduler

- [ ] Verify agent scheduler starts on app load
- [ ] Verify checks run every 15 minutes
- [ ] Verify checks respect agent configuration (checkIntervalMinutes)

#### Test 4.2: Agent Status Calculation

- [ ] Verify agent calculates declaration status correctly
- [ ] Verify agent respects Finish Mode active state
- [ ] Verify agent does NOT check declarations with active Finish Mode

#### Test 4.3: Penalty Application

- [ ] Wait for time window to pass without completion
- [ ] Verify declaration status changes to `failed`
- [ ] Verify agent detects failure
- [ ] Verify penalty is calculated correctly
- [ ] Verify penalty points are added to declaration
- [ ] Verify notification is created

#### Test 4.4: Consecutive Failures

- [ ] Fail declaration multiple times
- [ ] Verify consecutive failures counter increases
- [ ] Verify penalty severity increases (minor → major → critical)
- [ ] Verify penalty points increase with consecutive failures

#### Test 4.5: Agent History

- [ ] Verify agent check records are saved
- [ ] Verify history is limited to last 30 days
- [ ] Verify total penalties applied counter updates

---

### Phase 5: Edge Cases

#### Test 5.1: Duplicate Prevention

- [ ] Complete protocol twice → should update, not duplicate
- [ ] Verify declarations are not duplicated
- [ ] Verify existing declarations are updated, not recreated

#### Test 5.2: Time Window Edge Cases

- [ ] Test midnight crossover (23:00 - 01:00)
- [ ] Test same start/end time → should show validation error
- [ ] Test end time before start time → should show validation error

#### Test 5.3: Multiple Declarations

- [ ] Create protocol with multiple declarations
- [ ] Verify all declarations are created correctly
- [ ] Verify each declaration has unique ID
- [ ] Verify declarations can have different time windows

#### Test 5.4: Protocol Re-editing

- [ ] Create draft protocol
- [ ] Navigate away
- [ ] Return to Evening Protocol
- [ ] Verify draft is loaded
- [ ] Verify changes are preserved

#### Test 5.5: Data Migration

- [ ] Load old data (v1 schema)
- [ ] Verify migration to v2 works
- [ ] Verify default agents are created
- [ ] Verify no data loss

---

## 🐛 KNOWN ISSUES TO VERIFY

1. **Time Window Midnight Crossover**
   - Verify `TimeWindowSelector` handles overnight windows correctly
   - Verify `DeclarationStatusCalculator` calculates status correctly for overnight windows

2. **Agent Check Race Condition**
   - Verify no race condition when agent checks during Finish Mode
   - Verify agent respects `finishSessionActive` map

3. **Declaration Status Consistency**
   - Verify status is consistent across components
   - Verify no status conflicts between Finish Mode and agent checks

4. **Performance**
   - Verify agent checks don't slow down app
   - Verify real-time status updates don't cause lag

---

## ✅ AUTOMATED CHECKS

- [ ] TypeScript compilation: `npm run build`
- [ ] Linter: `npm run lint` (if available)
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] No runtime errors

---

## 📋 MANUAL TESTING PRIORITY

### High Priority (Must Test)

1. ✅ Evening Protocol creation and completion
2. ✅ Declaration status updates in Finish Mode
3. ✅ Declaration completion from Finish Mode
4. ✅ Agent check integration with Finish Mode

### Medium Priority (Should Test)

5. Real-time status updates
6. Agent penalty application
7. Time window edge cases

### Low Priority (Nice to Have)

8. Protocol templates
9. Declaration history
10. Agent configuration UI

---

**Status:** Ready for Testing  
**Next Step:** Run manual tests starting with High Priority scenarios
