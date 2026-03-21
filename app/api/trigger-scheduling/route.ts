import { NextRequest, NextResponse } from "next/server";
import { getTrip } from "@/lib/data/trips";
import { sendSchedulingToAllParticipants } from "@/lib/poke";

export async function POST(request: NextRequest) {
  let body: { trip_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tripId = body.trip_id;
  if (!tripId) {
    return NextResponse.json(
      { error: "trip_id is required" },
      { status: 400 },
    );
  }

  const trip = getTrip(tripId);
  if (!trip) {
    return NextResponse.json(
      { error: `Trip '${tripId}' not found` },
      { status: 404 },
    );
  }

  if (trip.status === "scheduled") {
    return NextResponse.json(
      { error: "Trip is already scheduled", scheduledTime: trip.scheduledTime },
      { status: 409 },
    );
  }

  const { results, succeeded, failed } =
    await sendSchedulingToAllParticipants(trip);

  trip.status = "scheduling";

  return NextResponse.json({
    success: failed === 0,
    tripId: trip.id,
    status: trip.status,
    summary: `Sent to ${succeeded}/${results.length} participants`,
    results,
  });
}
