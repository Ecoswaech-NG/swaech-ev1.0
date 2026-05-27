import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

interface Props { params: Promise<{ userid: string }> }

export async function GET(_req: Request, { params }: Props) {
  const { userid } = await params;
  const userId = userid;

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, fullName: true, email: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const listings = await prisma.carListing.findMany({
    where:   { userId, status: "active" },
    include: {
      images:        { take: 1, select: { imageUrl: true } },
      batteryReport: { select: { id: true, grade: true, sohScore: true } },
    },
    orderBy: { id: "desc" },
  });

  return NextResponse.json({
    user:     { ...user, listingCount: listings.length },
    listings: listings.map((l: any) => ({ ...l, images: l.images.map((i: any) => ({ imageUrl: i.imageUrl })) })),
  });
}