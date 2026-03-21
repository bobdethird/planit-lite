import { NextRequest, NextResponse } from "next/server"
import { getEvent, saveEvent } from "@/lib/store"
import type { Vote } from "@/lib/schemas"
import { VoteRequestSchema } from "@/lib/zod-schemas"

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json()
    const parsed = VoteRequestSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      )
    }
    const { event_id, phone, vote } = parsed.data

    const event = getEvent(event_id)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Find the member by phone
    const member = event.group.members.find((m) => m.phone === phone)
    if (!member) {
      return NextResponse.json({ error: "Phone not in group" }, { status: 403 })
    }

    // Upsert vote (replace existing vote from same phone)
    const newVote: Vote = {
      user_id: member.id,
      phone,
      vote,
      voted_at: new Date().toISOString(),
    }

    const existingIndex = event.votes.findIndex((v) => v.phone === phone)
    if (existingIndex >= 0) {
      event.votes[existingIndex] = newVote
    } else {
      event.votes.push(newVote)
    }

    // Check quorum
    const yesVotes = event.votes.filter((v) => v.vote === "yes").length
    const totalMembers = event.group.members.length
    const quorumReached = yesVotes / totalMembers >= event.quorum_threshold

    if (
      quorumReached &&
      (event.status === "pending" || event.status === "voting")
    ) {
      event.status = "quorum_reached"
    }

    saveEvent(event)

    return NextResponse.json({
      vote: newVote,
      vote_count: {
        yes: yesVotes,
        no: event.votes.filter((v) => v.vote === "no").length,
        total: event.votes.length,
        members: totalMembers,
      },
      quorum_reached: quorumReached,
      event_status: event.status,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Vote failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
