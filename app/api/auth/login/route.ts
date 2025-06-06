import { NextRequest, NextResponse } from 'next/server';

// This endpoint is a placeholder for Next.js API routes
// The actual authentication is handled by the Plain Node.js backend on port 3001
// This route could be used for logout or client-side auth state management in the future

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Authentication is handled by the backend API on port 3001',
      redirectTo: 'http://localhost:3001/api/auth/login'
    }, 
    { status: 501 }
  );
}

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { 
      message: 'Authentication status endpoint',
      authBackend: 'http://localhost:3001/api/auth'
    }, 
    { status: 200 }
  );
}