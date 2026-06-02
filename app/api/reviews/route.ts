import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUser";

// GET /api/reviews?userId=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ reviews: [] });

  const reviews = await prisma.review.findMany({
    where:   { subjectId: userId },
    include: { reviewer: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
    take:    20,
  });

  const avg = reviews.length
    ? reviews.reduce((s: number, r) => s + r.rating, 0) / reviews.length
    : null;

  return NextResponse.json({ reviews, average: avg, count: reviews.length });
}

// POST /api/reviews
export async function POST(req: Request) {
  const session = await getUserFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subjectId, rating, comment, listingId } = await req.json();

  if (!subjectId || !rating || rating < 1 || rating > 5)
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  if (subjectId === session.userId)
    return NextResponse.json({ error: "Cannot review yourself" }, { status: 400 });

  const review = await prisma.review.create({
    data: {
      reviewerId: session.userId,
      subjectId,
      rating:     Number(rating),
      comment:    comment ?? null,
      listingId:  listingId ? Number(listingId) : null,
    },
  });

  return NextResponse.json({ success: true, review }, { status: 201 });
}