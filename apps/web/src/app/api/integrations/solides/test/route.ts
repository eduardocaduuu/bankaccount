import { proxyRequest } from '../../../proxy';

export async function POST() {
  return proxyRequest('/integrations/solides/test', { method: 'POST' });
}
