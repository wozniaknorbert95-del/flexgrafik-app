import type { Achievement, UserStats, XpEvent } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'streak_3',
    title: 'Iskra',
    description: 'Seria 3 dni w celu głównym.',
    category: 'streak',
    iconKey: 'fire',
  },
  {
    id: 'streak_7',
    title: 'Ogień',
    description: 'Seria 7 dni w celu głównym.',
    category: 'streak',
    iconKey: 'fire',
  },
  {
    id: 'tasks_10',
    title: 'Egzekutor',
    description: 'Ukończ 10 zadań.',
    category: 'tasks',
    iconKey: 'check',
  },
  {
    id: 'focus_300',
    title: 'Maratończyk sesji',
    description: 'Zbierz 300 minut fokusowe.',
    category: 'focus',
    iconKey: 'timer',
  },
  {
    id: 'night_owl',
    title: 'Nocny marek',
    description: 'Ukończ sesję po 22:00 (lokalnie).',
    category: 'consistency',
    iconKey: 'moon',
  },
];

const ICON_BY_KEY: Record<string, string> = {
  fire: '🔥',
  check: '✅',
  timer: '⏱️',
  moon: '🦉',
  trophy: '🏆',
};

export const BADGE_INFO: Record<string, { title: string; icon: string; desc: string }> =
  Object.fromEntries(
    ACHIEVEMENTS.map((a) => [
      a.id,
      {
        title: a.title,
        icon: ICON_BY_KEY[String(a.iconKey || '')] || '🏅',
        desc: a.description,
      },
    ])
  );

export function getBadgeInfo(achievementId: string): { title: string; icon: string; desc: string } {
  const id = String(achievementId || '').trim();
  return (
    BADGE_INFO[id] || {
      title: id || 'Odznaka',
      icon: '🏅',
      desc: '',
    }
  );
}

function hasUnlocked(stats: any, achievementId: string): boolean {
  const list = Array.isArray(stats?.achievementsUnlocked) ? stats.achievementsUnlocked : [];
  return list.some((x: any) => String(x?.achievementId) === achievementId);
}

export function evaluateNewAchievementUnlocks(input: {
  prevStats: UserStats;
  nextStats: UserStats;
  lastEvent?: XpEvent | null;
}): Array<{ achievementId: string; reason: string }> {
  const { prevStats, nextStats, lastEvent } = input;
  const out: Array<{ achievementId: string; reason: string }> = [];

  const maybeAdd = (id: string, reason: string) => {
    if (hasUnlocked(nextStats, id)) return;
    out.push({ achievementId: id, reason });
  };

  // Streaks (based on currentStreakDays)
  if ((prevStats.currentStreakDays ?? 0) < 3 && (nextStats.currentStreakDays ?? 0) >= 3) {
    maybeAdd('streak_3', 'Seria 3 dni.');
  }
  if ((prevStats.currentStreakDays ?? 0) < 7 && (nextStats.currentStreakDays ?? 0) >= 7) {
    maybeAdd('streak_7', 'Seria 7 dni.');
  }

  // Tasks
  if ((prevStats.tasksCompleted ?? 0) < 10 && (nextStats.tasksCompleted ?? 0) >= 10) {
    maybeAdd('tasks_10', 'Ukończono 10 zadań.');
  }

  // Focus minutes
  if ((prevStats.totalFocusMinutes ?? 0) < 300 && (nextStats.totalFocusMinutes ?? 0) >= 300) {
    maybeAdd('focus_300', 'Zebrano 300 minut fokusowych.');
  }

  // Night owl: triggered by a completed session event time (best-effort)
  if (
    lastEvent &&
    String(lastEvent.source) === 'finish_session_minutes' &&
    typeof lastEvent.at === 'string'
  ) {
    try {
      const dt = new Date(lastEvent.at);
      const h = dt.getHours();
      if (h >= 22 || h <= 2) {
        maybeAdd('night_owl', 'Sesja ukończona późnym wieczorem.');
      }
    } catch {
      // ignore
    }
  }

  return out;
}
