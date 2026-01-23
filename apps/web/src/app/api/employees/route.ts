import { NextRequest } from 'next/server';
import { proxyRequest } from '../proxy';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  return proxyRequest('/employees', { searchParams });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyRequest('/employees', { method: 'POST', body });
}
