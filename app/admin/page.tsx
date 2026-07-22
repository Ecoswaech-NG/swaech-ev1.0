

import { prisma } from "@/lib/prisma";
import AdminStationsClient from "@/components/charging-stations/AdminStationsClient";

export const dynamic = "force-dynamic";

export default async function AdminStationsPage() {
  const [pending, approved, all] = await Promise.all([
    prisma.chargingStation.count({ where: { status: "pending"  } }),
    prisma.chargingStation.count({ where: { status: "approved" } }),
    prisma.chargingStation.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { stationReviews: { select: { rating: true } } },
    }),
  ]);

  const stations = all.map((s: (typeof all)[number]) => ({
    ...s,
    avgRating: s.stationReviews.length
      ? s.stationReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / s.stationReviews.length
      : null,
  }));

  return (
    <AdminStationsClient
      stations={stations}
      stats={{ pending, approved, total: all.length }}
    />
  );
}