export interface Participant {
  name: string;
  phone: string;
  email?: string;
  pokeEnvKey: string;
}

export interface AvailabilityEntry {
  participantName: string;
  availableDates: string[];
  submittedAt: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  duration: string;
  itinerary: string;
  videoFile?: string;
  transcript?: string;
  status: "draft" | "voting" | "approved" | "scheduling" | "scheduled";
  participants: Participant[];
  availability: AvailabilityEntry[];
  scheduledTime?: string;
}

const trips: Map<string, Trip> = new Map();

trips.set("trip-001", {
  id: "trip-001",
  title: "Bali Beach Getaway",
  destination: "Bali, Indonesia",
  duration: "5 days",
  itinerary: [
    "Day 1: Arrive in Denpasar, transfer to Ubud, check in at villa, evening walk through rice terraces.",
    "Day 2: Morning yoga session, visit Tegallalang Rice Terrace, lunch at local warung, afternoon at Tirta Empul Temple.",
    "Day 3: Drive to Seminyak, beach day at Double Six Beach, sunset drinks at Potato Head.",
    "Day 4: Snorkeling trip to Nusa Penida, visit Kelingking Beach viewpoint, manta ray point.",
    "Day 5: Morning spa session, last-minute shopping at Seminyak Square, departure.",
  ].join("\n"),
  videoFile: "bali-reel.mp4",
  transcript:
    "Check out this insane Bali itinerary. Day one you land in Denpasar and head straight to Ubud...",
  status: "scheduling",
  participants: [
    { name: "Caden", phone: "+15162341156", pokeEnvKey: "POKE_API_KEY_CADEN" },
    { name: "Jaiyen", phone: "+15599173739", pokeEnvKey: "POKE_API_KEY_JAIYEN" },
    { name: "Veer", phone: "+16504445287", pokeEnvKey: "POKE_API_KEY_VEER" },
  ],
  availability: [],
});

export function getTrip(id: string): Trip | undefined {
  return trips.get(id);
}

export function listTrips(): Trip[] {
  return Array.from(trips.values());
}

export function listSchedulableTrips(): Trip[] {
  return Array.from(trips.values()).filter(
    (t) => t.status === "approved" || t.status === "scheduling",
  );
}

export function submitAvailability(
  tripId: string,
  participantName: string,
  availableDates: string[],
): { trip: Trip; overlap: string[] } | undefined {
  const trip = trips.get(tripId);
  if (!trip) return undefined;

  const existing = trip.availability.findIndex(
    (a) => a.participantName === participantName,
  );

  const entry: AvailabilityEntry = {
    participantName,
    availableDates,
    submittedAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    trip.availability[existing] = entry;
  } else {
    trip.availability.push(entry);
  }

  return { trip, overlap: computeOverlap(trip) };
}

export function getAvailability(tripId: string):
  | {
      entries: AvailabilityEntry[];
      overlap: string[];
      missingParticipants: string[];
    }
  | undefined {
  const trip = trips.get(tripId);
  if (!trip) return undefined;

  const submittedNames = new Set(trip.availability.map((a) => a.participantName));
  const missingParticipants = trip.participants
    .map((p) => p.name)
    .filter((name) => !submittedNames.has(name));

  return {
    entries: trip.availability,
    overlap: computeOverlap(trip),
    missingParticipants,
  };
}

function computeOverlap(trip: Trip): string[] {
  if (trip.availability.length === 0) return [];
  if (trip.availability.length < trip.participants.length) return [];

  const dateSets = trip.availability.map(
    (a) => new Set(a.availableDates),
  );

  const first = dateSets[0];
  const overlap: string[] = [];

  for (const date of first) {
    if (dateSets.every((s) => s.has(date))) {
      overlap.push(date);
    }
  }

  return overlap.sort();
}

export function confirmTripTime(
  tripId: string,
  scheduledTime: string,
): Trip | undefined {
  const trip = trips.get(tripId);
  if (!trip) return undefined;
  trip.scheduledTime = scheduledTime;
  trip.status = "scheduled";
  return trip;
}

export function createTrip(trip: Trip): Trip {
  trips.set(trip.id, trip);
  return trip;
}
