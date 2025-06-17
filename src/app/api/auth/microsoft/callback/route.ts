import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MICROSOFT_GRAPH_URL = 'https://graph.microsoft.com/v1.0/me';

export async function GET(request: Request) {
  const session = await getServerSession();

  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=${error}`);
  }

  if (!code || !state || state !== session.user.id) {
    return new NextResponse('Invalid request', { status: 400 });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/microsoft/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();

    // Get user info from Microsoft Graph
    const userInfoResponse = await fetch(MICROSOFT_GRAPH_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userInfo = await userInfoResponse.json();

    // Store tokens in database
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        microsoftAccessToken: tokens.access_token,
        microsoftRefreshToken: tokens.refresh_token,
        microsoftTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        microsoftEmail: userInfo.mail || userInfo.userPrincipalName,
      },
    });

    // Create response with redirect
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard`);

    // Set secure cookies
    response.cookies.set('microsoft_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokens.expires_in,
    });

    if (tokens.refresh_token) {
      response.cookies.set('microsoft_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error('Error in Microsoft OAuth callback:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?error=oauth_failed`);
  }
} 