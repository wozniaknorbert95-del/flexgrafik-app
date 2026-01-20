import { AppData, Pillar, Phase, IfThenRule, Sprint } from './types';

const INITIAL_PILLARS: Pillar[] = [
    {
      "id": 1,
      "name": "Strony",
      "description": "3× kompletne fronty",
      "status": "in_progress",
      "completion": 100,
      "done_definition": {
        "tech": "Wszystkie 3 strony online + responsive",
        "live": "SEO + analytics + formularze działają",
        "battle": "10 userów przetestowało + feedback"
      },
      "tasks": [
        {"name": "Flexgrafik.nl finalne poprawki", "type": "close", "done": true},
        {"name": "ZZPackage quiz działa", "type": "close", "done": true},
        {"name": "App.flexgrafik opublikowana", "type": "close", "done": true}
      ]
    },
    {
      "id": 2,
      "name": "Oferta",
      "description": "Pakiety + ścieżka zakupu",
      "status": "in_progress",
      "completion": 60,
      "done_definition": {
        "tech": "Pakiety opisane + ceny + FAQ",
        "live": "Checkout działa + płatności",
        "battle": "1 testowa transakcja"
      },
      "tasks": [
        {"name": "Opisy pakietów", "type": "build", "done": true},
        {"name": "Pricing table", "type": "build", "done": true},
        {"name": "FAQ sekcja", "type": "close", "done": false},
        {"name": "Test checkout", "type": "close", "done": false}
      ]
    },
    {
      "id": 3,
      "name": "Proces",
      "description": "Formularze, płatność, kontakt",
      "status": "not_started",
      "completion": 40,
      "done_definition": {
        "tech": "Formularze zintegrowane",
        "live": "Automatyczne email replies",
        "battle": "5 leadów przetestowało flow"
      },
      "tasks": [
        {"name": "Formularz kontaktowy", "type": "build", "done": false},
        {"name": "Email automation", "type": "build", "done": false},
        {"name": "Test flow", "type": "close", "done": false}
      ]
    },
    {
      "id": 4,
      "name": "Gra",
      "description": "MVP → ranking → lead",
      "status": "in_progress",
      "completion": 92,
      "ninety_percent_alert": true,
      "days_stuck": 7,
      "done_definition": {
        "tech": "Gra działa + ranking",
        "live": "Opublikowana na app.flexgrafik.nl",
        "battle": "10 userów + feedback + 1 iteracja"
      },
      "tasks": [
        {"name": "Backend ranking", "type": "build", "done": true},
        {"name": "Frontend UI", "type": "build", "done": true},
        {"name": "Deploy na hosting", "type": "close", "done": false},
        {"name": "10 test userów", "type": "close", "done": false},
        {"name": "Feedback iteracja", "type": "close", "done": false}
      ]
    },
    {
      "id": 5,
      "name": "Dowody społeczne",
      "description": "Google reviews, case studies",
      "status": "not_started",
      "completion": 0,
      "done_definition": {
        "tech": "Szablon case study + Google Business setup",
        "live": "3 case studies opublikowane + 5 reviews",
        "battle": "Social proof w kampaniach reklamowych"
      },
      "tasks": [
        {"name": "Google Business Profile", "type": "build", "done": false},
        {"name": "Case study template", "type": "build", "done": false},
        {"name": "Zbieranie reviews", "type": "build", "done": false}
      ]
    },
    {
      "id": 6,
      "name": "System leadów",
      "description": "FB/IG Ads, quiz, formularz",
      "status": "not_started",
      "completion": 0,
      "done_definition": {
        "tech": "Quiz + landing + FB pixel",
        "live": "Kampania testowa live",
        "battle": "50 leadów w bazie + 5 konwersji"
      },
      "tasks": [
        {"name": "Quiz interaktywny", "type": "build", "done": false},
        {"name": "Landing page", "type": "build", "done": false},
        {"name": "FB Ads setup", "type": "build", "done": false}
      ]
    },
    {
      "id": 7,
      "name": "Jadzia",
      "description": "MVP jako narzędzie pomocnicze",
      "status": "in_progress",
      "completion": 50,
      "done_definition": {
        "tech": "Jadzia v1 działa (Telegram bot + SSH)",
        "live": "Migracja na VPS + PostgreSQL",
        "battle": "Tool calling + pgvector działają"
      },
      "tasks": [
        {"name": "Jadzia v1 na VPS", "type": "close", "done": false},
        {"name": "PostgreSQL setup", "type": "close", "done": false},
        {"name": "Tool calling", "type": "close", "done": false}
      ]
    },
    {
      "id": 8,
      "name": "Twój system pracy",
      "description": "Tablica zadań, rytuał tygodnia",
      "status": "not_started",
      "completion": 0,
      "done_definition": {
        "tech": "Tablica zadań (Notion/App)",
        "live": "Cotygodniowy sprint aktywny",
        "battle": "4 tygodnie bez porzucenia projektu"
      },
      "tasks": [
        {"name": "Setup tablicy", "type": "build", "done": false},
        {"name": "Sprint template", "type": "build", "done": false},
        {"name": "Accountability partner", "type": "build", "done": false}
      ]
    }
];

const INITIAL_PHASES: Phase[] = [
    {
      "phase": 1,
      "name": "Fundament – PostgreSQL + Tool Calling",
      "deadline": "2025-01-31",
      "status": "in_progress",
      "completion": 40,
      "checklist": [
        {"item": "PostgreSQL + pgvector setup", "done": true},
        {"item": "Tool calling architecture", "done": true},
        {"item": "Knowledge Base import", "done": false},
        {"item": "Migracja Jadzi na VPS", "done": false},
        {"item": "Smoke test: Telegram → PostgreSQL", "done": false}
      ]
    },
    {
      "phase": 2,
      "name": "Bezpieczeństwo – GitHub Flow + Dashboard",
      "deadline": "2025-02-15",
      "status": "not_started",
      "completion": 0,
      "checklist": [
        {"item": "GitHub repo + Actions workflow", "done": false},
        {"item": "GitTool implementation", "done": false},
        {"item": "Streamlit dashboard MVP", "done": false},
        {"item": "ContentTool", "done": false},
        {"item": "Test PR flow end-to-end", "done": false}
      ]
    },
    {
      "phase": 3,
      "name": "Autonomia – Event-Driven + Lead Agent",
      "deadline": "2025-02-28",
      "status": "not_started",
      "completion": 0,
      "checklist": [
        {"item": "LeadTool + Firecrawl", "done": false},
        {"item": "AccountabilityTool + n8n", "done": false},
        {"item": "Dashboard CRM + Calendar", "done": false},
        {"item": "Autonomous content publishing", "done": false},
        {"item": "Full integration test", "done": false}
      ]
    }
];

const INITIAL_RULES: IfThenRule[] = [
    {
      "id": 1,
      "name": "No Activity Alert",
      "condition": "no_checkin_today AND time > 12:00",
      "action": "Send alert: '🚨 Brak check-in dziś. Sprint deadline za X dni.'",
      "active": true
    },
    {
      "id": 2,
      "name": "90% Stuck Alert",
      "condition": "project.completion >= 90 AND days_since_activity > 5",
      "action": "Send alert: '🔴 CRITICAL: [project_name] stuck od [X] dni' + Enable FINISH MODE",
      "active": true
    },
    {
      "id": 3,
      "name": "New Project Blocker",
      "condition": "user_adds_new_project AND ninety_percent_projects_count > 0",
      "action": "Block creation + Show: 'Najpierw zamknij: [list]'",
      "active": true
    },
    {
      "id": 4,
      "name": "Sprint Deadline Warning",
      "condition": "sprint.deadline - today < 2 days AND completion < 70%",
      "action": "Send alert: '⚠️ Sprint risk: tylko 48h, 30% zostało'",
      "active": true
    },
    {
      "id": 5,
      "name": "Weekly Sprint Reset",
      "condition": "day == Sunday AND time == 20:00",
      "action": "Generate sprint report + Prompt new sprint planning",
      "active": true
    }
];

const INITIAL_SPRINT: Sprint = {
    week: 3,
    year: 2025,
    goal: "Zamknąć Grę (BattleDone)",
    progress: [
        { day: "Pn", checked: true },
        { day: "Wt", checked: true },
        { day: "Śr", checked: true },
        { day: "Cz", checked: false },
        { day: "Pt", checked: false },
        { day: "So", checked: false },
        { day: "Nd", checked: false },
    ],
    done_tasks: ["Test gry lokalnie", "FAQ sklep"],
    blocked_tasks: ["Gra deploy – hosting issue"]
};

const INITIAL_CUSTOM_RULES: CustomRule[] = [
    {
        id: 'rule_morning_motivation',
        name: "Poranna motywacja",
        trigger: 'time',
        condition: '07:00',
        action: 'voice',
        message: 'Dzień dobry! Sprawdź Dashboard i ustaw priorytety na dziś.',
        active: true
    },
    {
        id: 'rule_stuck_project_blocker',
        name: "Blokada nowych projektów",
        trigger: 'data',
        condition: 'pillars.some(p => p.completion >= 90 && (p.days_stuck || 0) > 3)',
        action: 'block_action',
        message: 'STOP! Najpierw zamknij projekty stuck przy 90%+: [lista projektów]',
        active: true
    },
    {
        id: 'rule_ai_stuck_motivation',
        name: "AI motywacja dla stuck projektów",
        trigger: 'data',
        condition: 'pillars.some(p => p.completion >= 90 && (p.days_stuck || 0) > 5)',
        action: 'ai_voice',
        message: 'AI: generate motivation for stuck project',
        active: true
    },
    {
        id: 'rule_sprint_deadline_warning',
        name: "Ostrzeżenie deadline sprint",
        trigger: 'data',
        condition: 'sprint.progress.filter(d => !d.checked).length <= 2 && sprint.progress.filter(d => d.checked).length < 5',
        action: 'voice',
        message: 'Uwaga! Sprint kończy się za 2 dni. Zostało mało czasu!',
        active: true
    },
    {
        id: 'rule_evening_reflection',
        name: "Wieczorna refleksja",
        trigger: 'time',
        condition: '20:00',
        action: 'notification',
        message: 'Dobranoc! Jutro nowy dzień - bądź gotowy na sukces.',
        active: false
    }
];

// AI Configuration
export const AI_CONFIG = {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 1000,
    rateLimit: {
        requests: 30, // per minute
        windowMs: 60000
    }
};

export const INITIAL_DATA: AppData = {
    user: {
        id: "user_001",
        name: "FlexGrafik Owner",
        last_checkin: "2025-01-20T09:30:00.000Z",
        streak: 12
    },
    pillars: INITIAL_PILLARS,
    phases: INITIAL_PHASES,
    rules: INITIAL_RULES,
    sprint: INITIAL_SPRINT,
    customRules: INITIAL_CUSTOM_RULES,
    notificationHistory: [],
    aiChatHistory: [],
    settings: {
        voice: {
            enabled: true,
            volume: 80,
            speed: 1.0
        },
        ai: {
            apiKey: '',
            enabled: false,
            customSystemPrompt: undefined
        }
    }
};
