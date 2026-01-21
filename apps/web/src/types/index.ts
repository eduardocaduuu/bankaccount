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

// ===========================================
// DTOs
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

// ===========================================
// API Response Types
// ===========================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

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
