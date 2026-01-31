# RULES WIZARD: Professional Design & Implementation

**Version:** 1.0  
**Date:** 2026-01-26  
**Status:** Design Complete

---

## PROBLEM STATEMENT

**Current State:**

- Rules require writing JavaScript-like conditions (e.g., `pillars.some(p => p.completion >= 90)`)
- Users must understand data structure
- High cognitive load for non-technical users
- Error-prone (eval() in background)

**Desired State:**

- Visual, step-by-step wizard
- No code writing required
- Guided condition building
- Safe, validated conditions

---

## SOLUTION: VISUAL WIZARD

### Architecture

```
RulesWizard (Container)
├── Step 1: Trigger Selection
│   ├── Time-based trigger
│   └── Data-based trigger
├── Step 2: Condition Builder
│   ├── TimePicker (for time trigger)
│   └── VisualConditionBuilder (for data trigger)
├── Step 3: Action Selection
│   ├── Voice
│   ├── Notification
│   └── Block Action
├── Step 4: Message Input
│   └── Text editor with validation
└── Step 5: Review & Save
    └── Summary with edit capability
```

---

## IMPLEMENTATION

### Step 1: Trigger Selection

```typescript
const TriggerSelector: React.FC<{
  onSelect: (trigger: 'time' | 'data') => void;
}> = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => onSelect('time')}
        className="glass-card space-widget text-center p-6 hover:scale-105"
      >
        <span className="text-4xl mb-2">⏰</span>
        <h3 className="font-bold text-white">Time-based</h3>
        <p className="text-sm text-gray-400">Trigger at specific time</p>
      </button>

      <button
        onClick={() => onSelect('data')}
        className="glass-card space-widget text-center p-6 hover:scale-105"
      >
        <span className="text-4xl mb-2">📊</span>
        <h3 className="font-bold text-white">Data-based</h3>
        <p className="text-sm text-gray-400">Trigger when condition is met</p>
      </button>
    </div>
  );
};
```

---

### Step 2: Condition Builder

#### **Time Condition (Simple):**

```typescript
const TimePicker: React.FC<{
  onComplete: (time: string) => void;
}> = ({ onComplete }) => {
  const [hours, setHours] = useState(9);
  const [minutes, setMinutes] = useState(0);

  return (
    <div className="space-y-4">
      <label className="block text-sm font-bold text-white">
        What time should this rule trigger?
      </label>

      <div className="flex items-center gap-4">
        <select
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="input-premium"
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
          ))}
        </select>
        <span className="text-2xl">:</span>
        <select
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="input-premium"
        >
          {[0, 15, 30, 45].map(m => (
            <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => onComplete(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`)}
        className="btn-premium btn-cyan"
      >
        Continue →
      </button>
    </div>
  );
};
```

#### **Data Condition (Visual Builder):**

```typescript
interface ConditionTemplate {
  id: string;
  label: string;
  description: string;
  builder: React.ComponentType<{ onComplete: (condition: string) => void }>;
  example: string;
}

const CONDITION_TEMPLATES: ConditionTemplate[] = [
  {
    id: 'stuck_tasks',
    label: 'Stuck tasks detected',
    description: 'When tasks are stuck at 90%+ for X days',
    builder: StuckTasksConditionBuilder,
    example: 'pillars.some(p => p.completion >= 90 && (p.days_stuck || 0) > 3)',
  },
  {
    id: 'goal_completion',
    label: 'Goal completion',
    description: 'When a goal reaches X% completion',
    builder: GoalCompletionConditionBuilder,
    example: 'pillars.some(p => p.completion >= 80)',
  },
  {
    id: 'sprint_progress',
    label: 'Sprint progress',
    description: 'When sprint has X days remaining',
    builder: SprintProgressConditionBuilder,
    example: 'sprint.progress.filter(d => !d.checked).length <= 2',
  },
  // ... more templates
];

const VisualConditionBuilder: React.FC<{
  onComplete: (condition: string) => void;
}> = ({ onComplete }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ConditionTemplate | null>(null);

  if (!selectedTemplate) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white mb-4">
          What should trigger this rule?
        </h3>
        {CONDITION_TEMPLATES.map(template => (
          <button
            key={template.id}
            onClick={() => setSelectedTemplate(template)}
            className="w-full text-left glass-card space-widget p-4 hover:scale-[1.02]"
          >
            <div className="font-bold text-white">{template.label}</div>
            <div className="text-sm text-gray-400">{template.description}</div>
          </button>
        ))}
      </div>
    );
  }

  const BuilderComponent = selectedTemplate.builder;
  return (
    <div>
      <button
        onClick={() => setSelectedTemplate(null)}
        className="text-sm text-cyan-400 mb-4"
      >
        ← Back to templates
      </button>
      <BuilderComponent onComplete={onComplete} />
    </div>
  );
};
```

#### **Stuck Tasks Condition Builder:**

```typescript
const StuckTasksConditionBuilder: React.FC<{
  onComplete: (condition: string) => void;
}> = ({ onComplete }) => {
  const [daysThreshold, setDaysThreshold] = useState(3);
  const [completionThreshold, setCompletionThreshold] = useState(90);

  const buildCondition = () => {
    return `pillars.some(p => p.completion >= ${completionThreshold} && (p.days_stuck || 0) > ${daysThreshold})`;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Minimum completion percentage
        </label>
        <input
          type="range"
          min="70"
          max="100"
          value={completionThreshold}
          onChange={(e) => setCompletionThreshold(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-center text-sm text-gray-400">
          {completionThreshold}%
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Days stuck threshold
        </label>
        <select
          value={daysThreshold}
          onChange={(e) => setDaysThreshold(Number(e.target.value))}
          className="input-premium w-full"
        >
          {[1, 2, 3, 5, 7, 10, 14].map(days => (
            <option key={days} value={days}>{days} {days === 1 ? 'day' : 'days'}</option>
          ))}
        </select>
      </div>

      <div className="glass-card p-4 bg-white/5">
        <div className="text-xs text-gray-400 mb-1">Generated condition:</div>
        <code className="text-sm text-cyan-300">
          {buildCondition()}
        </code>
      </div>

      <button
        onClick={() => onComplete(buildCondition())}
        className="btn-premium btn-cyan w-full"
      >
        Use this condition →
      </button>
    </div>
  );
};
```

---

### Step 3: Action Selection

```typescript
const ActionSelector: React.FC<{
  onSelect: (action: CustomRule['action']) => void;
}> = ({ onSelect }) => {
  const actions = [
    {
      value: 'voice' as const,
      icon: '🔊',
      label: 'Voice notification',
      description: 'Audio alert with message',
    },
    {
      value: 'notification' as const,
      icon: '🔔',
      label: 'Push notification',
      description: 'Browser notification',
    },
    {
      value: 'block_action' as const,
      icon: '🚫',
      label: 'Block action',
      description: 'Prevent certain actions',
    },
    {
      value: 'ai_voice' as const,
      icon: '🤖',
      label: 'AI voice',
      description: 'AI-generated motivation',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {actions.map(action => (
        <button
          key={action.value}
          onClick={() => onSelect(action.value)}
          className="glass-card space-widget p-6 text-center hover:scale-105"
        >
          <span className="text-4xl mb-2">{action.icon}</span>
          <h3 className="font-bold text-white">{action.label}</h3>
          <p className="text-sm text-gray-400">{action.description}</p>
        </button>
      ))}
    </div>
  );
};
```

---

### Step 4: Message Input

```typescript
const MessageInput: React.FC<{
  action: CustomRule['action'];
  onComplete: (message: string) => void;
}> = ({ action, onComplete }) => {
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const validate = () => {
    const newErrors: string[] = [];
    if (!message.trim()) {
      newErrors.push('Message is required');
    }
    if (message.length > 200) {
      newErrors.push('Message too long (max 200 characters)');
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const getPlaceholder = () => {
    switch (action) {
      case 'voice':
        return 'e.g., "Dzień dobry! Sprawdź Dashboard i ustaw priorytety na dziś."';
      case 'notification':
        return 'e.g., "Uwaga! Masz stuck taski wymagające uwagi."';
      case 'block_action':
        return 'e.g., "STOP! Najpierw zamknij projekty stuck przy 90%+."';
      case 'ai_voice':
        return 'AI will generate message based on context';
      default:
        return 'Enter your message...';
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-bold text-white">
        {action === 'ai_voice' ? 'AI will generate the message' : 'What message should be shown?'}
      </label>

      {action === 'ai_voice' ? (
        <div className="glass-card p-4 bg-cyan-500/10 border border-cyan-400/30">
          <p className="text-sm text-cyan-200">
            AI will generate a contextual message based on the condition and your goal strategy.
          </p>
        </div>
      ) : (
        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (errors.length > 0) validate();
          }}
          placeholder={getPlaceholder()}
          className="input-premium w-full"
          rows={4}
          maxLength={200}
        />
      )}

      {errors.length > 0 && (
        <ErrorBanner errors={errors} />
      )}

      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">
          {message.length}/200 characters
        </span>
        <button
          onClick={() => {
            if (validate()) {
              onComplete(action === 'ai_voice' ? 'AI: generate message' : message);
            }
          }}
          className="btn-premium btn-cyan"
        >
          Continue →
        </button>
      </div>
    </div>
  );
};
```

---

### Step 5: Review & Save

```typescript
const RuleReview: React.FC<{
  rule: Partial<CustomRule>;
  onEdit: (step: number) => void;
  onSave: () => void;
}> = ({ rule, onEdit, onSave }) => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">Review your rule</h3>

      <div className="glass-card space-widget">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h4 className="font-bold text-white mb-1">Name</h4>
            <p className="text-gray-300">{rule.name || 'Untitled rule'}</p>
          </div>
          <button
            onClick={() => onEdit(0)}
            className="text-sm text-cyan-400"
          >
            Edit
          </button>
        </div>

        <div className="border-t border-white/10 pt-4 mb-4">
          <h4 className="font-bold text-white mb-1">Trigger</h4>
          <p className="text-gray-300">
            {rule.trigger === 'time' ? '⏰ Time-based' : '📊 Data-based'}
          </p>
          <code className="text-xs text-cyan-300 mt-1 block">
            {rule.condition}
          </code>
          <button
            onClick={() => onEdit(1)}
            className="text-sm text-cyan-400 mt-2"
          >
            Edit
          </button>
        </div>

        <div className="border-t border-white/10 pt-4 mb-4">
          <h4 className="font-bold text-white mb-1">Action</h4>
          <p className="text-gray-300">
            {getActionLabel(rule.action)}
          </p>
          <button
            onClick={() => onEdit(2)}
            className="text-sm text-cyan-400 mt-2"
          >
            Edit
          </button>
        </div>

        <div className="border-t border-white/10 pt-4">
          <h4 className="font-bold text-white mb-1">Message</h4>
          <p className="text-gray-300">{rule.message}</p>
          <button
            onClick={() => onEdit(3)}
            className="text-sm text-cyan-400 mt-2"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onEdit(0)}
          className="btn-premium btn-cyan flex-1"
        >
          Edit Rule
        </button>
        <button
          onClick={onSave}
          className="btn-premium btn-magenta flex-1"
        >
          Save Rule
        </button>
      </div>
    </div>
  );
};
```

---

## MAIN WIZARD CONTAINER

```typescript
const RulesWizard: React.FC<{
  onComplete: (rule: CustomRule) => void;
  onCancel: () => void;
}> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(0);
  const [rule, setRule] = useState<Partial<CustomRule>>({
    name: '',
    trigger: undefined,
    condition: '',
    action: undefined,
    message: '',
    active: true,
  });

  const steps = [
    { id: 'name', label: 'Name', component: NameInput },
    { id: 'trigger', label: 'Trigger', component: TriggerSelector },
    { id: 'condition', label: 'Condition', component: ConditionBuilder },
    { id: 'action', label: 'Action', component: ActionSelector },
    { id: 'message', label: 'Message', component: MessageInput },
    { id: 'review', label: 'Review', component: RuleReview },
  ];

  const handleStepComplete = (stepData: Partial<CustomRule>) => {
    setRule({ ...rule, ...stepData });
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleSave = () => {
    const finalRule: CustomRule = {
      id: `rule_${Date.now()}`,
      name: rule.name!,
      trigger: rule.trigger!,
      condition: rule.condition!,
      action: rule.action!,
      message: rule.message!,
      active: rule.active ?? true,
    };

    // Validate
    const validation = validateRule(finalRule);
    if (!validation.isValid) {
      // Show errors
      return;
    }

    onComplete(finalRule);
  };

  const CurrentStep = steps[step].component;

  return (
    <div className="glass-card space-widget-lg">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">
            Step {step + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-400">
            {steps[step].label}
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-magenta-500 transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <CurrentStep
        rule={rule}
        onComplete={handleStepComplete}
        onBack={step > 0 ? () => setStep(step - 1) : undefined}
      />

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-6 border-t border-white/10">
        {step > 0 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="btn-premium btn-cyan"
          >
            ← Back
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="btn-premium btn-cyan"
          >
            Cancel
          </button>
        )}

        {step === steps.length - 1 ? (
          <button
            onClick={handleSave}
            className="btn-premium btn-magenta"
          >
            Save Rule
          </button>
        ) : (
          <div /> // Spacer
        )}
      </div>
    </div>
  );
};
```

---

## INTEGRATION WITH EVENING PROTOCOL

```typescript
// In EveningProtocolPremium.tsx
const ProtocolRulesWizard: React.FC<{
  rules: CustomRule[];
  onUpdate: (rules: CustomRule[]) => void;
}> = ({ rules, onUpdate }) => {
  const [showWizard, setShowWizard] = useState(false);
  const MIN_RULES = 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">Rules</h3>
          <p className="text-sm text-gray-400">
            Minimum {MIN_RULES} rule required
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="btn-premium btn-cyan"
        >
          ➕ Add Rule
        </button>
      </div>

      {rules.length > 0 && (
        <div className="space-y-2 mb-4">
          {rules.map(rule => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      )}

      {rules.length < MIN_RULES && (
        <div className="glass-card p-4 bg-yellow-500/10 border border-yellow-500/30">
          <p className="text-sm text-yellow-200">
            ⚠️ Add at least {MIN_RULES} rule to complete protocol
          </p>
        </div>
      )}

      {showWizard && (
        <Modal onClose={() => setShowWizard(false)}>
          <RulesWizard
            onComplete={(rule) => {
              onUpdate([...rules, rule]);
              setShowWizard(false);
            }}
            onCancel={() => setShowWizard(false)}
          />
        </Modal>
      )}
    </div>
  );
};
```

---

## CONDITION TEMPLATES LIBRARY

```typescript
// utils/conditionTemplates.ts

export const CONDITION_TEMPLATES = [
  {
    id: 'stuck_tasks',
    label: 'Stuck tasks detected',
    builder: (params: { days: number; completion: number }) =>
      `pillars.some(p => p.completion >= ${params.completion} && (p.days_stuck || 0) > ${params.days})`,
  },
  {
    id: 'goal_completion',
    label: 'Goal completion threshold',
    builder: (params: { percent: number }) =>
      `pillars.some(p => p.completion >= ${params.percent})`,
  },
  {
    id: 'sprint_deadline',
    label: 'Sprint deadline approaching',
    builder: (params: { daysRemaining: number }) =>
      `sprint.progress.filter(d => !d.checked).length <= ${params.daysRemaining}`,
  },
  {
    id: 'no_activity',
    label: 'No activity today',
    builder: () =>
      `!user.last_checkin || new Date(user.last_checkin).toDateString() !== new Date().toDateString()`,
  },
  // ... more templates
];
```

---

## TESTING

### Unit Tests

```typescript
describe('RulesWizard', () => {
  it('should validate minimum requirements', () => {
    const rule = createIncompleteRule();
    expect(validateRule(rule).isValid).toBe(false);
  });

  it('should generate correct condition from template', () => {
    const condition = buildStuckTasksCondition({ days: 3, completion: 90 });
    expect(condition).toBe('pillars.some(p => p.completion >= 90 && (p.days_stuck || 0) > 3)');
  });
});
```

### E2E Tests

```typescript
describe('Rules Wizard E2E', () => {
  it('should complete full wizard flow', async () => {
    await page.goto('/evening-protocol');
    await page.click('[data-testid="add-rule"]');
    await page.click('[data-testid="trigger-time"]');
    await page.fill('[data-testid="time-input"]', '09:00');
    await page.click('[data-testid="action-voice"]');
    await page.fill('[data-testid="message-input"]', 'Test message');
    await page.click('[data-testid="save-rule"]');

    const rules = await getRules();
    expect(rules.length).toBeGreaterThan(0);
  });
});
```

---

## ACCEPTANCE CRITERIA

- ✅ No code writing required from user
- ✅ Visual condition building
- ✅ All common use cases covered by templates
- ✅ Validation at each step
- ✅ Clear error messages
- ✅ Can edit at review step
- ✅ Integrates with Evening Protocol
- ✅ Min 1 rule validation
- ✅ 100% test coverage

---

**Status:** Ready for Implementation  
**Estimated Time:** 2-3 days  
**Priority:** HIGH (blocks Evening Protocol completion)
