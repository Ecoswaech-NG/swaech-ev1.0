import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const keyword   = searchParams.get("q")         ?? "";
    const make      = searchParams.get("make")       ?? "";
    const model     = searchParams.get("model")      ?? "";
    const category  = searchParams.get("category")   ?? "";
    const type      = searchParams.get("type")       ?? "";
    const condition = searchParams.get("condition")  ?? "";
    const location  = searchParams.get("location")   ?? "";
    const minPrice  = Number(searchParams.get("minPrice") ?? 0);
    const maxPrice  = Number(searchParams.get("maxPrice") ?? 0);
    const sortBy    = searchParams.get("sort")       ?? "newest";
    const page      = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit     = 20;
    const skip      = (page - 1) * limit;

    // ── Build where clause ────────────────────────────────────────────────────

    const where: any = {
      status: "active",
    };

    // Keyword — searches across title, make, model, description
    if (keyword) {
      where.OR = [
        { listingTitle:       { contains: keyword, mode: "insensitive" } },
        { make:               { contains: keyword, mode: "insensitive" } },
        { model:              { contains: keyword, mode: "insensitive" } },
        { listingDescription: { contains: keyword, mode: "insensitive" } },
        { category:           { contains: keyword, mode: "insensitive" } },
        { location:           { contains: keyword, mode: "insensitive" } },
        { color:              { contains: keyword, mode: "insensitive" } },
      ];
    }

    if (make)      where.make      = { contains: make,      mode: "insensitive" };
    if (model)     where.model     = { contains: model,     mode: "insensitive" };
    if (category)  where.category  = { contains: category,  mode: "insensitive" };
    if (type)      where.type      = { contains: type,      mode: "insensitive" };
    if (condition) where.condition = { contains: condition,  mode: "insensitive" };
    if (location)  where.location  = { contains: location,  mode: "insensitive" };

    if (minPrice > 0 || maxPrice > 0) {
      where.sellingPrice = {
        ...(minPrice > 0 && { gte: minPrice }),
        ...(maxPrice > 0 && { lte: maxPrice }),
      };
    }

    // ── Sort ──────────────────────────────────────────────────────────────────

    const orderBy: any =
      sortBy === "price_asc"  ? { sellingPrice: "asc"  } :
      sortBy === "price_desc" ? { sellingPrice: "desc" } :
      sortBy === "year_desc"  ? { year:         "desc" } :
      sortBy === "year_asc"   ? { year:         "asc"  } :
                                { id:            "desc" }; // newest

    // ── Query ─────────────────────────────────────────────────────────────────

    const [listings, total] = await Promise.all([
      prisma.carListing.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { take: 1, select: { imageUrl: true } },
          batteryReport: {
            select: { id: true, grade: true, sohScore: true },
          },
        },
      }),
      prisma.carListing.count({ where }),
    ]);

    // ── Aggregations for filter options ───────────────────────────────────────
    // Only fetch on first page so the sidebar can populate

    let aggregations = null;
    if (page === 1) {
      const [makes, types, categories, locations] = await Promise.all([
        prisma.carListing.groupBy({
          by: ["make"], where: { status: "active" },
          _count: true, orderBy: { _count: { make: "desc" } }, take: 30,
        }),
        prisma.carListing.groupBy({
          by: ["type"], where: { status: "active" },
          _count: true, orderBy: { _count: { type: "desc" } },
        }),
        prisma.carListing.groupBy({
          by: ["category"], where: { status: "active" },
          _count: true, orderBy: { _count: { category: "desc" } }, take: 20,
        }),
        prisma.carListing.groupBy({
          by: ["location"], where: { status: "active" },
          _count: true, orderBy: { _count: { location: "desc" } }, take: 20,
        }),
      ]);
      aggregations = { makes, types, categories, locations };
    }

    const formatted = listings.map((l: any) => ({
      ...l,
      images: l.images.map((img: any) => ({ imageUrl: img.imageUrl })),
    }));

    return NextResponse.json({
      listings:     formatted,
      total,
      page,
      totalPages:   Math.ceil(total / limit),
      aggregations,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Search error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}