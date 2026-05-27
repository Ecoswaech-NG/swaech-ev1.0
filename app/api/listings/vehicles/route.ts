import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/getUser";

function calculateSoH(voltage: number, mileage: number): number {
  if (voltage > 380 && mileage < 50000)  return 90;
  if (voltage > 360 && mileage < 100000) return 80;
  if (voltage > 340 && mileage < 150000) return 70;
  return 60;
}

function getGrade(soh: number): string {
  if (soh >= 85) return "A";
  if (soh >= 70) return "B";
  if (soh >= 50) return "C";
  return "D";
}

export async function POST(req: Request) {
  const session = await getUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const required = [
      "location", "type", "sellingPrice", "category", "condition",
      "make", "model", "year", "driveType", "range", "power",
      "mileage", "batterySize", "maxSpeed", "color", "door", "listingDescription",
    ];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Type coercions matching schema.prisma exactly ─────────────────────────
    // sellingPrice: Float   year: Int   range: Int
    // mileage: Int          batterySize: Float
    const sellingPrice = parseFloat(String(body.sellingPrice));
    const year         = parseInt(String(body.year), 10);
    const range        = parseInt(String(body.range), 10);
    const mileage      = parseInt(String(body.mileage), 10);
    const batterySize  = parseFloat(String(body.batterySize));

    if (isNaN(sellingPrice) || isNaN(year) || isNaN(range) || isNaN(mileage) || isNaN(batterySize)) {
      return NextResponse.json(
        { error: "sellingPrice, year, range, mileage and batterySize must be valid numbers" },
        { status: 400 }
      );
    }

    const vin             = String(body.vin ?? "").trim() || null;
    const hasVoltage      = body.voltage      && !isNaN(Number(body.voltage));
    const hasCapacity     = body.batteryCapacity && !isNaN(Number(body.batteryCapacity));
    const canAutoPassport = vin && hasVoltage && hasCapacity;

    const result = await prisma.$transaction(async (tx: any) => {
      let batteryReportId: string | null = null;

      if (canAutoPassport) {
        const voltage         = Number(body.voltage);
        const batteryCapacity = Number(body.batteryCapacity);
        const sohScore        = calculateSoH(voltage, mileage);
        const grade           = getGrade(sohScore);

        const vehicle = await tx.vehicle.create({
          data: { make: body.make, model: body.model, year, ownerId: session.userId },
        });

        const report = await tx.batteryReport.create({
          data: {
            vin,
            vehicleId:      vehicle.id,
            userId:         session.userId,
            batteryCapacity,
            voltage,
            mileage,
            sohScore,
            grade,
            notes: `Auto-generated from vehicle listing. VIN: ${vin}`,
          },
        });

        batteryReportId = report.id;
      }

      const listing = await tx.carListing.create({
        data: {
          listingTitle:       body.listingTitle ?? null,
          location:           body.location,
          type:               body.type,
          sellingPrice,                          // Float
          category:           body.category,
          condition:          body.condition,
          make:               body.make,
          model:              body.model,
          year,                                  // Int
          driveType:          body.driveType,
          range,                                 // Int
          power:              body.power,
          mileage,                               // Int
          batterySize,                           // Float
          maxSpeed:           body.maxSpeed,
          color:              body.color,
          door:               body.door,
          offerType:          body.offerType     ?? null,
          vin,
          listingDescription: body.listingDescription,
          features:           body.features      ?? {},
          createdBy:          body.createdBy,
          userName:           body.userName       ?? "",
          userImageUrl:       body.userImageUrl   ?? null,
          postedOn:           new Date().toISOString(),
          userId:             session.userId,
          batteryReportId,
        },
      });

      return { listing, batteryReportId };
    }, { timeout: 10000, maxWait: 5000 });

    return NextResponse.json({
      success:          true,
      id:               result.listing.id,
      batteryReportId:  result.batteryReportId,
      hasBatteryReport: !!result.batteryReportId,
    }, { status: 201 });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Vehicle listing error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}