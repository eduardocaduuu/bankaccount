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

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': API_TOKEN,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`Proxy error for ${path}:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to API' },
      { status: 500 }
    );
  }
}
