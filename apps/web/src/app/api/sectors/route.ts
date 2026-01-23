import { NextRequest } from 'next/server';
import { proxyRequest } from '../proxy';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  return proxyRequest('/sectors', { searchParams });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyRequest('/sectors', { method: 'POST', body });
}
