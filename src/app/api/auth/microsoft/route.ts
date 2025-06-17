import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

const SCOPES = [
  'offline_access',
  'Mail.Read',
  'Mail.Send',
  'Mail.ReadWrite',
  'Calendars.Read',
  'Calendars.ReadWrite',
].join(' ');

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const redirectUri = searchParams.get('redirect_uri') || process.env.NEXTAUTH_URL + '/api/auth/microsoft/callback';

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    response_mode: 'query',
    state: session.user.id, // Pass user ID in state to verify in callback
  });

  return NextResponse.redirect(`${MICROSOFT_AUTH_URL}?${params.toString()}`);
} 