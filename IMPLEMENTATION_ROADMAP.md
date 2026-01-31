# IMPLEMENTATION ROADMAP: Evening Protocol & Declaration System

**Version:** 1.0  
**Date:** 2026-01-26  
**Status:** Ready for Execution  
**Estimated Duration:** 6 weeks

---

## OVERVIEW

This roadmap provides a **professional, step-by-step implementation guide** for the Evening Protocol and Declaration System. Each phase includes:

- Specific tasks with acceptance criteria
- Code examples and patterns
- Testing requirements
- Risk mitigation
- Dependencies

---

## PHASE 1: FOUNDATION & DATA MODEL (Week 1)

### 1.1 Type System Enhancement

#### **Task 1.1.1: Add Core Types**

**File:** `types.ts`

```typescript
// Add to existing types.ts

// ============================================================================
// EVENING PROTOCOL DOMAIN
// ============================================================================

export interface EveningProtocol {
  id: string;
  targetDate: string; // ISO date (YYYY-MM-DD)
  createdAt: string; // ISO timestamp
  completedAt: string | null;
  status: 'draft' | 'completed' | 'archived';
  declarations: Declaration[];
  implementationIntentions: ProtocolImplementationIntention[];
  rules: CustomRule[]; // References to existing rules or new ones
  metadata: {
    version: number;
    goalIds: number[];
    totalDeclarations: number;
  };
}

export interface Declaration {
  id: string;
  protocolId: string;
  taskId: number;
  goalId: number;
  doneCriteria: DoneCriterion[];
  timeWindow: {
    start: string; // "09:00"
    end: string; // "12:00"
    timezone?: string;
  };
  status: DeclarationStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  agentEvaluation: {
    checkedAt: string | null;
    penaltyPoints: number;
    reason: string | null;
    severity: 'none' | 'minor' | 'major' | 'critical';
  };
  notes?: string;
}

export type DeclarationStatus =
  | 'pending'
  | 'active'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ProtocolImplementationIntention {
  id: string;
  trigger: string;
  action: string;
  active: boolean;
  protocolId: string;
  goalId: number;
  taskId: number | null;
  createdAt: string;
  lastTriggered: string | null;
}

export interface GoalAgent {
  goalId: number;
  config: {
    checkIntervalMinutes: number;
    penaltyPointsPerFailure: number;
    severityThresholds: {
      minor: number;
      major: number;
      critical: number;
    };
    enabled: boolean;
  };
  state: {
    lastCheckAt: string;
    totalPenaltiesApplied: number;
    consecutiveFailures: number;
    status: 'active' | 'paused' | 'disabled';
  };
  history: AgentCheckRecord[];
}

export interface AgentCheckRecord {
  timestamp: string;
  declarationsChecked: number;
  failuresDetected: number;
  penaltiesApplied: number;
  actions: AgentAction[];
}

export interface AgentAction {
  type: 'penalty' | 'notification' | 'reward_block';
  declarationId: string;
  points: number;
  reason: string;
  timestamp: string;
}
```

**Acceptance Criteria:**

- ✅ All types compile without errors
- ✅ Types are exported and importable
- ✅ JSDoc comments for all interfaces
- ✅ Backward compatible (optional fields where needed)

**Testing:**

```typescript
// types.test.ts
describe('Evening Protocol Types', () => {
  it('should create valid EveningProtocol', () => {
    const protocol: EveningProtocol = {
      id: 'test-id',
      targetDate: '2026-01-27',
      createdAt: new Date().toISOString(),
      completedAt: null,
      status: 'draft',
      declarations: [],
      implementationIntentions: [],
      rules: [],
      metadata: {
        version: 1,
        goalIds: [1],
        totalDeclarations: 0,
      },
    };
    expect(protocol.id).toBe('test-id');
  });
});
```

---

#### **Task 1.1.2: Extend AppData Interface**

**File:** `types.ts`

```typescript
export interface AppData {
  // ... existing fields
  schemaVersion?: number; // Add versioning
  eveningProtocols?: EveningProtocol[]; // New field
  declarations?: Declaration[]; // Denormalized for queries
  goalAgents?: Record<number, GoalAgent>; // Map goalId -> agent
}
```

**Acceptance Criteria:**

- ✅ Backward compatible (all new fields optional)
- ✅ Default values in `INITIAL_DATA`
- ✅ Migration function handles missing fields

---

### 1.2 Migration System

#### **Task 1.2.1: Create Migration Function**

**File:** `utils/migrateData.ts`

```typescript
/**
 * Migrate AppData from v1 to v2 (Evening Protocol support)
 */
export function migrateToV2(data: any): AppData {
  const v2: AppData = {
    ...data,
    schemaVersion: 2,
    eveningProtocols: data.eveningProtocols || [],
    declarations: data.declarations || [],
    goalAgents: data.goalAgents || createDefaultGoalAgents(data.pillars || []),
  };

  return v2;
}

function createDefaultGoalAgents(pillars: Pillar[]): Record<number, GoalAgent> {
  return pillars
    .filter((p) => (p.activation ?? 'active') === 'active')
    .reduce(
      (acc, p) => {
        acc[p.id] = createDefaultAgent(p.id);
        return acc;
      },
      {} as Record<number, GoalAgent>
    );
}

function createDefaultAgent(goalId: number): GoalAgent {
  return {
    goalId,
    config: {
      checkIntervalMinutes: 15,
      penaltyPointsPerFailure: 5,
      severityThresholds: {
        minor: 2,
        major: 5,
        critical: 6,
      },
      enabled: true,
    },
    state: {
      lastCheckAt: new Date().toISOString(),
      totalPenaltiesApplied: 0,
      consecutiveFailures: 0,
      status: 'active',
    },
    history: [],
  };
}
```

**Acceptance Criteria:**

- ✅ Migration is idempotent (safe to run multiple times)
- ✅ Preserves all existing data
- ✅ Creates default agents for active goals
- ✅ Unit tests with real data samples

**Testing:**

```typescript
// migrateData.test.ts
describe('migrateToV2', () => {
  it('should migrate v1 data to v2', () => {
    const v1Data = {
      /* old structure */
    };
    const v2Data = migrateToV2(v1Data);

    expect(v2Data.schemaVersion).toBe(2);
    expect(v2Data.eveningProtocols).toEqual([]);
    expect(v2Data.goalAgents).toBeDefined();
  });

  it('should be idempotent', () => {
    const v1Data = {
      /* old structure */
    };
    const v2Data1 = migrateToV2(v1Data);
    const v2Data2 = migrateToV2(v2Data1);

    expect(v2Data1).toEqual(v2Data2);
  });
});
```

---

#### **Task 1.2.2: Update Storage Manager**

**File:** `utils/storageManager.ts`

```typescript
export async function loadAppData(): Promise<AppData> {
  const raw = await loadFromStorage();

  // Check schema version and migrate if needed
  const currentVersion = raw?.schemaVersion || 1;
  if (currentVersion < 2) {
    console.log(`🔄 Migrating data from v${currentVersion} to v2`);
    const migrated = migrateToV2(raw);
    await saveAppData(migrated); // Save migrated data
    return migrated;
  }

  return raw || INITIAL_DATA;
}
```

**Acceptance Criteria:**

- ✅ Automatic migration on load
- ✅ Backup before migration
- ✅ Error handling with rollback
- ✅ Integration test with real IndexedDB

---

### 1.3 Domain Services

#### **Task 1.3.1: Declaration Status Calculator**

**File:** `utils/declarationStatusCalculator.ts`

```typescript
/**
 * Pure function to calculate declaration status
 * No side effects, fully testable
 */
export class DeclarationStatusCalculator {
  static calculate(
    declaration: Declaration,
    currentTime: Date = new Date(),
    finishSessionActive: boolean = false
  ): DeclarationStatus {
    // Handle terminal states
    if (declaration.status === 'cancelled') return 'cancelled';
    if (declaration.completedAt) return 'completed';
    if (declaration.failedAt) return 'failed';

    // Parse time window
    const start = this.parseTime(declaration.timeWindow.start);
    const end = this.parseTime(declaration.timeWindow.end);
    const now = this.getTimeOfDay(currentTime);

    // State machine logic
    if (now < start) return 'pending';
    if (now >= start && now <= end) {
      return finishSessionActive ? 'in_progress' : 'active';
    }
    if (now > end) return 'failed';

    return declaration.status;
  }

  private static parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes; // minutes since midnight
  }

  private static getTimeOfDay(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }
}
```

**Acceptance Criteria:**

- ✅ 100% test coverage
- ✅ Handles all edge cases (timezone, DST)
- ✅ Pure function (no side effects)
- ✅ Performance: < 1ms per calculation

**Testing:**

```typescript
// declarationStatusCalculator.test.ts
describe('DeclarationStatusCalculator', () => {
  it('should return pending before start time', () => {
    const declaration = createDeclaration({ start: '10:00', end: '12:00' });
    const now = new Date('2026-01-26T09:00:00');
    expect(DeclarationStatusCalculator.calculate(declaration, now)).toBe('pending');
  });

  it('should return active within time window', () => {
    const declaration = createDeclaration({ start: '10:00', end: '12:00' });
    const now = new Date('2026-01-26T11:00:00');
    expect(DeclarationStatusCalculator.calculate(declaration, now)).toBe('active');
  });

  it('should return in_progress when finish session active', () => {
    const declaration = createDeclaration({ start: '10:00', end: '12:00' });
    const now = new Date('2026-01-26T11:00:00');
    expect(DeclarationStatusCalculator.calculate(declaration, now, true)).toBe('in_progress');
  });

  it('should return failed after end time', () => {
    const declaration = createDeclaration({ start: '10:00', end: '12:00' });
    const now = new Date('2026-01-26T13:00:00');
    expect(DeclarationStatusCalculator.calculate(declaration, now)).toBe('failed');
  });

  // Edge cases
  it('should handle midnight crossover', () => {
    const declaration = createDeclaration({ start: '23:00', end: '01:00' });
    const now = new Date('2026-01-26T23:30:00');
    expect(DeclarationStatusCalculator.calculate(declaration, now)).toBe('active');
  });
});
```

---

#### **Task 1.3.2: Penalty Calculator**

**File:** `utils/penaltyCalculator.ts`

```typescript
export class PenaltyCalculator {
  static calculate(
    declaration: Declaration,
    agentConfig: GoalAgent['config'],
    consecutiveFailures: number
  ): {
    points: number;
    severity: 'none' | 'minor' | 'major' | 'critical';
    reason: string;
  } {
    if (declaration.status !== 'failed') {
      return { points: 0, severity: 'none', reason: 'Declaration not failed' };
    }

    const severity = this.determineSeverity(consecutiveFailures, agentConfig);
    const basePoints = agentConfig.penaltyPointsPerFailure;

    let points = 0;
    let reason = '';

    switch (severity) {
      case 'minor':
        points = basePoints;
        reason = `Minor failure: ${consecutiveFailures} consecutive failure(s)`;
        break;
      case 'major':
        points = basePoints * 2;
        reason = `Major failure: ${consecutiveFailures} consecutive failures`;
        break;
      case 'critical':
        points = basePoints * 3;
        reason = `Critical: ${consecutiveFailures} consecutive failures - pattern detected`;
        break;
    }

    return { points, severity, reason };
  }

  private static determineSeverity(
    failures: number,
    config: GoalAgent['config']
  ): 'minor' | 'major' | 'critical' {
    if (failures >= config.severityThresholds.critical) return 'critical';
    if (failures >= config.severityThresholds.major) return 'major';
    return 'minor';
  }
}
```

**Acceptance Criteria:**

- ✅ Calculates penalties correctly
- ✅ Respects agent configuration
- ✅ Provides clear reasons
- ✅ Unit tests for all severity levels

---

### 1.4 Repository Pattern

#### **Task 1.4.1: Protocol Repository Interface**

**File:** `repositories/IProtocolRepository.ts`

```typescript
export interface IProtocolRepository {
  save(protocol: EveningProtocol): Promise<void>;
  findById(id: string): Promise<EveningProtocol | null>;
  findByDate(date: string): Promise<EveningProtocol | null>;
  findByDateRange(startDate: string, endDate: string): Promise<EveningProtocol[]>;
  delete(id: string): Promise<void>;
  archive(id: string): Promise<void>;
}
```

#### **Task 1.4.2: Declaration Repository Interface**

**File:** `repositories/IDeclarationRepository.ts`

```typescript
export interface IDeclarationRepository {
  save(declaration: Declaration): Promise<void>;
  findById(id: string): Promise<Declaration | null>;
  findByProtocol(protocolId: string): Promise<Declaration[]>;
  findByGoal(goalId: number): Promise<Declaration[]>;
  findByStatus(status: DeclarationStatus): Promise<Declaration[]>;
  findByDate(date: string): Promise<Declaration[]>;
  updateStatus(id: string, status: DeclarationStatus): Promise<void>;
  getUpcoming(minutes: number): Promise<Declaration[]>;
}
```

#### **Task 1.4.3: IndexedDB Implementation**

**File:** `repositories/IndexedDBProtocolRepository.ts`

```typescript
export class IndexedDBProtocolRepository implements IProtocolRepository {
  private dbName = 'flexgrafik-db';
  private protocolStore = 'protocols';
  private declarationStore = 'declarations';

  async save(protocol: EveningProtocol): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction([this.protocolStore, this.declarationStore], 'readwrite');

    try {
      // Save protocol
      await tx.objectStore(this.protocolStore).put(protocol);

      // Denormalize declarations for queries
      for (const declaration of protocol.declarations) {
        await tx.objectStore(this.declarationStore).put(declaration);
      }

      await tx.complete;
    } catch (error) {
      tx.abort();
      throw error;
    }
  }

  async findByDate(date: string): Promise<EveningProtocol | null> {
    const db = await this.getDB();
    const index = db.transaction(this.protocolStore).store.index('targetDate');
    const protocols = await index.getAll(date);
    return protocols.find((p) => p.status !== 'archived') || null;
  }

  private async getDB(): Promise<IDBDatabase> {
    // Implementation using existing IndexedDB utilities
  }
}
```

**Acceptance Criteria:**

- ✅ Transaction support (all-or-nothing)
- ✅ Proper error handling
- ✅ Indexes for performance
- ✅ Integration tests with real IndexedDB

---

## PHASE 2: EVENING PROTOCOL UI (Week 2-3)

### 2.1 Component Architecture

#### **Task 2.1.1: Main Protocol Screen**

**File:** `components/evening-protocol/EveningProtocolPremium.tsx`

**Structure:**

```typescript
const EveningProtocolPremium: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { data, createProtocol, updateProtocol } = useAppContext();
  const [protocol, setProtocol] = useState<EveningProtocol | null>(null);
  const [step, setStep] = useState<'tasks' | 'criteria' | 'intentions' | 'rules' | 'review'>('tasks');

  // Load or create protocol for tomorrow
  useEffect(() => {
    const tomorrow = getTomorrowDate();
    loadOrCreateProtocol(tomorrow);
  }, []);

  return (
    <div className="min-h-screen pb-32 pt-8 px-6">
      {/* Header */}
      <ProtocolHeader onBack={onBack} targetDate={protocol?.targetDate} />

      {/* Progress Indicator */}
      <ProtocolProgressIndicator step={step} />

      {/* Step Content */}
      {step === 'tasks' && <ProtocolTaskSelector ... />}
      {step === 'criteria' && <ProtocolDoneCriteriaEditor ... />}
      {step === 'intentions' && <ProtocolIntentionsForm ... />}
      {step === 'rules' && <ProtocolRulesWizard ... />}
      {step === 'review' && <ProtocolSummary ... />}
    </div>
  );
};
```

**Acceptance Criteria:**

- ✅ Multi-step wizard flow
- ✅ Progress indicator
- ✅ Save draft on each step
- ✅ Validation before next step
- ✅ E2E test for full flow

---

#### **Task 2.1.2: Task Selector (Only Active Goals)**

**File:** `components/evening-protocol/ProtocolTaskSelector.tsx`

**Key Features:**

- Only show tasks from active goals (`activation === 'active'`)
- Filter out completed tasks (`progress < 100`)
- Multi-select with checkboxes
- Show task progress and goal context
- Validation: at least 1 task selected

**Code Pattern:**

```typescript
const ProtocolTaskSelector: React.FC<{
  selectedTasks: number[];
  onSelectionChange: (taskIds: number[]) => void;
}> = ({ selectedTasks, onSelectionChange }) => {
  const { data } = useAppContext();

  const availableTasks = useMemo(() => {
    return data.pillars
      .filter(p => (p.activation ?? 'active') === 'active')
      .flatMap(pillar =>
        pillar.tasks
          .filter(t => t.progress < 100 && t.status !== 'done')
          .map(task => ({ task, pillar }))
      );
  }, [data.pillars]);

  return (
    <div className="space-y-4">
      {availableTasks.map(({ task, pillar }) => (
        <TaskSelectionCard
          key={task.id}
          task={task}
          pillar={pillar}
          selected={selectedTasks.includes(task.id)}
          onToggle={() => {
            const newSelection = selectedTasks.includes(task.id)
              ? selectedTasks.filter(id => id !== task.id)
              : [...selectedTasks, task.id];
            onSelectionChange(newSelection);
          }}
        />
      ))}
    </div>
  );
};
```

**Acceptance Criteria:**

- ✅ Only active goals shown
- ✅ Incomplete tasks only
- ✅ Multi-select works
- ✅ Visual feedback for selection
- ✅ Unit test for filtering logic

---

#### **Task 2.1.3: Done Criteria Editor**

**File:** `components/evening-protocol/ProtocolDoneCriteriaEditor.tsx`

**Key Features:**

- Per-task done criteria editor
- Can override task default criteria
- Add/remove/edit criteria
- Mark criteria as completed
- Validation: at least 1 criterion per task

**Code Pattern:**

```typescript
const ProtocolDoneCriteriaEditor: React.FC<{
  declarations: Declaration[];
  onUpdate: (declarations: Declaration[]) => void;
}> = ({ declarations, onUpdate }) => {
  const updateCriteria = (declarationId: string, criteria: DoneCriterion[]) => {
    const updated = declarations.map(d =>
      d.id === declarationId
        ? { ...d, doneCriteria: criteria }
        : d
    );
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      {declarations.map(declaration => (
        <TaskCriteriaEditor
          key={declaration.id}
          declaration={declaration}
          onUpdate={(criteria) => updateCriteria(declaration.id, criteria)}
        />
      ))}
    </div>
  );
};
```

**Acceptance Criteria:**

- ✅ Per-task editing
- ✅ Override task defaults
- ✅ Add/remove criteria
- ✅ Validation
- ✅ Unit tests

---

#### **Task 2.1.4: Implementation Intentions Form**

**File:** `components/evening-protocol/ProtocolIntentionsForm.tsx`

**Key Features:**

- Minimum 3 intentions required
- Can add more (no max, but UI suggests 3-5)
- Each intention: trigger + action
- Can be goal-level or task-level
- Validation with clear error messages

**Code Pattern:**

```typescript
const ProtocolIntentionsForm: React.FC<{
  intentions: ProtocolImplementationIntention[];
  onUpdate: (intentions: ProtocolImplementationIntention[]) => void;
}> = ({ intentions, onUpdate }) => {
  const MIN_INTENTIONS = 3;
  const [errors, setErrors] = useState<string[]>([]);

  const validate = () => {
    const newErrors: string[] = [];
    if (intentions.length < MIN_INTENTIONS) {
      newErrors.push(`Minimum ${MIN_INTENTIONS} implementation intentions required`);
    }
    // ... more validation
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  return (
    <div>
      {errors.length > 0 && (
        <ErrorBanner errors={errors} />
      )}
      <IntentionList
        intentions={intentions}
        onAdd={addIntention}
        onRemove={removeIntention}
        onUpdate={updateIntention}
      />
      <ValidationHint
        current={intentions.length}
        minimum={MIN_INTENTIONS}
      />
    </div>
  );
};
```

**Acceptance Criteria:**

- ✅ Min 3 validation
- ✅ Add/remove/edit intentions
- ✅ Clear error messages
- ✅ Goal-level and task-level support
- ✅ Unit tests

---

#### **Task 2.1.5: Rules Wizard (Simplified)**

**File:** `components/evening-protocol/ProtocolRulesWizard.tsx`

**Key Innovation:** Step-by-step wizard instead of complex form

**Wizard Steps:**

1. **Trigger Selection:** Time-based or Data-based
2. **Condition Setup:**
   - Time: Simple time picker
   - Data: Visual condition builder (no eval for user)
3. **Action Selection:** Voice / Notification / Block
4. **Message:** Text input
5. **Review:** Summary before adding

**Code Pattern:**

```typescript
const ProtocolRulesWizard: React.FC<{
  rules: CustomRule[];
  onUpdate: (rules: CustomRule[]) => void;
}> = ({ rules, onUpdate }) => {
  const [wizardStep, setWizardStep] = useState<'trigger' | 'condition' | 'action' | 'message' | 'review'>('trigger');
  const [newRule, setNewRule] = useState<Partial<CustomRule>>({});

  const handleTriggerSelect = (trigger: 'time' | 'data') => {
    setNewRule({ ...newRule, trigger });
    setWizardStep('condition');
  };

  const handleConditionSet = (condition: string) => {
    setNewRule({ ...newRule, condition });
    setWizardStep('action');
  };

  // ... more handlers

  return (
    <WizardContainer>
      {wizardStep === 'trigger' && (
        <TriggerSelector onSelect={handleTriggerSelect} />
      )}
      {wizardStep === 'condition' && (
        <ConditionBuilder
          trigger={newRule.trigger}
          onComplete={handleConditionSet}
        />
      )}
      {/* ... more steps */}
    </WizardContainer>
  );
};
```

**Condition Builder (Visual, No Eval):**

```typescript
const ConditionBuilder: React.FC<{
  trigger: 'time' | 'data';
  onComplete: (condition: string) => void;
}> = ({ trigger, onComplete }) => {
  if (trigger === 'time') {
    return <TimePicker onSelect={(time) => onComplete(time)} />;
  }

  // Data trigger: Visual builder
  return (
    <VisualConditionBuilder
      options={[
        { label: 'Stuck tasks count', value: 'stuckTasks.length' },
        { label: 'Goal completion', value: 'goal.completion' },
        // ... more options
      ]}
      onBuild={(condition) => onComplete(condition)}
    />
  );
};
```

**Acceptance Criteria:**

- ✅ Wizard flow works smoothly
- ✅ No eval() in user-facing code
- ✅ Visual condition builder
- ✅ Min 1 rule validation
- ✅ Integration with existing Rules system
- ✅ E2E test

---

### 2.2 Service Layer

#### **Task 2.2.1: Protocol Service**

**File:** `services/ProtocolService.ts`

```typescript
export class ProtocolService {
  constructor(
    private repository: IProtocolRepository,
    private validator: IProtocolValidator
  ) {}

  async createProtocol(targetDate: string): Promise<EveningProtocol> {
    // Check if protocol already exists
    const existing = await this.repository.findByDate(targetDate);
    if (existing && existing.status !== 'archived') {
      throw new Error(`Protocol for ${targetDate} already exists`);
    }

    const protocol: EveningProtocol = {
      id: generateUUID(),
      targetDate,
      createdAt: new Date().toISOString(),
      completedAt: null,
      status: 'draft',
      declarations: [],
      implementationIntentions: [],
      rules: [],
      metadata: {
        version: 1,
        goalIds: [],
        totalDeclarations: 0,
      },
    };

    await this.repository.save(protocol);
    return protocol;
  }

  async addDeclaration(
    protocolId: string,
    taskId: number,
    goalId: number,
    timeWindow: { start: string; end: string },
    doneCriteria: DoneCriterion[]
  ): Promise<Declaration> {
    const protocol = await this.repository.findById(protocolId);
    if (!protocol) throw new Error('Protocol not found');

    const declaration: Declaration = {
      id: generateUUID(),
      protocolId,
      taskId,
      goalId,
      doneCriteria,
      timeWindow,
      status: 'pending',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      failedAt: null,
      agentEvaluation: {
        checkedAt: null,
        penaltyPoints: 0,
        reason: null,
        severity: 'none',
      },
    };

    protocol.declarations.push(declaration);
    protocol.metadata.totalDeclarations = protocol.declarations.length;
    protocol.metadata.goalIds = [...new Set(protocol.declarations.map((d) => d.goalId))];

    await this.repository.save(protocol);
    return declaration;
  }

  async completeProtocol(protocolId: string): Promise<void> {
    const protocol = await this.repository.findById(protocolId);
    if (!protocol) throw new Error('Protocol not found');

    // Validate
    const validation = this.validator.validate(protocol);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }

    protocol.status = 'completed';
    protocol.completedAt = new Date().toISOString();

    await this.repository.save(protocol);
  }
}
```

**Acceptance Criteria:**

- ✅ All operations use transactions
- ✅ Proper error handling
- ✅ Validation before completion
- ✅ Integration tests

---

## PHASE 3: DASHBOARD INTEGRATION (Week 3)

### 3.1 Replace "Today's Focus" with Declarations

#### **Task 3.1.1: Declarations Section Component**

**File:** `components/dashboard/DeclarationsSection.tsx`

**Key Features:**

- Show today's declarations from protocol
- Status badges (pending/active/in_progress/completed/failed)
- Timeline view (upcoming/active/past)
- Quick actions per declaration
- Empty state when no protocol

**Code Pattern:**

```typescript
const DeclarationsSection: React.FC = () => {
  const { data } = useAppContext();
  const today = getTodayDate();

  const todaysDeclarations = useMemo(() => {
    const protocol = data.eveningProtocols?.find(p => p.targetDate === today);
    return protocol?.declarations || [];
  }, [data.eveningProtocols, today]);

  const declarationsByStatus = useMemo(() => {
    return groupBy(todaysDeclarations, d =>
      DeclarationStatusCalculator.calculate(d, new Date(), false)
    );
  }, [todaysDeclarations]);

  if (todaysDeclarations.length === 0) {
    return <EmptyProtocolState />;
  }

  return (
    <div className="space-y-6">
      {/* Active Declarations */}
      {declarationsByStatus.active?.length > 0 && (
        <DeclarationGroup
          title="Active Now"
          declarations={declarationsByStatus.active}
          status="active"
        />
      )}

      {/* Upcoming */}
      {declarationsByStatus.pending?.length > 0 && (
        <DeclarationGroup
          title="Upcoming"
          declarations={declarationsByStatus.pending}
          status="pending"
        />
      )}

      {/* Completed */}
      {declarationsByStatus.completed?.length > 0 && (
        <DeclarationGroup
          title="Completed"
          declarations={declarationsByStatus.completed}
          status="completed"
        />
      )}

      {/* Failed */}
      {declarationsByStatus.failed?.length > 0 && (
        <DeclarationGroup
          title="Missed"
          declarations={declarationsByStatus.failed}
          status="failed"
        />
      )}
    </div>
  );
};
```

**Acceptance Criteria:**

- ✅ Shows today's declarations
- ✅ Groups by status
- ✅ Real-time status updates
- ✅ Empty state handled
- ✅ Unit tests

---

#### **Task 3.1.2: Declaration Card Component**

**File:** `components/dashboard/DeclarationCard.tsx`

**Key Features:**

- Task name and goal context
- Time window display
- Status badge with color coding
- Quick actions (Start Finish Mode, Reschedule, Mark Done)
- Progress indicator (if in progress)

**Code Pattern:**

```typescript
const DeclarationCard: React.FC<{
  declaration: Declaration;
  task: Task;
  goal: Pillar;
  onStartFinishMode: () => void;
  onReschedule: () => void;
  onMarkDone: () => void;
}> = ({ declaration, task, goal, onStartFinishMode, onReschedule, onMarkDone }) => {
  const status = DeclarationStatusCalculator.calculate(declaration, new Date(), false);

  return (
    <div className="glass-card space-widget">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{task.name}</h3>
          <p className="text-sm text-gray-400">📍 {goal.name}</p>

          <div className="mt-3 flex items-center gap-3">
            <TimeWindowDisplay timeWindow={declaration.timeWindow} />
            <StatusBadge status={status} />
          </div>

          {declaration.doneCriteria.length > 0 && (
            <DoneCriteriaPreview criteria={declaration.doneCriteria} />
          )}
        </div>

        <QuickActions
          status={status}
          onStartFinishMode={onStartFinishMode}
          onReschedule={onReschedule}
          onMarkDone={onMarkDone}
        />
      </div>
    </div>
  );
};
```

**Acceptance Criteria:**

- ✅ All information displayed
- ✅ Actions context-aware
- ✅ Visual feedback
- ✅ Accessibility (ARIA labels)
- ✅ Unit tests

---

#### **Task 3.1.3: Remove Old "Today's Focus"**

**File:** `components/DashboardPremium.tsx`

**Changes:**

- Remove `todaysFocus` calculation
- Remove "Na czym dziś się skupić?" section
- Replace with `<DeclarationsSection />`
- Keep "DOMKNIJ TERAZ" button but link to first active declaration

**Acceptance Criteria:**

- ✅ Old section removed
- ✅ New section integrated
- ✅ No broken references
- ✅ E2E test

---

## PHASE 4: GOAL AGENT SYSTEM (Week 4-5)

### 4.1 Agent Core

#### **Task 4.1.1: Agent Service**

**File:** `services/AgentService.ts`

```typescript
export class AgentService {
  constructor(
    private declarationRepo: IDeclarationRepository,
    private goalAgentRepo: IGoalAgentRepository,
    private rewardService: IRewardService
  ) {}

  async checkDeclarations(goalId: number): Promise<AgentCheckRecord> {
    const agent = await this.goalAgentRepo.findByGoal(goalId);
    if (!agent || !agent.config.enabled) {
      return this.createEmptyRecord();
    }

    const declarations = await this.declarationRepo.findByGoal(goalId);
    const activeDeclarations = declarations.filter((d) =>
      ['pending', 'active', 'in_progress'].includes(d.status)
    );

    const failures: Declaration[] = [];
    const actions: AgentAction[] = [];

    for (const declaration of activeDeclarations) {
      const currentStatus = DeclarationStatusCalculator.calculate(declaration, new Date(), false);

      // If status changed to failed, apply penalty
      if (currentStatus === 'failed' && declaration.status !== 'failed') {
        const penalty = PenaltyCalculator.calculate(
          declaration,
          agent.config,
          agent.state.consecutiveFailures
        );

        if (penalty.points > 0) {
          await this.applyPenalty(goalId, declaration.id, penalty);
          actions.push({
            type: 'penalty',
            declarationId: declaration.id,
            points: penalty.points,
            reason: penalty.reason,
            timestamp: new Date().toISOString(),
          });

          failures.push(declaration);
        }
      }
    }

    // Update agent state
    agent.state.lastCheckAt = new Date().toISOString();
    agent.state.consecutiveFailures = failures.length;
    agent.state.totalPenaltiesApplied += actions.reduce((sum, a) => sum + a.points, 0);

    // Add to history
    const record: AgentCheckRecord = {
      timestamp: new Date().toISOString(),
      declarationsChecked: activeDeclarations.length,
      failuresDetected: failures.length,
      penaltiesApplied: actions.reduce((sum, a) => sum + a.points, 0),
      actions,
    };

    agent.history.push(record);
    // Keep only last 30 days
    agent.history = agent.history.slice(-30);

    await this.goalAgentRepo.save(agent);

    return record;
  }

  private async applyPenalty(
    goalId: number,
    declarationId: string,
    penalty: { points: number; severity: string; reason: string }
  ): Promise<void> {
    // Update declaration
    const declaration = await this.declarationRepo.findById(declarationId);
    if (declaration) {
      declaration.agentEvaluation = {
        checkedAt: new Date().toISOString(),
        penaltyPoints: penalty.points,
        reason: penalty.reason,
        severity: penalty.severity as any,
      };
      await this.declarationRepo.save(declaration);
    }

    // Apply to reward system
    await this.rewardService.applyPenalty(goalId, penalty.points);
  }
}
```

**Acceptance Criteria:**

- ✅ Checks declarations correctly
- ✅ Applies penalties
- ✅ Updates agent state
- ✅ Maintains history
- ✅ Integration tests

---

#### **Task 4.1.2: Agent Scheduler**

**File:** `utils/agentScheduler.ts`

```typescript
class AgentScheduler {
  private intervals: Map<number, NodeJS.Timeout> = new Map();

  start(goalId: number, checkIntervalMinutes: number): void {
    this.stop(goalId); // Clear existing

    const interval = setInterval(
      async () => {
        try {
          await agentService.checkDeclarations(goalId);
        } catch (error) {
          console.error(`Agent check failed for goal ${goalId}:`, error);
        }
      },
      checkIntervalMinutes * 60 * 1000
    );

    this.intervals.set(goalId, interval);
  }

  stop(goalId: number): void {
    const interval = this.intervals.get(goalId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(goalId);
    }
  }

  startAll(agents: GoalAgent[]): void {
    for (const agent of agents) {
      if (agent.config.enabled && agent.state.status === 'active') {
        this.start(agent.goalId, agent.config.checkIntervalMinutes);
      }
    }
  }
}

export const agentScheduler = new AgentScheduler();
```

**Integration in AppContext:**

```typescript
// In AppContext.tsx
useEffect(() => {
  if (isLoaded && data.goalAgents) {
    const agents = Object.values(data.goalAgents);
    agentScheduler.startAll(agents);

    return () => {
      agents.forEach((agent) => agentScheduler.stop(agent.goalId));
    };
  }
}, [isLoaded, data.goalAgents]);
```

**Acceptance Criteria:**

- ✅ Schedules checks correctly
- ✅ Respects agent config
- ✅ Cleans up on unmount
- ✅ Error handling
- ✅ Unit tests

---

## PHASE 5: REMOVAL OF OLD FEATURES (Week 5)

### 5.1 Remove Timer

#### **Task 5.1.1: Remove Timer Component**

**Files to modify:**

- `components/TimerPremium.tsx` - DELETE
- `components/RouteManager.tsx` - Remove 'timer' case
- `components/Navigation.tsx` - Remove from secondaryItems
- `types.ts` - Remove 'timer' from ViewState

**Acceptance Criteria:**

- ✅ All references removed
- ✅ No broken imports
- ✅ Build passes
- ✅ E2E tests updated

---

### 5.2 Move Statistics to Accountability

#### **Task 5.2.1: Extract Statistics from Dashboard**

**File:** `components/DashboardPremium.tsx`

**Remove:**

- Statistics calculation
- Statistics display section

**Add to:**

- `components/RouteManager.tsx` - Expand 'accountability' view

**Acceptance Criteria:**

- ✅ Statistics moved
- ✅ Dashboard cleaner
- ✅ Accountability shows all stats
- ✅ No data loss

---

## PHASE 6: POLISH & OPTIMIZATION (Week 6)

### 6.1 Performance

- IndexedDB indexes
- Memoization
- Lazy loading
- Code splitting

### 6.2 UX Enhancements

- Smart defaults (AI suggestions)
- Quick repeat yesterday
- Visual timeline
- Toast notifications

### 6.3 Edge Cases

- Timezone handling
- DST transitions
- Future protocols
- Cancelled declarations

---

## TESTING STRATEGY

### Unit Tests (90%+ coverage)

- Domain services
- Calculators
- Validators
- Utilities

### Integration Tests

- Repository operations
- Service layer
- Data migrations

### E2E Tests

- Full protocol flow
- Declaration lifecycle
- Agent checks
- Dashboard integration

---

## DEPLOYMENT CHECKLIST

- [ ] All tests passing
- [ ] Migration tested on production data
- [ ] Performance benchmarks met
- [ ] Feature flags configured
- [ ] Rollback plan ready
- [ ] Documentation complete
- [ ] User guide written

---

**Status:** Ready for Implementation  
**Next Step:** Team review, architecture approval, sprint planning
