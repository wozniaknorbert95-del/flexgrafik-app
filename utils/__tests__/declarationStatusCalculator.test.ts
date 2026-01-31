/**
 * Unit tests for DeclarationStatusCalculator
 *
 * Tests all state transitions and edge cases
 */

import { DeclarationStatusCalculator } from '../declarationStatusCalculator';
import { Declaration } from '../../types';

// Helper to create test declaration
function createDeclaration(overrides: Partial<Declaration> = {}): Declaration {
  const now = new Date().toISOString();
  return {
    id: 'test-declaration-1',
    protocolId: 'test-protocol-1',
    taskId: 1,
    goalId: 1,
    doneCriteria: [],
    timeWindow: {
      start: '10:00',
      end: '12:00',
    },
    status: 'pending',
    createdAt: now,
    startedAt: null,
    completedAt: null,
    failedAt: null,
    agentEvaluation: {
      checkedAt: null,
      penaltyPoints: 0,
      reason: null,
      severity: 'none',
    },
    ...overrides,
  };
}

describe('DeclarationStatusCalculator', () => {
  describe('calculate', () => {
    it('should return pending before start time', () => {
      const declaration = createDeclaration({ timeWindow: { start: '10:00', end: '12:00' } });
      const now = new Date('2026-01-26T09:00:00');

      const status = DeclarationStatusCalculator.calculate(declaration, now, false);

      expect(status).toBe('pending');
    });

    it('should return active within time window', () => {
      const declaration = createDeclaration({ timeWindow: { start: '10:00', end: '12:00' } });
      const now = new Date('2026-01-26T11:00:00');

      const status = DeclarationStatusCalculator.calculate(declaration, now, false);

      expect(status).toBe('active');
    });

    it('should return in_progress when finish session active', () => {
      const declaration = createDeclaration({ timeWindow: { start: '10:00', end: '12:00' } });
      const now = new Date('2026-01-26T11:00:00');

      const status = DeclarationStatusCalculator.calculate(declaration, now, true);

      expect(status).toBe('in_progress');
    });

    it('should return failed after end time', () => {
      const declaration = createDeclaration({ timeWindow: { start: '10:00', end: '12:00' } });
      const now = new Date('2026-01-26T13:00:00');

      const status = DeclarationStatusCalculator.calculate(declaration, now, false);

      expect(status).toBe('failed');
    });

    it('should return completed if completedAt is set', () => {
      const declaration = createDeclaration({
        completedAt: '2026-01-26T11:30:00.000Z',
      });
      const now = new Date('2026-01-26T13:00:00');

      const status = DeclarationStatusCalculator.calculate(declaration, now, false);

      expect(status).toBe('completed');
    });

    it('should return cancelled if status is cancelled', () => {
      const declaration = createDeclaration({ status: 'cancelled' });
      const now = new Date('2026-01-26T11:00:00');

      const status = DeclarationStatusCalculator.calculate(declaration, now, false);

      expect(status).toBe('cancelled');
    });

    it('should handle midnight crossover (23:00 - 01:00)', () => {
      const declaration = createDeclaration({
        timeWindow: { start: '23:00', end: '01:00' },
      });
      const now = new Date('2026-01-26T23:30:00');

      const status = DeclarationStatusCalculator.calculate(declaration, now, false);

      expect(status).toBe('active');
    });

    it('should handle exact start time', () => {
      const declaration = createDeclaration({ timeWindow: { start: '10:00', end: '12:00' } });
      const now = new Date('2026-01-26T10:00:00');

      const status = DeclarationStatusCalculator.calculate(declaration, now, false);

      expect(status).toBe('active');
    });

    it('should handle exact end time', () => {
      const declaration = createDeclaration({ timeWindow: { start: '10:00', end: '12:00' } });
      const now = new Date('2026-01-26T12:00:00');

      const status = DeclarationStatusCalculator.calculate(declaration, now, false);

      expect(status).toBe('active');
    });
  });

  describe('shouldBeCheckedByAgent', () => {
    it('should return true for active declarations', () => {
      const declaration = createDeclaration({ status: 'active' });

      const shouldCheck = DeclarationStatusCalculator.shouldBeCheckedByAgent(declaration);

      expect(shouldCheck).toBe(true);
    });

    it('should return true for in_progress declarations', () => {
      const declaration = createDeclaration({ status: 'in_progress' });

      const shouldCheck = DeclarationStatusCalculator.shouldBeCheckedByAgent(declaration);

      expect(shouldCheck).toBe(true);
    });

    it('should return true for failed declarations', () => {
      const declaration = createDeclaration({ status: 'failed' });

      const shouldCheck = DeclarationStatusCalculator.shouldBeCheckedByAgent(declaration);

      expect(shouldCheck).toBe(true);
    });

    it('should return false for completed declarations', () => {
      const declaration = createDeclaration({
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      const shouldCheck = DeclarationStatusCalculator.shouldBeCheckedByAgent(declaration);

      expect(shouldCheck).toBe(false);
    });

    it('should return false for cancelled declarations', () => {
      const declaration = createDeclaration({ status: 'cancelled' });

      const shouldCheck = DeclarationStatusCalculator.shouldBeCheckedByAgent(declaration);

      expect(shouldCheck).toBe(false);
    });
  });

  describe('getMinutesUntilActive', () => {
    it('should return minutes until active', () => {
      const declaration = createDeclaration({ timeWindow: { start: '10:00', end: '12:00' } });
      const now = new Date('2026-01-26T09:30:00');

      const minutes = DeclarationStatusCalculator.getMinutesUntilActive(declaration, now);

      expect(minutes).toBe(30);
    });

    it('should return null if already active', () => {
      const declaration = createDeclaration({ timeWindow: { start: '10:00', end: '12:00' } });
      const now = new Date('2026-01-26T11:00:00');

      const minutes = DeclarationStatusCalculator.getMinutesUntilActive(declaration, now);

      expect(minutes).toBeNull();
    });

    it('should return null if cancelled', () => {
      const declaration = createDeclaration({
        status: 'cancelled',
        timeWindow: { start: '10:00', end: '12:00' },
      });
      const now = new Date('2026-01-26T09:30:00');

      const minutes = DeclarationStatusCalculator.getMinutesUntilActive(declaration, now);

      expect(minutes).toBeNull();
    });
  });
});
