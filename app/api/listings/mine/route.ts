import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUser";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    if (!user?.email) {
      return NextResponse.json({ listings: [] });
    }

    const listings = await prisma.carListing.findMany({
      where: { 
        user: { email: user.email }
      },
      include: {
        images: {
          select: { imageUrl: true }
        },
        batteryReport: {
          select: { grade: true, sohScore: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ 
      listings: listings.map((listing: any) => ({
        id: listing.id,
        listingTitle: listing.listingTitle,
        make: listing.make,
        model: listing.model,
        year: listing.year,
        sellingPrice: listing.sellingPrice,
        mileage: listing.mileage,
        condition: listing.condition,
        images: listing.images,
        batteryReport: listing.batteryReport,
      }))
    });
  } catch (error) {
    console.error("Error fetching user listings:", error);
    return NextResponse.json({ listings: [], error: "Failed to fetch listings" }, { status: 500 });
  }
}
