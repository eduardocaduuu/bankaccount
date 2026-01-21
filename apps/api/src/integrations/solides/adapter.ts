import type { SolidesAdapter, SolidesEmployee, SolidesPunch } from '@controle-ponto/types';
import { logger } from '../../utils/logger.js';

export interface SolidesConfig {
  baseUrl: string;
  apiKey: string;
  apiKeyHeaderName: string;
  employeesPath: string;
  punchesPath: string;
}

export class HttpSolidesAdapter implements SolidesAdapter {
  private config: SolidesConfig;

  constructor(config: SolidesConfig) {
    this.config = config;
  }

  private getHeaders(): HeadersInit {
    return {
      [this.config.apiKeyHeaderName]: this.config.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}${this.config.employeesPath}`;
      logger.info({ url }, 'Testing Sólides connection');

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      logger.error({ error }, 'Failed to connect to Sólides');
      return false;
    }
  }

  async fetchEmployees(): Promise<SolidesEmployee[]> {
    try {
      const url = `${this.config.baseUrl}${this.config.employeesPath}`;
      logger.info({ url }, 'Fetching employees from Sólides');

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Adapta a resposta - formato pode variar
      const employees = Array.isArray(data) ? data : data.employees || data.data || [];

      logger.info({ count: employees.length }, 'Employees fetched from Sólides');

      return employees.map((emp: Record<string, unknown>) => ({
        id: String(emp.id || emp.employee_id || emp.employeeId),
        name: String(emp.name || emp.full_name || emp.fullName || 'Unknown'),
        email: emp.email ? String(emp.email) : undefined,
        department: emp.department ? String(emp.department) : undefined,
        ...emp,
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to fetch employees from Sólides');
      throw error;
    }
  }

  async fetchPunches(startDate: string, endDate: string): Promise<SolidesPunch[]> {
    try {
      const url = new URL(`${this.config.baseUrl}${this.config.punchesPath}`);
      url.searchParams.set('start', startDate);
      url.searchParams.set('end', endDate);

      logger.info({ url: url.toString(), startDate, endDate }, 'Fetching punches from Sólides');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Adapta a resposta - formato pode variar
      const punches = Array.isArray(data) ? data : data.punches || data.data || [];

      logger.info({ count: punches.length }, 'Punches fetched from Sólides');

      return punches.map((punch: Record<string, unknown>) => ({
        employeeId: String(punch.employee_id || punch.employeeId || punch.id),
        timestamp: String(punch.timestamp || punch.date || punch.punch_time),
        type: punch.type ? String(punch.type) : undefined,
        ...punch,
      }));
    } catch (error) {
      logger.error({ error }, 'Failed to fetch punches from Sólides');
      throw error;
    }
  }
}

export function createSolidesAdapter(config: SolidesConfig): SolidesAdapter {
  return new HttpSolidesAdapter(config);
}
