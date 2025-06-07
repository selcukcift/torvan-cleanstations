import { NextRequest, NextResponse } from 'next/server';

// This endpoint is handled by NextAuth.js
// Redirect to the appropriate NextAuth endpoint

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { 
      message: 'Authentication is handled by NextAuth.js',
      redirectTo: '/api/auth/signin'
    }, 
    { status: 302 }
  );
}

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { 
      message: 'Authentication status endpoint',
      authProvider: 'NextAuth.js',
      endpoints: {
        signin: '/api/auth/signin',
        signout: '/api/auth/signout',
        session: '/api/auth/session'
      }
    }, 
    { status: 200 }
  );
}