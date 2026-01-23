import { proxyRequest } from '../../proxy';

export async function GET() {
  return proxyRequest('/dashboard/recent-occurrences');
}
