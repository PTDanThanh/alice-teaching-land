import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json(
      {
        success: false,
        message: 'Email and password are required',
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Login route ready for TypeScript migration',
    data: {
      email: body.email,
    },
  });
}
