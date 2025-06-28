import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const parts = await prisma.part.findMany({
      select: {
        partId: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json({ parts });
  } catch (error) {
    console.error("Error fetching parts:", error);
    return NextResponse.json({ message: "Failed to fetch parts" }, { status: 500 });
  }
}
