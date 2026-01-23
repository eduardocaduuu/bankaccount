import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://controle-ponto-api-3kle.onrender.com';
const API_TOKEN = process.env.API_INTERNAL_TOKEN || '';

export async function proxyRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    searchParams?: URLSearchParams;
  } = {}
) {
  const { method = 'GET', body, searchParams } = options;

  let url = `${API_URL}${path}`;
  if (searchParams?.toString()) {
    url += `?${searchParams.toString()}`;
  }

  console.log(`[Proxy] ${method} ${url} - Token: ${API_TOKEN ? 'present' : 'missing'}`);

  // For POST requests without body, send empty object to avoid Fastify error
  const requestBody = method === 'POST' ? JSON.stringify(body || {}) : undefined;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': API_TOKEN,
      },
      body: requestBody,
      cache: 'no-store',
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, error: 'Invalid JSON response', raw: text.substring(0, 200) };
    }

    console.log(`[Proxy] Response: ${response.status}`, data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[Proxy] Error for ${path}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to API', details: String(error) },
      { status: 500 }
    );
  }
}
