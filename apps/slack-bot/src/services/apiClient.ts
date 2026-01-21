import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type {
  Occurrence,
  Employee,
  CreateJustificationDto,
  ApiResponse,
} from '@controle-ponto/types';

class ApiClient {
  private baseUrl: string;
  private token: string;

  constructor() {
    this.baseUrl = env.API_BASE_URL;
    this.token = env.API_INTERNAL_TOKEN;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    logger.debug({ method, url }, 'API request');

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': this.token,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error({ status: response.status, data }, 'API error');
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }

  // Occurrences
  async getOccurrences(params: {
    date?: string;
    status?: string;
    employeeId?: string;
  }): Promise<Occurrence[]> {
    const query = new URLSearchParams();
    if (params.date) query.set('date', params.date);
    if (params.status) query.set('status', params.status);
    if (params.employeeId) query.set('employeeId', params.employeeId);

    const queryString = query.toString();
    const path = `/occurrences${queryString ? `?${queryString}` : ''}`;

    const response = await this.request<ApiResponse<Occurrence[]>>('GET', path);
    return response.data || [];
  }

  async getOccurrenceById(id: string): Promise<Occurrence | null> {
    try {
      const response = await this.request<ApiResponse<Occurrence>>(
        'GET',
        `/occurrences/${id}`
      );
      return response.data || null;
    } catch {
      return null;
    }
  }

  async ackOccurrence(id: string): Promise<boolean> {
    try {
      await this.request('POST', `/occurrences/${id}/ack`);
      return true;
    } catch {
      return false;
    }
  }

  async resolveOccurrence(
    id: string,
    action: 'approve' | 'adjust' | 'request_details',
    note?: string
  ): Promise<boolean> {
    try {
      await this.request('POST', `/occurrences/${id}/resolve`, { action, note });
      return true;
    } catch {
      return false;
    }
  }

  // Employees
  async getEmployees(): Promise<Employee[]> {
    const response = await this.request<ApiResponse<Employee[]>>(
      'GET',
      '/employees'
    );
    return response.data || [];
  }

  async getEmployeeBySlackId(slackUserId: string): Promise<Employee | null> {
    const employees = await this.getEmployees();
    return employees.find((e) => e.slackUserId === slackUserId) || null;
  }

  // Justifications
  async createJustification(data: CreateJustificationDto): Promise<{
    justification: unknown;
    occurrence: Occurrence;
    managerSlackUserId: string;
  } | null> {
    try {
      const response = await this.request<
        ApiResponse<{
          justification: unknown;
          occurrence: Occurrence;
          managerSlackUserId: string;
        }>
      >('POST', '/justifications', data);
      return response.data || null;
    } catch {
      return null;
    }
  }
}

export const apiClient = new ApiClient();
