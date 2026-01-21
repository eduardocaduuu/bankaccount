import type {
  ApiResponse,
  DashboardKPIs,
  Sector,
  Employee,
  Occurrence,
  SectorStats,
  CreateSectorDto,
  UpdateSectorDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_TOKEN = process.env.API_INTERNAL_TOKEN || '';

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-internal-token': API_TOKEN,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// Dashboard
export async function getDashboardKPIs(date?: string): Promise<DashboardKPIs> {
  const query = date ? `?date=${date}` : '';
  const response = await fetchApi<ApiResponse<DashboardKPIs>>(
    `/dashboard/kpis${query}`
  );
  return response.data!;
}

export async function getSectorStats(): Promise<SectorStats[]> {
  const response = await fetchApi<ApiResponse<SectorStats[]>>(
    '/dashboard/sectors'
  );
  return response.data || [];
}

export async function getRecentOccurrences(): Promise<Occurrence[]> {
  const response = await fetchApi<ApiResponse<Occurrence[]>>(
    '/dashboard/recent-occurrences'
  );
  return response.data || [];
}

// Sectors
export async function getSectors(): Promise<Sector[]> {
  const response = await fetchApi<ApiResponse<Sector[]>>('/sectors');
  return response.data || [];
}

export async function getSectorById(id: string): Promise<Sector | null> {
  try {
    const response = await fetchApi<ApiResponse<Sector>>(`/sectors/${id}`);
    return response.data || null;
  } catch {
    return null;
  }
}

export async function createSector(data: CreateSectorDto): Promise<Sector> {
  const response = await fetchApi<ApiResponse<Sector>>('/sectors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data!;
}

export async function updateSector(
  id: string,
  data: UpdateSectorDto
): Promise<Sector> {
  const response = await fetchApi<ApiResponse<Sector>>(`/sectors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data!;
}

// Employees
export async function getEmployees(params?: {
  sectorId?: string;
  active?: boolean;
}): Promise<Employee[]> {
  const query = new URLSearchParams();
  if (params?.sectorId) query.set('sectorId', params.sectorId);
  if (params?.active !== undefined) query.set('active', String(params.active));

  const queryString = query.toString();
  const path = `/employees${queryString ? `?${queryString}` : ''}`;

  const response = await fetchApi<ApiResponse<Employee[]>>(path);
  return response.data || [];
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  try {
    const response = await fetchApi<ApiResponse<Employee>>(`/employees/${id}`);
    return response.data || null;
  } catch {
    return null;
  }
}

export async function createEmployee(
  data: CreateEmployeeDto
): Promise<Employee> {
  const response = await fetchApi<ApiResponse<Employee>>('/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.data!;
}

export async function updateEmployee(
  id: string,
  data: UpdateEmployeeDto
): Promise<Employee> {
  const response = await fetchApi<ApiResponse<Employee>>(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.data!;
}

// Occurrences
export async function getOccurrences(params?: {
  date?: string;
  status?: string;
  employeeId?: string;
  type?: string;
}): Promise<Occurrence[]> {
  const query = new URLSearchParams();
  if (params?.date) query.set('date', params.date);
  if (params?.status) query.set('status', params.status);
  if (params?.employeeId) query.set('employeeId', params.employeeId);
  if (params?.type) query.set('type', params.type);

  const queryString = query.toString();
  const path = `/occurrences${queryString ? `?${queryString}` : ''}`;

  const response = await fetchApi<ApiResponse<Occurrence[]>>(path);
  return response.data || [];
}

// Health
export async function checkHealth(): Promise<{
  status: string;
  database: string;
}> {
  return fetchApi('/health');
}

// Sync
export async function syncSolides(
  startDate: string,
  endDate: string
): Promise<{
  employeesSynced: number;
  punchesSynced: number;
  worklogsGenerated: number;
  occurrencesGenerated: number;
}> {
  const response = await fetchApi<
    ApiResponse<{
      employeesSynced: number;
      punchesSynced: number;
      worklogsGenerated: number;
      occurrencesGenerated: number;
    }>
  >(`/integrations/solides/sync?start=${startDate}&end=${endDate}`, {
    method: 'POST',
  });
  return response.data!;
}

export async function testSolidesConnection(): Promise<boolean> {
  try {
    await fetchApi('/integrations/solides/test', { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}
