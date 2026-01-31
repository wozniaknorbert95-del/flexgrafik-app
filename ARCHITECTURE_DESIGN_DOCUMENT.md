# ARCHITECTURE DESIGN DOCUMENT: Evening Protocol & Declaration System

**Version:** 1.0  
**Date:** 2026-01-26  
**Status:** Design Phase  
**Author:** System Architect

---

## EXECUTIVE SUMMARY

This document outlines a professional, enterprise-grade architecture for implementing the Evening Protocol and Declaration System - a core feature transformation that shifts the application from reactive task management to proactive, commitment-based workflow management.

**Key Transformation:**

- From: "What should I focus on today?" (reactive recommendations)
- To: "What did I commit to yesterday?" (proactive accountability)

**Business Value:**

- Increased completion rate through commitment psychology
- Reduced decision fatigue via evening planning
- Enhanced accountability through automated agent monitoring
- Better alignment with ADHD brain patterns (evening planning, morning execution)

---

## 1. ARCHITECTURAL ANALYSIS

### 1.1 Current Architecture Assessment

#### **State Management Pattern:**

- **Current:** Centralized Context API (`AppContext.tsx`)
- **Pattern:** Single Source of Truth with functional updates
- **Strengths:**
  - ✅ Immutable updates via `setData((prev) => ...)`
  - ✅ Debounced persistence (1s debounce)
  - ✅ Progressive enhancement (IndexedDB → localStorage)
  - ✅ Migration system in place
- **Weaknesses:**
  - ⚠️ Large context (50+ hooks, potential performance issues)
  - ⚠️ Mixed concerns (UI state + business logic)
  - ⚠️ No separation of read/write operations

#### **Data Model:**

- **Current:** `AppData` interface with nested structures
- **Pattern:** Denormalized, document-like structure
- **Strengths:**
  - ✅ Simple to work with
  - ✅ Backward compatible migrations
- **Weaknesses:**
  - ⚠️ No versioning strategy for new features
  - ⚠️ No schema validation layer
  - ⚠️ Potential for data inconsistency

#### **Persistence Layer:**

- **Current:** `storageManager.ts` with IndexedDB + localStorage fallback
- **Pattern:** Progressive enhancement with migration support
- **Strengths:**
  - ✅ Robust fallback strategy
  - ✅ Migration system (`migrateData.ts`)
- **Weaknesses:**
  - ⚠️ No transaction support for complex operations
  - ⚠️ No conflict resolution strategy
  - ⚠️ No backup/restore UI

### 1.2 Architectural Patterns to Apply

#### **1. Domain-Driven Design (DDD)**

- **Bounded Contexts:**
  - `ProtocolContext` - Evening protocol domain
  - `DeclarationContext` - Declaration lifecycle
  - `AgentContext` - Goal agent monitoring
- **Aggregates:**
  - `EveningProtocol` (root aggregate)
  - `Declaration` (child entity)
  - `GoalAgent` (separate aggregate)

#### **2. Command Query Responsibility Segregation (CQRS)**

- **Commands:** Write operations (create protocol, update declaration)
- **Queries:** Read operations (get today's declarations, check status)
- **Benefits:**
  - Clear separation of concerns
  - Optimized read paths
  - Easier to add caching/optimization

#### **3. Event Sourcing (Partial)**

- **Events:**
  - `ProtocolCreated`
  - `DeclarationStatusChanged`
  - `PenaltyApplied`
- **Benefits:**
  - Audit trail
  - Time-travel debugging
  - Agent decision transparency

#### **4. Repository Pattern**

- **Abstraction:** `IProtocolRepository`, `IDeclarationRepository`
- **Benefits:**
  - Testability
  - Storage abstraction
  - Easy to swap implementations

---

## 2. DATA MODEL DESIGN

### 2.1 Core Domain Models

```typescript
// ============================================================================
// EVENING PROTOCOL DOMAIN
// ============================================================================

/**
 * Evening Protocol - Root Aggregate
 *
 * Represents a user's evening planning session for the next day.
 * Immutable once completed (append-only pattern for audit).
 */
export interface EveningProtocol {
  /** Unique identifier (UUID v4) */
  id: string;

  /** ISO date string (date the protocol is FOR, not when created) */
  targetDate: string;

  /** ISO timestamp when protocol was created */
  createdAt: string;

  /** ISO timestamp when protocol was completed */
  completedAt: string | null;

  /** Protocol completion status */
  status: 'draft' | 'completed' | 'archived';

  /** Declarations made in this protocol */
  declarations: Declaration[];

  /** Implementation intentions (min 3 required) */
  implementationIntentions: ImplementationIntention[];

  /** Rules created/updated in this protocol (min 1 required) */
  rules: CustomRule[];

  /** Metadata for agent processing */
  metadata: {
    version: number; // Schema version for migrations
    goalIds: number[]; // Goals referenced in declarations
    totalDeclarations: number;
  };
}

/**
 * Declaration - Entity within Protocol Aggregate
 *
 * Represents a commitment to work on a specific task during declared time window.
 */
export interface Declaration {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Reference to parent protocol */
  protocolId: string;

  /** Task being declared */
  taskId: number;

  /** Goal the task belongs to */
  goalId: number;

  /** Done Criteria defined for this declaration (may differ from task default) */
  doneCriteria: DoneCriterion[];

  /** Declared time window */
  timeWindow: {
    start: string; // "09:00" (HH:mm format)
    end: string; // "12:00" (HH:mm format)
    timezone?: string; // Optional, defaults to user's timezone
  };

  /** Declaration lifecycle status */
  status: DeclarationStatus;

  /** Timestamps */
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;

  /** Agent evaluation */
  agentEvaluation: {
    checkedAt: string | null;
    penaltyPoints: number;
    reason: string | null;
    severity: 'none' | 'minor' | 'major' | 'critical';
  };

  /** User notes (optional) */
  notes?: string;
}

/**
 * Declaration Status - State Machine
 */
export type DeclarationStatus =
  | 'pending' // Before declared start time
  | 'active' // Within declared time window
  | 'in_progress' // Finish Mode session started
  | 'completed' // Task completed within time window
  | 'failed' // Time window passed without completion
  | 'cancelled'; // User explicitly cancelled

/**
 * Done Criterion - Enhanced for Protocol
 */
export interface DoneCriterion {
  id: string;
  text: string;
  completed: boolean;
  completedAt: string | null;
  /** Protocol-specific: may override task default */
  isProtocolOverride: boolean;
}

/**
 * Implementation Intention - Enhanced for Protocol
 */
export interface ImplementationIntention {
  id: string;
  trigger: string;
  action: string;
  active: boolean;
  /** Protocol context */
  protocolId: string;
  goalId: number;
  taskId: number | null; // null = goal-level intention
  createdAt: string;
  lastTriggered: string | null;
}

// ============================================================================
// GOAL AGENT DOMAIN
// ============================================================================

/**
 * Goal Agent - Separate Aggregate
 *
 * Autonomous agent that monitors declarations and enforces accountability.
 * Each active goal has one agent instance.
 */
export interface GoalAgent {
  /** Goal this agent monitors */
  goalId: number;

  /** Agent configuration */
  config: {
    checkIntervalMinutes: number; // Default: 15
    penaltyPointsPerFailure: number; // Default: 5
    severityThresholds: {
      minor: number; // 1-2 failures
      major: number; // 3-5 failures
      critical: number; // 6+ failures
    };
    enabled: boolean;
  };

  /** Agent state */
  state: {
    lastCheckAt: string;
    totalPenaltiesApplied: number;
    consecutiveFailures: number;
    status: 'active' | 'paused' | 'disabled';
  };

  /** Monitoring history (last 30 days) */
  history: AgentCheckRecord[];
}

/**
 * Agent Check Record
 */
export interface AgentCheckRecord {
  timestamp: string;
  declarationsChecked: number;
  failuresDetected: number;
  penaltiesApplied: number;
  actions: AgentAction[];
}

/**
 * Agent Action
 */
export interface AgentAction {
  type: 'penalty' | 'notification' | 'reward_block';
  declarationId: string;
  points: number;
  reason: string;
  timestamp: string;
}
```

### 2.2 Data Migration Strategy

#### **Versioning Schema:**

```typescript
interface AppData {
  // ... existing fields
  schemaVersion: number; // Current: 1, New: 2
  eveningProtocols: EveningProtocol[];
  declarations: Declaration[]; // Denormalized for queries
  goalAgents: Record<number, GoalAgent>;
}
```

#### **Migration Path:**

1. **Phase 1:** Add new fields as optional (backward compatible)
2. **Phase 2:** Migrate existing data to new structure
3. **Phase 3:** Remove old fields (after validation period)

#### **Migration Function:**

```typescript
export function migrateToV2(data: AppDataV1): AppDataV2 {
  return {
    ...data,
    schemaVersion: 2,
    eveningProtocols: [],
    declarations: [],
    goalAgents: data.pillars
      .filter((p) => p.activation === 'active')
      .reduce(
        (acc, p) => {
          acc[p.id] = createDefaultAgent(p.id);
          return acc;
        },
        {} as Record<number, GoalAgent>
      ),
  };
}
```

---

## 3. ARCHITECTURE LAYERS

### 3.1 Presentation Layer

#### **Component Structure:**

```
components/
  evening-protocol/
    EveningProtocolPremium.tsx      # Main protocol screen
    ProtocolTaskSelector.tsx         # Task selection (only active goals)
    ProtocolDoneCriteriaEditor.tsx   # Done criteria per task
    ProtocolIntentionsForm.tsx       # Implementation intentions (min 3)
    ProtocolRulesWizard.tsx          # Simplified rules creation
    ProtocolSummary.tsx              # Review before completion
  declarations/
    DeclarationCard.tsx              # Individual declaration display
    DeclarationStatusBadge.tsx       # Status visualization
    DeclarationTimeline.tsx          # Time-based view
  dashboard/
    DeclarationsSection.tsx          # Replaces "Today's Focus"
    DeclarationQuickActions.tsx     # Start/Reschedule/Mark done
```

#### **State Management:**

- **Local State:** UI-only state (form inputs, modals)
- **Context State:** Shared UI state (current protocol, selected declaration)
- **Business State:** All in AppContext (single source of truth)

### 3.2 Application Layer

#### **Use Cases (Commands):**

```typescript
// Protocol Use Cases
interface IProtocolService {
  createProtocol(targetDate: string): Promise<EveningProtocol>;
  addDeclaration(protocolId: string, declaration: Omit<Declaration, 'id'>): Promise<Declaration>;
  completeProtocol(protocolId: string): Promise<void>;
  getProtocolForDate(date: string): Promise<EveningProtocol | null>;
}

// Declaration Use Cases
interface IDeclarationService {
  updateStatus(declarationId: string, status: DeclarationStatus): Promise<void>;
  startFinishSession(declarationId: string): Promise<void>;
  markCompleted(declarationId: string): Promise<void>;
  applyPenalty(declarationId: string, points: number): Promise<void>;
}

// Agent Use Cases
interface IAgentService {
  checkDeclarations(goalId: number): Promise<AgentCheckRecord>;
  applyPenalty(goalId: number, declarationId: string, points: number): Promise<void>;
  pauseAgent(goalId: number): Promise<void>;
  resumeAgent(goalId: number): Promise<void>;
}
```

#### **Query Services:**

```typescript
interface IDeclarationQueryService {
  getTodaysDeclarations(): Declaration[];
  getDeclarationsByStatus(status: DeclarationStatus): Declaration[];
  getDeclarationsByGoal(goalId: number): Declaration[];
  getDeclarationStatus(declarationId: string): DeclarationStatus;
  getUpcomingDeclarations(minutes: number): Declaration[];
}
```

### 3.3 Domain Layer

#### **Domain Services:**

```typescript
/**
 * Declaration Status Calculator
 * Pure function, no side effects
 */
export class DeclarationStatusCalculator {
  static calculate(
    declaration: Declaration,
    currentTime: Date,
    finishSessionActive: boolean
  ): DeclarationStatus {
    const { timeWindow } = declaration;
    const now = currentTime;
    const start = parseTime(timeWindow.start);
    const end = parseTime(timeWindow.end);

    if (declaration.status === 'cancelled') return 'cancelled';
    if (declaration.completedAt) return 'completed';
    if (declaration.failedAt) return 'failed';

    if (now < start) return 'pending';
    if (now >= start && now <= end) {
      return finishSessionActive ? 'in_progress' : 'active';
    }
    if (now > end) return 'failed';

    return declaration.status;
  }
}

/**
 * Penalty Calculator
 * Domain logic for penalty calculation
 */
export class PenaltyCalculator {
  static calculate(declaration: Declaration, agentConfig: GoalAgent['config']): number {
    if (declaration.status !== 'failed') return 0;

    const severity = this.getSeverity(declaration, agentConfig);
    const basePoints = agentConfig.penaltyPointsPerFailure;

    switch (severity) {
      case 'minor':
        return basePoints;
      case 'major':
        return basePoints * 2;
      case 'critical':
        return basePoints * 3;
      default:
        return 0;
    }
  }

  private static getSeverity(
    declaration: Declaration,
    config: GoalAgent['config']
  ): 'minor' | 'major' | 'critical' {
    const failures = declaration.agentEvaluation.consecutiveFailures || 0;
    if (failures >= config.severityThresholds.critical) return 'critical';
    if (failures >= config.severityThresholds.major) return 'major';
    return 'minor';
  }
}
```

### 3.4 Infrastructure Layer

#### **Repository Implementation:**

```typescript
/**
 * Protocol Repository
 * Handles persistence and retrieval
 */
export class ProtocolRepository implements IProtocolRepository {
  constructor(
    private storage: IStorageAdapter,
    private migrationService: IMigrationService
  ) {}

  async save(protocol: EveningProtocol): Promise<void> {
    // Validate schema version
    await this.migrationService.ensureCompatible(protocol);

    // Save with transaction
    await this.storage.transaction(async (tx) => {
      await tx.save('protocols', protocol);
      // Denormalize declarations for queries
      for (const declaration of protocol.declarations) {
        await tx.save('declarations', declaration);
      }
    });
  }

  async findByDate(date: string): Promise<EveningProtocol | null> {
    const protocols = await this.storage.query('protocols', {
      targetDate: date,
      status: { $ne: 'archived' },
    });
    return protocols[0] || null;
  }
}
```

#### **Storage Adapter:**

```typescript
interface IStorageAdapter {
  transaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T>;
  save(collection: string, entity: any): Promise<void>;
  query(collection: string, filter: any): Promise<any[]>;
  delete(collection: string, id: string): Promise<void>;
}

// IndexedDB implementation
export class IndexedDBStorageAdapter implements IStorageAdapter {
  // Implementation with proper transaction handling
}
```

---

## 4. IMPLEMENTATION STRATEGY

### 4.1 Phased Rollout

#### **Phase 1: Foundation (Week 1)**

**Goal:** Establish data model and infrastructure

1. **Data Model Implementation**
   - [ ] Add new types to `types.ts` (with backward compatibility)
   - [ ] Create migration function `migrateToV2()`
   - [ ] Add schema versioning to `AppData`
   - [ ] Write unit tests for migration

2. **Repository Layer**
   - [ ] Implement `IProtocolRepository`
   - [ ] Implement `IDeclarationRepository`
   - [ ] Create `IndexedDBStorageAdapter` with transaction support
   - [ ] Write integration tests

3. **Domain Services**
   - [ ] Implement `DeclarationStatusCalculator`
   - [ ] Implement `PenaltyCalculator`
   - [ ] Write unit tests (100% coverage)

**Deliverables:**

- ✅ Data model in production
- ✅ Migration tested on real data
- ✅ Repository layer tested

#### **Phase 2: Core Features (Week 2-3)**

**Goal:** Implement evening protocol workflow

1. **Evening Protocol UI**
   - [ ] `EveningProtocolPremium.tsx` - Main screen
   - [ ] `ProtocolTaskSelector.tsx` - Task selection (only active goals)
   - [ ] `ProtocolDoneCriteriaEditor.tsx` - Done criteria editor
   - [ ] `ProtocolIntentionsForm.tsx` - Implementation intentions (min 3 validation)
   - [ ] `ProtocolRulesWizard.tsx` - Simplified rules wizard
   - [ ] `ProtocolSummary.tsx` - Review screen

2. **Protocol Service**
   - [ ] `ProtocolService` implementation
   - [ ] Validation: min 3 intentions, min 1 rule
   - [ ] Integration with existing Rules system
   - [ ] Save/load protocol

3. **Dashboard Integration**
   - [ ] Replace "Today's Focus" with "Today's Declarations"
   - [ ] `DeclarationsSection.tsx` component
   - [ ] Status visualization
   - [ ] Quick actions (Start Finish Mode, Reschedule)

**Deliverables:**

- ✅ Evening protocol fully functional
- ✅ Dashboard shows declarations
- ✅ Integration tests passing

#### **Phase 3: Agent System (Week 4-5)**

**Goal:** Implement goal agent monitoring

1. **Agent Core**
   - [ ] `GoalAgent` domain model
   - [ ] `AgentService` implementation
   - [ ] Status calculation logic
   - [ ] Penalty application logic

2. **Agent Scheduler**
   - [ ] Background check every 15 minutes
   - [ ] Event-driven updates (on declaration status change)
   - [ ] Efficient querying (only check active declarations)

3. **Agent UI**
   - [ ] Agent status in Goal Detail
   - [ ] Penalty history
   - [ ] Agent configuration UI

**Deliverables:**

- ✅ Agents monitoring declarations
- ✅ Penalties applied automatically
- ✅ UI shows agent status

#### **Phase 4: Polish & Optimization (Week 6)**

**Goal:** Performance, UX, and edge cases

1. **Performance**
   - [ ] Optimize queries (indexes)
   - [ ] Memoization of status calculations
   - [ ] Lazy loading of protocol history

2. **UX Enhancements**
   - [ ] Smart defaults (AI suggestions)
   - [ ] Quick repeat yesterday's protocol
   - [ ] Visual timeline for declarations
   - [ ] Toast notifications for agent actions

3. **Edge Cases**
   - [ ] Timezone handling
   - [ ] Daylight saving time
   - [ ] Protocol for future dates
   - [ ] Cancelled declarations

**Deliverables:**

- ✅ Production-ready feature
- ✅ Performance benchmarks met
- ✅ All edge cases handled

### 4.2 Risk Mitigation

#### **Technical Risks:**

1. **Data Migration Failure**
   - **Risk:** Existing data corrupted during migration
   - **Mitigation:**
     - Backup before migration
     - Dry-run migration on test data
     - Rollback mechanism
     - Gradual rollout (10% → 50% → 100%)

2. **Performance Degradation**
   - **Risk:** Too many declarations/queries slow down app
   - **Mitigation:**
     - IndexedDB indexes on key fields
     - Pagination for protocol history
     - Debounced status calculations
     - Performance monitoring

3. **Agent Overhead**
   - **Risk:** Background checks consume resources
   - **Mitigation:**
     - Efficient queries (only active declarations)
     - Debounced checks (max 1 per minute)
     - Pause agents when app inactive
     - Web Worker for heavy calculations

#### **Product Risks:**

1. **User Confusion**
   - **Risk:** New flow too complex
   - **Mitigation:**
     - Onboarding tutorial
     - Progressive disclosure
     - Clear error messages
     - Fallback to old flow (feature flag)

2. **Adoption Resistance**
   - **Risk:** Users don't use evening protocol
   - **Mitigation:**
     - Reminder notifications (20:00)
     - Quick repeat yesterday
     - Show benefits (completion rate)
     - Make it optional initially

---

## 5. TESTING STRATEGY

### 5.1 Unit Tests

```typescript
// DeclarationStatusCalculator.test.ts
describe('DeclarationStatusCalculator', () => {
  it('should return pending before start time', () => {
    const declaration = createDeclaration({ start: '10:00', end: '12:00' });
    const now = new Date('2026-01-26T09:00:00');
    expect(DeclarationStatusCalculator.calculate(declaration, now, false)).toBe('pending');
  });

  it('should return active within time window', () => {
    const declaration = createDeclaration({ start: '10:00', end: '12:00' });
    const now = new Date('2026-01-26T11:00:00');
    expect(DeclarationStatusCalculator.calculate(declaration, now, false)).toBe('active');
  });

  // ... more test cases
});
```

### 5.2 Integration Tests

```typescript
// ProtocolService.integration.test.ts
describe('ProtocolService Integration', () => {
  it('should create and save protocol with declarations', async () => {
    const service = new ProtocolService(repository);
    const protocol = await service.createProtocol('2026-01-27');

    expect(protocol.id).toBeDefined();
    expect(protocol.status).toBe('draft');

    const saved = await repository.findByDate('2026-01-27');
    expect(saved).toEqual(protocol);
  });
});
```

### 5.3 E2E Tests

```typescript
// evening-protocol.e2e.test.ts
describe('Evening Protocol E2E', () => {
  it('should complete full protocol flow', async () => {
    // 1. Navigate to protocol
    await page.goto('/evening-protocol');

    // 2. Select tasks
    await page.click('[data-testid="task-selector"]');
    await page.click('[data-testid="task-1"]');

    // 3. Fill done criteria
    await page.fill('[data-testid="done-criteria-input"]', 'Test passes');

    // 4. Add implementation intentions (min 3)
    await addIntention('If I feel stuck', 'I will break it down');
    await addIntention('If I want to switch', 'I will check DONE first');
    await addIntention('If I finish early', 'I will review quality');

    // 5. Add rule (min 1)
    await addRule('Morning reminder', '09:00', 'voice');

    // 6. Complete protocol
    await page.click('[data-testid="complete-protocol"]');

    // 7. Verify protocol saved
    const protocol = await getProtocolForDate('2026-01-27');
    expect(protocol.status).toBe('completed');
    expect(protocol.declarations.length).toBeGreaterThan(0);
  });
});
```

### 5.4 Test Coverage Goals

- **Unit Tests:** 90%+ coverage for domain logic
- **Integration Tests:** All repository operations
- **E2E Tests:** Critical user flows
- **Performance Tests:** Status calculation < 10ms

---

## 6. PERFORMANCE CONSIDERATIONS

### 6.1 Query Optimization

```typescript
// IndexedDB Indexes
const indexes = [
  { collection: 'declarations', fields: ['protocolId', 'status'] },
  { collection: 'declarations', fields: ['goalId', 'status'] },
  { collection: 'declarations', fields: ['timeWindow.start', 'status'] },
  { collection: 'protocols', fields: ['targetDate', 'status'] },
];
```

### 6.2 Caching Strategy

```typescript
// Memoized status calculations
const declarationStatusCache = new Map<
  string,
  {
    status: DeclarationStatus;
    calculatedAt: number;
  }
>();

function getDeclarationStatus(declaration: Declaration): DeclarationStatus {
  const cached = declarationStatusCache.get(declaration.id);
  if (cached && Date.now() - cached.calculatedAt < 60000) {
    return cached.status;
  }

  const status = DeclarationStatusCalculator.calculate(declaration, new Date(), false);
  declarationStatusCache.set(declaration.id, {
    status,
    calculatedAt: Date.now(),
  });

  return status;
}
```

### 6.3 Lazy Loading

```typescript
// Protocol history pagination
const PROTOCOLS_PER_PAGE = 10;

async function loadProtocolHistory(page: number): Promise<EveningProtocol[]> {
  return repository.query('protocols', {
    status: 'completed',
    limit: PROTOCOLS_PER_PAGE,
    offset: page * PROTOCOLS_PER_PAGE,
    orderBy: 'targetDate',
    order: 'desc',
  });
}
```

---

## 7. SECURITY & DATA INTEGRITY

### 7.1 Validation Layer

```typescript
/**
 * Protocol Validator
 * Ensures data integrity before persistence
 */
export class ProtocolValidator {
  static validate(protocol: EveningProtocol): ValidationResult {
    const errors: string[] = [];

    // Min 3 implementation intentions
    if (protocol.implementationIntentions.length < 3) {
      errors.push('Minimum 3 implementation intentions required');
    }

    // Min 1 rule
    if (protocol.rules.length < 1) {
      errors.push('Minimum 1 rule required');
    }

    // All declarations must have time windows
    for (const declaration of protocol.declarations) {
      if (!declaration.timeWindow.start || !declaration.timeWindow.end) {
        errors.push(`Declaration ${declaration.id} missing time window`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
```

### 7.2 Transaction Safety

```typescript
// All protocol operations in transactions
async function completeProtocol(protocolId: string): Promise<void> {
  await storage.transaction(async (tx) => {
    const protocol = await tx.load('protocols', protocolId);

    // Validate
    const validation = ProtocolValidator.validate(protocol);
    if (!validation.isValid) {
      throw new Error(`Invalid protocol: ${validation.errors.join(', ')}`);
    }

    // Update protocol
    protocol.status = 'completed';
    protocol.completedAt = new Date().toISOString();

    // Create declarations (denormalized)
    for (const declaration of protocol.declarations) {
      await tx.save('declarations', declaration);
    }

    // Save protocol
    await tx.save('protocols', protocol);
  });
}
```

---

## 8. MONITORING & OBSERVABILITY

### 8.1 Metrics to Track

```typescript
interface ProtocolMetrics {
  // Adoption
  protocolsCreated: number;
  protocolsCompleted: number;
  completionRate: number; // completed / created

  // Usage
  averageDeclarationsPerProtocol: number;
  averageIntentionsPerProtocol: number;

  // Success
  declarationCompletionRate: number;
  averagePenaltyPoints: number;

  // Performance
  protocolCreationTime: number; // ms
  statusCalculationTime: number; // ms
  agentCheckTime: number; // ms
}
```

### 8.2 Error Tracking

```typescript
// Structured error logging
logger.error('Protocol creation failed', {
  userId: user.id,
  protocolId: protocol.id,
  error: error.message,
  stack: error.stack,
  context: {
    declarationsCount: protocol.declarations.length,
    intentionsCount: protocol.implementationIntentions.length,
  },
});
```

---

## 9. DEPLOYMENT STRATEGY

### 9.1 Feature Flags

```typescript
interface FeatureFlags {
  eveningProtocol: {
    enabled: boolean;
    rolloutPercentage: number; // 0-100
    requireOnboarding: boolean;
  };
  goalAgents: {
    enabled: boolean;
    checkIntervalMinutes: number;
  };
}
```

### 9.2 Gradual Rollout

1. **Week 1:** Internal testing (10% users)
2. **Week 2:** Beta users (50% users)
3. **Week 3:** Full rollout (100% users)
4. **Week 4:** Monitor metrics, fix issues

### 9.3 Rollback Plan

- Keep old "Today's Focus" behind feature flag
- Migration reversible (keep old data structure)
- Agent can be disabled per goal
- Protocol optional (users can skip)

---

## 10. DOCUMENTATION REQUIREMENTS

### 10.1 Code Documentation

- JSDoc for all public APIs
- Inline comments for complex logic
- Architecture decision records (ADRs)

### 10.2 User Documentation

- Evening Protocol guide
- Declaration system explanation
- Agent configuration guide
- Troubleshooting FAQ

---

## 11. SUCCESS METRICS

### 11.1 Technical Metrics

- ✅ Zero data loss during migration
- ✅ < 100ms protocol creation time
- ✅ < 10ms status calculation time
- ✅ 99.9% uptime for agent checks

### 11.2 Product Metrics

- ✅ 70%+ protocol completion rate
- ✅ 60%+ declaration completion rate
- ✅ 30% reduction in stuck tasks
- ✅ 20% increase in daily task completion

---

## 12. FUTURE ENHANCEMENTS

### 12.1 Phase 2 Features

- **AI Protocol Suggestions:** AI suggests tasks based on goal progress
- **Protocol Templates:** Save and reuse common protocol patterns
- **Collaborative Protocols:** Share protocols with accountability partner
- **Advanced Analytics:** Protocol effectiveness metrics

### 12.2 Integration Opportunities

- **Calendar Integration:** Sync declarations to calendar
- **Notification System:** Smart reminders based on declarations
- **Gamification:** Streaks, badges for protocol consistency

---

## APPENDIX A: DECISION LOG

### ADR-001: Event Sourcing vs. CRUD

**Decision:** Partial event sourcing (events for audit, CRUD for current state)
**Rationale:** Full event sourcing too complex for MVP, but events valuable for agent transparency

### ADR-002: Repository Pattern vs. Direct Storage

**Decision:** Repository pattern with storage adapter
**Rationale:** Testability, future storage backend support, clear separation

### ADR-003: Agent Frequency

**Decision:** 15-minute check interval
**Rationale:** Balance between responsiveness and performance

---

**Document Status:** Ready for Review  
**Next Steps:** Architecture review, implementation planning, team alignment
