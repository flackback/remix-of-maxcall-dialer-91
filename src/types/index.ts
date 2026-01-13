// Agent Status Types
export type AgentStatus = 'READY' | 'BUSY' | 'WRAPUP' | 'PAUSE' | 'OFFLINE';

export type PauseReason = 
  | 'break' 
  | 'lunch' 
  | 'meeting' 
  | 'training' 
  | 'bathroom' 
  | 'technical' 
  | 'other';

export interface Agent {
  id: string;
  name: string;
  email: string;
  extension: string;
  sipUser: string;
  status: AgentStatus;
  pauseReason?: PauseReason;
  skills: AgentSkill[];
  currentCallId?: string;
  teamId: string;
  avatarUrl?: string;
  stats: AgentStats;
}

export interface AgentSkill {
  queueId: string;
  level: 1 | 2 | 3 | 4 | 5;
}

export interface AgentStats {
  callsHandled: number;
  avgHandleTime: number;
  avgWrapupTime: number;
  conversions: number;
  adherence: number;
}

// Lead Types
export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  company?: string;
  city?: string;
  state?: string;
  tags: string[];
  score?: number;
  metadata: Record<string, any>;
  attempts: number;
  lastAttemptAt?: Date;
  nextAttemptAt?: Date;
  isDnc: boolean;
  hasConsent: boolean;
  createdAt: Date;
  listId: string;
}

// Campaign Types
export type DialMode = 'PREVIEW' | 'POWER' | 'PREDICTIVE';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  mode: DialMode;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT';
  dialRatio: number;
  maxAttempts: number;
  cooldownMinutes: number;
  callerId: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  workDays: number[]; // 0-6 (Sunday-Saturday)
  scriptId?: string;
  trunkGroupId?: string;
  stats: CampaignStats;
  createdAt: Date;
}

export interface CampaignStats {
  totalLeads: number;
  contacted: number;
  remaining: number;
  contactRate: number;
  asr: number; // Answer Seizure Ratio
  aht: number; // Average Handle Time
  abandonRate: number;
  conversions: number;
  conversionRate: number;
}

// Queue Types
export type QueueType = 'INBOUND' | 'OUTBOUND' | 'CALLBACK' | 'AI_TRIAGE';

export interface Queue {
  id: string;
  name: string;
  type: QueueType;
  strategy: 'LONGEST_IDLE' | 'ROUND_ROBIN' | 'SKILL_WEIGHTED';
  wrapupTime: number;
  slaTarget: number; // seconds
  maxWaitTime: number;
  agents: string[];
  stats: QueueStats;
}

export interface QueueStats {
  waiting: number;
  active: number;
  avgWaitTime: number;
  slaPercentage: number;
  abandoned: number;
}

// Call Types
export type CallDirection = 'INBOUND' | 'OUTBOUND';
export type CallStatus = 
  | 'DIALING' 
  | 'RINGING' 
  | 'CONNECTED' 
  | 'ON_HOLD' 
  | 'TRANSFERRING'
  | 'COMPLETED' 
  | 'FAILED' 
  | 'NO_ANSWER' 
  | 'BUSY'
  | 'VOICEMAIL';

export interface Call {
  id: string;
  direction: CallDirection;
  status: CallStatus;
  leadId?: string;
  agentId?: string;
  queueId?: string;
  campaignId?: string;
  phone: string;
  callerId: string;
  startedAt: Date;
  connectedAt?: Date;
  endedAt?: Date;
  duration?: number;
  holdTime?: number;
  wrapupTime?: number;
  dispositionId?: string;
  recordingUrl?: string;
  isAiHandled: boolean;
  aiHandoffSummary?: string;
  notes?: string;
}

// Disposition Types
export interface Disposition {
  id: string;
  name: string;
  code: string;
  category: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'CALLBACK' | 'DNC';
  isDefault: boolean;
  requiresCallback: boolean;
  requiresNotes: boolean;
}

// AI Handoff Types
export interface AiHandoff {
  id: string;
  callId: string;
  summary: string;
  fieldsJson: Record<string, any>;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  intent: string;
  confidence: number;
  duration: number;
  createdAt: Date;
}

// Dashboard Metrics
export interface DashboardMetrics {
  activeAgents: number;
  readyAgents: number;
  busyAgents: number;
  pausedAgents: number;
  activeCalls: number;
  waitingCalls: number;
  callsToday: number;
  answeredToday: number;
  abandonedToday: number;
  avgWaitTime: number;
  avgHandleTime: number;
  slaPercentage: number;
  contactRate: number;
  conversionRate: number;
}

// Wallboard Data
export interface WallboardData {
  metrics: DashboardMetrics;
  agents: Agent[];
  queues: Queue[];
  recentCalls: Call[];
  hourlyStats: HourlyStat[];
}

export interface HourlyStat {
  hour: string;
  calls: number;
  answered: number;
  abandoned: number;
  aht: number;
}

// Script Types
export interface Script {
  id: string;
  name: string;
  campaignId: string;
  steps: ScriptStep[];
}

export interface ScriptStep {
  id: string;
  order: number;
  title: string;
  content: string;
  fields: ScriptField[];
  nextStepId?: string;
  branches?: ScriptBranch[];
}

export interface ScriptField {
  id: string;
  name: string;
  type: 'TEXT' | 'SELECT' | 'CHECKBOX' | 'DATE' | 'PHONE' | 'EMAIL';
  required: boolean;
  options?: string[];
  defaultValue?: string;
}

export interface ScriptBranch {
  condition: string;
  nextStepId: string;
}

// QA Types
export interface QAScorecard {
  id: string;
  name: string;
  campaignId: string;
  criteria: QACriterion[];
  maxScore: number;
}

export interface QACriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

export interface QAReview {
  id: string;
  callId: string;
  reviewerId: string;
  agentId: string;
  scorecardId: string;
  scores: { criterionId: string; score: number; notes?: string }[];
  totalScore: number;
  feedback: string;
  createdAt: Date;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'CALL_INCOMING' | 'CALLBACK_DUE' | 'SLA_BREACH' | 'QUEUE_OVERFLOW' | 'SYSTEM';
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  read: boolean;
  createdAt: Date;
}

// User & Auth Types
export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'QA' | 'AGENT' | 'ANALYST';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  agentId?: string;
  accountId: string;
  avatarUrl?: string;
  isActive: boolean;
}
