// PLACE AT: app/api/stations/status/route.ts
// POST /api/stations/status  — operator/device pings to record uptime
// GET  /api/stations/status  — get live status for all approved stations

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Operators or IoT devices call this to register a live ping
export async function POST(req: Request) {
  try {
    const { stationId, isOnline } = await req.json();
    if (!stationId) return NextResponse.json({ error: "stationId required" }, { status: 400 });

    const now = new Date();

    // Log the ping
    await prisma.stationStatusLog.create({
      data: { stationId, isOnline: isOnline ?? true },
    });

    // Update the station's lastPingAt + compute uptime from last 24h logs
    const last24h = await prisma.stationStatusLog.findMany({
      where: {
        stationId,
        loggedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    });

    const uptimePercent = last24h.length
      ? (last24h.filter((l: any) => l.isOnline).length / last24h.length) * 100
      : 100;

    await prisma.chargingStation.update({
      where: { id: stationId },
      data: {
        lastPingAt:    now,
        isAvailable:   isOnline ?? true,
        uptimePercent: Math.round(uptimePercent),
      },
    });

    return NextResponse.json({ ok: true, uptimePercent });
  } catch (error) {
    console.error("Status ping error:", error);
    return NextResponse.json({ error: "Ping failed" }, { status: 500 });
  }
}

// Called by the map to get a live status snapshot for all stations
export async function GET() {
  try {
    const stations = await prisma.chargingStation.findMany({
      where:  { status: "approved" },
      select: {
        id:            true,
        isAvailable:   true,
        lastPingAt:    true,
        uptimePercent: true,
      },
    });

    const TEN_MIN = 10 * 60 * 1000;
    const now     = Date.now();

    const withLive = stations.map((s) => ({
      ...s,
      isLive: s.lastPingAt
        ? now - new Date(s.lastPingAt).getTime() < TEN_MIN
        : false,
    }));

    return NextResponse.json({ stations: withLive });

  } catch (error) {
    console.error("Station status fetch error:", error);
    return NextResponse.json({ stations: [] }, { status: 500 });
    // Returns empty array instead of empty body — client won't crash
  }
}