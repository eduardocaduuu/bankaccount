import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.API_INTERNAL_TOKEN || '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://controle-ponto-api-3kle.onrender.com';

  return NextResponse.json({
    hasToken: token.length > 0,
    tokenLength: token.length,
    tokenPreview: token.length > 0 ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : 'NO TOKEN',
    apiUrl,
  });
}
