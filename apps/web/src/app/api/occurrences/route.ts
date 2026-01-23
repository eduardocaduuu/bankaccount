import { NextRequest } from 'next/server';
import { proxyRequest } from '../proxy';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  return proxyRequest('/occurrences', { searchParams });
}
