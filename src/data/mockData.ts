import {
  Agent,
  Campaign,
  Queue,
  Call,
  Lead,
  Disposition,
  DashboardMetrics,
  HourlyStat,
  WallboardData,
  Script,
  AiHandoff,
  Notification,
} from '@/types';

// Mock Agents (90 agents as specified)
export const mockAgents: Agent[] = Array.from({ length: 90 }, (_, i) => ({
  id: `agent-${i + 1}`,
  name: [
    'Ana Silva', 'Bruno Costa', 'Carla Santos', 'Daniel Oliveira', 'Elena Pereira',
    'Felipe Lima', 'Gabriela Souza', 'Henrique Alves', 'Isabela Rodrigues', 'João Ferreira',
    'Karen Martins', 'Lucas Barbosa', 'Marina Gomes', 'Nicolas Castro', 'Olivia Dias',
    'Pedro Moreira', 'Quitéria Nunes', 'Rafael Cardoso', 'Sabrina Ribeiro', 'Thiago Mendes',
  ][i % 20],
  email: `agent${i + 1}@maxcall.com.br`,
  extension: `${1000 + i}`,
  sipUser: `sip${1000 + i}`,
  status: ['READY', 'BUSY', 'WRAPUP', 'PAUSE', 'OFFLINE'][Math.floor(Math.random() * 5)] as Agent['status'],
  pauseReason: Math.random() > 0.7 ? 'break' : undefined,
  skills: [
    { queueId: 'queue-1', level: Math.ceil(Math.random() * 5) as 1 | 2 | 3 | 4 | 5 },
    { queueId: 'queue-2', level: Math.ceil(Math.random() * 5) as 1 | 2 | 3 | 4 | 5 },
  ],
  currentCallId: Math.random() > 0.7 ? `call-${Math.floor(Math.random() * 100)}` : undefined,
  teamId: `team-${Math.floor(i / 15) + 1}`,
  stats: {
    callsHandled: Math.floor(Math.random() * 50) + 10,
    avgHandleTime: Math.floor(Math.random() * 180) + 120,
    avgWrapupTime: Math.floor(Math.random() * 30) + 15,
    conversions: Math.floor(Math.random() * 10),
    adherence: Math.floor(Math.random() * 20) + 80,
  },
}));

// Mock Campaigns
export const mockCampaigns: Campaign[] = [
  {
    id: 'campaign-1',
    name: 'Vendas Q4 2024',
    description: 'Campanha de vendas do quarto trimestre',
    mode: 'PREDICTIVE',
    status: 'ACTIVE',
    dialRatio: 2.5,
    maxAttempts: 3,
    cooldownMinutes: 60,
    callerId: '+5511999999999',
    startTime: '08:00',
    endTime: '20:00',
    workDays: [1, 2, 3, 4, 5],
    scriptId: 'script-1',
    stats: {
      totalLeads: 15000,
      contacted: 8750,
      remaining: 6250,
      contactRate: 42.5,
      asr: 68.3,
      aht: 245,
      abandonRate: 2.1,
      conversions: 1420,
      conversionRate: 16.2,
    },
    createdAt: new Date('2024-10-01'),
  },
  {
    id: 'campaign-2',
    name: 'Retenção Clientes',
    description: 'Campanha de retenção para clientes em risco',
    mode: 'POWER',
    status: 'ACTIVE',
    dialRatio: 1.2,
    maxAttempts: 5,
    cooldownMinutes: 120,
    callerId: '+5511888888888',
    startTime: '09:00',
    endTime: '18:00',
    workDays: [1, 2, 3, 4, 5],
    scriptId: 'script-2',
    stats: {
      totalLeads: 5000,
      contacted: 3200,
      remaining: 1800,
      contactRate: 64.0,
      asr: 72.1,
      aht: 320,
      abandonRate: 1.5,
      conversions: 890,
      conversionRate: 27.8,
    },
    createdAt: new Date('2024-09-15'),
  },
  {
    id: 'campaign-3',
    name: 'Cobrança Ativa',
    description: 'Recuperação de crédito',
    mode: 'PREVIEW',
    status: 'ACTIVE',
    dialRatio: 1.0,
    maxAttempts: 7,
    cooldownMinutes: 240,
    callerId: '+5511777777777',
    startTime: '08:00',
    endTime: '21:00',
    workDays: [1, 2, 3, 4, 5, 6],
    stats: {
      totalLeads: 8000,
      contacted: 5600,
      remaining: 2400,
      contactRate: 70.0,
      asr: 45.2,
      aht: 180,
      abandonRate: 0.8,
      conversions: 2100,
      conversionRate: 37.5,
    },
    createdAt: new Date('2024-08-01'),
  },
];

// Mock Queues
export const mockQueues: Queue[] = [
  {
    id: 'queue-1',
    name: 'Vendas Inbound',
    type: 'INBOUND',
    strategy: 'SKILL_WEIGHTED',
    wrapupTime: 30,
    slaTarget: 20,
    maxWaitTime: 120,
    agents: mockAgents.slice(0, 30).map(a => a.id),
    stats: {
      waiting: 3,
      active: 12,
      avgWaitTime: 15,
      slaPercentage: 89.5,
      abandoned: 23,
    },
  },
  {
    id: 'queue-2',
    name: 'Suporte Técnico',
    type: 'INBOUND',
    strategy: 'LONGEST_IDLE',
    wrapupTime: 45,
    slaTarget: 30,
    maxWaitTime: 180,
    agents: mockAgents.slice(30, 50).map(a => a.id),
    stats: {
      waiting: 5,
      active: 8,
      avgWaitTime: 22,
      slaPercentage: 82.3,
      abandoned: 12,
    },
  },
  {
    id: 'queue-3',
    name: 'Outbound Vendas',
    type: 'OUTBOUND',
    strategy: 'ROUND_ROBIN',
    wrapupTime: 20,
    slaTarget: 10,
    maxWaitTime: 60,
    agents: mockAgents.slice(50, 80).map(a => a.id),
    stats: {
      waiting: 0,
      active: 18,
      avgWaitTime: 5,
      slaPercentage: 95.2,
      abandoned: 5,
    },
  },
  {
    id: 'queue-ai',
    name: 'IA Triagem',
    type: 'AI_TRIAGE',
    strategy: 'SKILL_WEIGHTED',
    wrapupTime: 0,
    slaTarget: 5,
    maxWaitTime: 30,
    agents: [],
    stats: {
      waiting: 2,
      active: 4,
      avgWaitTime: 3,
      slaPercentage: 97.8,
      abandoned: 2,
    },
  },
];

// Mock Active Calls
export const mockCalls: Call[] = Array.from({ length: 25 }, (_, i) => ({
  id: `call-${i + 1}`,
  direction: Math.random() > 0.4 ? 'OUTBOUND' : 'INBOUND',
  status: ['DIALING', 'RINGING', 'CONNECTED', 'ON_HOLD'][Math.floor(Math.random() * 4)] as Call['status'],
  leadId: `lead-${i + 1}`,
  agentId: mockAgents[i % 90].id,
  queueId: mockQueues[i % 4].id,
  campaignId: i % 3 === 0 ? 'campaign-1' : i % 3 === 1 ? 'campaign-2' : 'campaign-3',
  phone: `+5511${String(900000000 + i).padStart(9, '0')}`,
  callerId: '+5511999999999',
  startedAt: new Date(Date.now() - Math.floor(Math.random() * 600000)),
  connectedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.floor(Math.random() * 300000)) : undefined,
  isAiHandled: i < 4,
  aiHandoffSummary: i < 4 ? 'Cliente interessado em upgrade de plano. Confirmou dados cadastrais.' : undefined,
}));

// Mock Leads
export const mockLeads: Lead[] = Array.from({ length: 200 }, (_, i) => ({
  id: `lead-${i + 1}`,
  firstName: ['Maria', 'José', 'Ana', 'João', 'Paulo', 'Carla', 'Pedro', 'Julia'][i % 8],
  lastName: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Lima', 'Alves'][i % 8],
  phone: `+5511${String(900000000 + i).padStart(9, '0')}`,
  normalizedPhone: `5511${String(900000000 + i).padStart(9, '0')}`,
  email: `lead${i + 1}@example.com`,
  company: i % 3 === 0 ? 'Empresa ABC' : i % 3 === 1 ? 'Corp XYZ' : undefined,
  city: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre'][i % 5],
  state: ['SP', 'RJ', 'MG', 'PR', 'RS'][i % 5],
  tags: i % 2 === 0 ? ['vip', 'hot-lead'] : ['standard'],
  score: Math.floor(Math.random() * 100),
  metadata: { source: 'website', campaign: 'q4-2024' },
  attempts: Math.floor(Math.random() * 3),
  lastAttemptAt: i % 2 === 0 ? new Date(Date.now() - 86400000) : undefined,
  isDnc: i === 5,
  hasConsent: true,
  createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
  listId: `list-${(i % 3) + 1}`,
}));

// Mock Dispositions
export const mockDispositions: Disposition[] = [
  { id: 'disp-1', name: 'Venda Realizada', code: 'SALE', category: 'POSITIVE', isDefault: false, requiresCallback: false, requiresNotes: false },
  { id: 'disp-2', name: 'Interesse Futuro', code: 'FUTURE', category: 'POSITIVE', isDefault: false, requiresCallback: true, requiresNotes: true },
  { id: 'disp-3', name: 'Não Interessado', code: 'NO_INT', category: 'NEGATIVE', isDefault: false, requiresCallback: false, requiresNotes: false },
  { id: 'disp-4', name: 'Não Atendeu', code: 'NA', category: 'NEUTRAL', isDefault: true, requiresCallback: false, requiresNotes: false },
  { id: 'disp-5', name: 'Caixa Postal', code: 'VM', category: 'NEUTRAL', isDefault: false, requiresCallback: false, requiresNotes: false },
  { id: 'disp-6', name: 'Número Errado', code: 'WRONG', category: 'NEGATIVE', isDefault: false, requiresCallback: false, requiresNotes: false },
  { id: 'disp-7', name: 'Agendar Callback', code: 'CALLBACK', category: 'CALLBACK', isDefault: false, requiresCallback: true, requiresNotes: true },
  { id: 'disp-8', name: 'DNC - Não Ligar', code: 'DNC', category: 'DNC', isDefault: false, requiresCallback: false, requiresNotes: true },
];

// Dashboard Metrics
export const mockDashboardMetrics: DashboardMetrics = {
  activeAgents: 72,
  readyAgents: 28,
  busyAgents: 32,
  pausedAgents: 12,
  activeCalls: 32,
  waitingCalls: 8,
  callsToday: 1847,
  answeredToday: 1523,
  abandonedToday: 67,
  avgWaitTime: 18,
  avgHandleTime: 245,
  slaPercentage: 87.5,
  contactRate: 68.3,
  conversionRate: 16.2,
};

// Hourly Stats for charts
export const mockHourlyStats: HourlyStat[] = [
  { hour: '08:00', calls: 45, answered: 38, abandoned: 2, aht: 230 },
  { hour: '09:00', calls: 89, answered: 78, abandoned: 4, aht: 245 },
  { hour: '10:00', calls: 156, answered: 142, abandoned: 6, aht: 252 },
  { hour: '11:00', calls: 178, answered: 165, abandoned: 5, aht: 248 },
  { hour: '12:00', calls: 134, answered: 118, abandoned: 8, aht: 265 },
  { hour: '13:00', calls: 98, answered: 85, abandoned: 5, aht: 238 },
  { hour: '14:00', calls: 167, answered: 155, abandoned: 4, aht: 242 },
  { hour: '15:00', calls: 189, answered: 176, abandoned: 5, aht: 250 },
  { hour: '16:00', calls: 201, answered: 188, abandoned: 6, aht: 255 },
  { hour: '17:00', calls: 187, answered: 172, abandoned: 7, aht: 248 },
  { hour: '18:00', calls: 165, answered: 150, abandoned: 8, aht: 260 },
  { hour: '19:00', calls: 142, answered: 128, abandoned: 5, aht: 245 },
  { hour: '20:00', calls: 96, answered: 82, abandoned: 2, aht: 235 },
];

// Wallboard Data
export const mockWallboardData: WallboardData = {
  metrics: mockDashboardMetrics,
  agents: mockAgents,
  queues: mockQueues,
  recentCalls: mockCalls.slice(0, 10),
  hourlyStats: mockHourlyStats,
};

// Mock Script
export const mockScript: Script = {
  id: 'script-1',
  name: 'Script Vendas Q4',
  campaignId: 'campaign-1',
  steps: [
    {
      id: 'step-1',
      order: 1,
      title: 'Abertura',
      content: 'Olá, [NOME]! Meu nome é [AGENTE], da MaxCall. Tudo bem com você?',
      fields: [],
      nextStepId: 'step-2',
    },
    {
      id: 'step-2',
      order: 2,
      title: 'Qualificação',
      content: 'Estou entrando em contato para falar sobre uma oportunidade especial para você.',
      fields: [
        { id: 'f1', name: 'interesse', type: 'SELECT', required: true, options: ['Alto', 'Médio', 'Baixo'] },
      ],
      branches: [
        { condition: 'interesse === "Alto"', nextStepId: 'step-3' },
        { condition: 'interesse === "Baixo"', nextStepId: 'step-4' },
      ],
    },
    {
      id: 'step-3',
      order: 3,
      title: 'Apresentação',
      content: 'Excelente! Deixa eu te explicar os benefícios...',
      fields: [
        { id: 'f2', name: 'objecao', type: 'TEXT', required: false },
      ],
      nextStepId: 'step-5',
    },
    {
      id: 'step-4',
      order: 4,
      title: 'Objeção',
      content: 'Entendo. Posso perguntar o que te impede neste momento?',
      fields: [
        { id: 'f3', name: 'motivo_recusa', type: 'SELECT', required: true, options: ['Preço', 'Timing', 'Concorrência', 'Outro'] },
      ],
      nextStepId: 'step-5',
    },
    {
      id: 'step-5',
      order: 5,
      title: 'Fechamento',
      content: 'Obrigado pelo seu tempo, [NOME]!',
      fields: [],
    },
  ],
};

// Mock AI Handoff
export const mockAiHandoff: AiHandoff = {
  id: 'handoff-1',
  callId: 'call-1',
  summary: 'Cliente Maria Silva interessada em upgrade de plano. Confirmou dados cadastrais e demonstrou interesse no plano Premium. Perguntou sobre desconto para pagamento anual.',
  fieldsJson: {
    nome: 'Maria Silva',
    plano_interesse: 'Premium',
    duvida_principal: 'Desconto anual',
    melhor_horario: 'Manhã',
  },
  sentiment: 'POSITIVE',
  intent: 'UPGRADE',
  confidence: 0.92,
  duration: 45,
  createdAt: new Date(),
};

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'SLA_BREACH',
    title: 'SLA em Risco',
    message: 'Fila Vendas Inbound com 5 chamadas aguardando há mais de 30s',
    severity: 'WARNING',
    read: false,
    createdAt: new Date(),
  },
  {
    id: 'notif-2',
    type: 'CALLBACK_DUE',
    title: 'Callback Agendado',
    message: 'Callback para Maria Silva em 5 minutos',
    severity: 'INFO',
    read: false,
    createdAt: new Date(Date.now() - 60000),
  },
  {
    id: 'notif-3',
    type: 'QUEUE_OVERFLOW',
    title: 'Fila Sobrecarregada',
    message: 'Suporte Técnico com tempo de espera acima de 3 minutos',
    severity: 'CRITICAL',
    read: true,
    createdAt: new Date(Date.now() - 300000),
  },
];
