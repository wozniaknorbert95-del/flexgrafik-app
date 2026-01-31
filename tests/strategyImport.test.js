const {
  parseStrategyImportText,
  buildGoalStrategyFromImport,
  getStrategyImportTemplateText,
  extractStrategyImportBlockText,
} = require('../utils/strategyImport.ts');

describe('Strategy Import', () => {
  test('should reject text without JSON block', () => {
    const res = parseStrategyImportText('hello world');
    expect(res.ok).toBe(false);
    expect(res.error).toContain('JSON');
  });

  test('should parse delimited JSON block', () => {
    const text = `prefix\n---JSON_START---\n{ "vision": "X", "successCriteria": ["A"], "milestones": [], "obstacles": [], "ifThenPlans": [], "tasks": [] }\n---JSON_END---\npost`;
    const res = parseStrategyImportText(text);
    expect(res.ok).toBe(true);
    expect(res.payload.vision).toBe('X');
    expect(res.payload.successCriteria).toEqual(['A']);
  });

  test('extractStrategyImportBlockText should return full delimited block', () => {
    const text = `prefix\n---JSON_START---\n{ "vision": "X" }\n---JSON_END---\npost`;
    const block = extractStrategyImportBlockText(text);
    expect(block).toContain('---JSON_START---');
    expect(block).toContain('---JSON_END---');
    expect(block).toContain('"vision"');
  });

  test('extractStrategyImportBlockText should wrap raw JSON', () => {
    const text = `{ "vision": "X", "successCriteria": [], "milestones": [], "obstacles": [], "ifThenPlans": [], "tasks": [] }`;
    const block = extractStrategyImportBlockText(text);
    expect(block).toContain('---JSON_START---');
    expect(block).toContain('---JSON_END---');
  });

  test('should parse raw JSON', () => {
    const text = `{ "vision": "X", "successCriteria": ["A"], "milestones": [], "obstacles": [], "ifThenPlans": [], "tasks": [] }`;
    const res = parseStrategyImportText(text);
    expect(res.ok).toBe(true);
    expect(res.payload.vision).toBe('X');
  });

  test('should normalize tasks and coerce type', () => {
    const text = `---JSON_START---
{
  "vision": "X",
  "successCriteria": ["A"],
  "milestones": [],
  "obstacles": [],
  "ifThenPlans": [],
  "tasks": [
    { "name": "T1", "type": "close", "definitionOfDone": "DONE" },
    { "name": "T2", "type": "weird", "definitionOfDone": "DONE" }
  ]
}
---JSON_END---`;
    const res = parseStrategyImportText(text);
    expect(res.ok).toBe(true);
    expect(res.payload.tasks[0].type).toBe('close');
    expect(res.payload.tasks[1].type).toBe('build');
  });

  test('buildGoalStrategyFromImport should create ids and statuses', () => {
    const res = parseStrategyImportText(getStrategyImportTemplateText());
    expect(res.ok).toBe(true);
    const strategy = buildGoalStrategyFromImport(res.payload);
    expect(typeof strategy.vision).toBe('string');
    expect(Array.isArray(strategy.successCriteria)).toBe(true);
    expect(strategy.successCriteria.length).toBeGreaterThan(0);
    expect(strategy.successCriteria[0].id).toBeTruthy();
    expect(strategy.successCriteria[0].status).toBe('not_met');
    expect(Array.isArray(strategy.ifThenPlans)).toBe(true);
  });
});
