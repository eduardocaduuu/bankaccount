import { NextRequest } from 'next/server';
import { proxyRequest } from '../../../proxy';

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  return proxyRequest('/integrations/solides/sync', { method: 'POST', searchParams });
}
