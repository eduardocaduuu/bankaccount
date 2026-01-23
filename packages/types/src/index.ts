// ===========================================
// ENUMS
// ===========================================

export enum PunchType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
}

export enum OccurrenceType {
  LATE = 'LATE',
  OVER = 'OVER',
  UNDER = 'UNDER',
  INCOMPLETE = 'INCOMPLETE',
}

export enum OccurrenceStatus {
  OPEN = 'OPEN',
  ACK = 'ACK',
  RESOLVED = 'RESOLVED',
}

export enum WorklogStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  ERROR = 'ERROR',
}

export enum NotificationChannel {
  DM_EMPLOYEE = 'DM_EMPLOYEE',
  DM_MANAGER = 'DM_MANAGER',
  HR = 'HR',
}

export enum JustificationCategory {
  MEDICAL = 'MEDICAL',
  PERSONAL = 'PERSONAL',
  TRAFFIC = 'TRAFFIC',
  WORK_OFFSITE = 'WORK_OFFSITE',
  MEETING = 'MEETING',
  OTHER = 'OTHER',
}

// ===========================================
// ENTITIES
// ===========================================

export interface Sector {
  id: string;
  name: string;
  managerSlackUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Employee {
  id: string;
  name: string;
  solidesEmployeeId: string;
  slackUserId: string | null;
  sectorId: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PunchEvent {
  id: string;
  employeeId: string;
  timestamp: Date;
  type: PunchType;
  sourcePayloadJson: string | null;
  createdAt: Date;
}

export interface DailyWorklog {
  id: string;
  employeeId: string;
  date: Date;
  workedMinutes: number;
  lateMinutes: number;
  extraMinutes: number;
  underMinutes: number;
  status: WorklogStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Occurrence {
  id: string;
  employeeId: string;
  date: Date;
  type: OccurrenceType;
  minutes: number;
  status: OccurrenceStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Justification {
  id: string;
  occurrenceId: string;
  employeeId: string;
  date: Date;
  text: string;
  category: JustificationCategory | null;
  notifyHR: boolean;
  createdAt: Date;
}

export interface NotificationLog {
  id: string;
  employeeId: string;
  occurrenceId: string | null;
  channel: NotificationChannel;
  messageTs: string | null;
  sentAt: Date;
}

export interface Settings {
  id: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// DTOs - API Requests/Responses
// ===========================================

export interface CreateSectorDto {
  name: string;
  managerSlackUserId: string;
}

export interface UpdateSectorDto {
  name?: string;
  managerSlackUserId?: string;
}

export interface CreateEmployeeDto {
  name: string;
  solidesEmployeeId: string;
  slackUserId?: string;
  sectorId: string;
}

export interface UpdateEmployeeDto {
  name?: string;
  slackUserId?: string;
  sectorId?: string;
  active?: boolean;
}

export interface CreateJustificationDto {
  occurrenceId: string;
  text: string;
  category?: JustificationCategory;
  notifyHR?: boolean;
}

export interface SyncRequestDto {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface OccurrenceQueryDto {
  date?: string;
  status?: OccurrenceStatus;
  employeeId?: string;
  type?: OccurrenceType;
}

// ===========================================
// Sólides Integration Types
// ===========================================

export interface SolidesEmployee {
  id: string;
  name: string;
  email?: string;
  department?: string;
  [key: string]: unknown;
}

export interface SolidesPunch {
  employeeId: string;
  timestamp: string;
  type?: string;
  [key: string]: unknown;
}

/**
 * Resumo diário retornado pelo endpoint /daily-summary/ do Tangerino
 * Contém cálculos de horas trabalhadas, saldo, atrasos e extras
 */
export interface TangerinoDailySummary {
  id: number;
  employeeId: number;
  employerId: number;
  date: string;
  workedHours: number;          // Horas trabalhadas (em minutos ou formato HH:mm)
  hoursBalance: number;         // Saldo de horas
  estimatedHours: number;       // Horas esperadas
  overtimeTypeOne: number;      // Hora extra tipo 1
  overtimeTypeTwo: number;      // Hora extra tipo 2
  overtimeTypeThree: number;    // Hora extra tipo 3
  overtimeTypeFour: number;     // Hora extra tipo 4
  nightHours: number;           // Horas noturnas
  paidHours: number;            // Horas pagas
  fictaHours: number;           // Horas fictas
  compensatoryHoursBalance: number;
  overlimitCompensatoryHoursBalance: number;
  isHoliday: boolean;
  missed: boolean;              // Falta
  unjustifiedMiss: boolean;     // Falta injustificada
  isAdjustment: boolean;
  lateMinutes?: number;         // Atraso em minutos (calculado)
  extraMinutes?: number;        // Extra em minutos (calculado)
  [key: string]: unknown;
}

export interface SolidesAdapter {
  testConnection(): Promise<boolean>;
  fetchEmployees(): Promise<SolidesEmployee[]>;
  fetchPunches(startDate: string, endDate: string): Promise<SolidesPunch[]>;
  fetchDailySummary(employeeId: number, startDate: string, endDate: string): Promise<TangerinoDailySummary[]>;
}

// ===========================================
// Calculation Types
// ===========================================

export interface Punch {
  timestamp: Date;
  type: PunchType;
}

export interface LunchPolicy {
  startHour: number;
  startMinute: number;
  durationMinutes: number;
}

export interface WorkdayConfig {
  expectedStartHour: number;
  expectedStartMinute: number;
  expectedEndHour: number;
  expectedEndMinute: number;
  expectedWorkMinutes: number;
  toleranceMinutes: number;
  lunchPolicy: LunchPolicy;
}

export interface WorklogCalculation {
  workedMinutes: number;
  lateMinutes: number;
  extraMinutes: number;
  underMinutes: number;
  isIncomplete: boolean;
  occurrences: Array<{
    type: OccurrenceType;
    minutes: number;
  }>;
}

// ===========================================
// API Response Types
// ===========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  database: 'connected' | 'disconnected';
}

export interface SyncResponse {
  employeesSynced: number;
  punchesSynced: number;
  worklogsGenerated: number;
  occurrencesGenerated: number;
}

// ===========================================
// Dashboard KPIs
// ===========================================

export interface DashboardKPIs {
  totalEmployees: number;
  activeEmployees: number;
  totalSectors: number;
  todayOccurrences: number;
  openOccurrences: number;
  resolvedToday: number;
  lateToday: number;
  overToday: number;
  underToday: number;
  incompleteToday: number;
}

export interface SectorStats {
  sectorId: string;
  sectorName: string;
  employeeCount: number;
  openOccurrences: number;
  pendingJustifications: number;
}

// ===========================================
// Slack Types
// ===========================================

export interface SlackUserMapping {
  employeeId: string;
  slackUserId: string;
}

export interface ManagerNotification {
  managerId: string;
  employeeId: string;
  employeeName: string;
  occurrenceId: string;
  occurrenceType: OccurrenceType;
  minutes: number;
  justificationText: string;
  justificationCategory?: JustificationCategory;
  notifyHR: boolean;
}
