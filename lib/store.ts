/**
 * In-memory store for hackathon speed.
 * In production this would be Supabase.
 */
import type { Event, Group } from "./schemas"

// Module-level singleton (persists across hot reloads in dev via global)
declare global {
  // eslint-disable-next-line no-var
  var __vibesync_store: Store | undefined
}

interface Store {
  events: Map<string, Event>
  groups: Map<string, Group>
}

function createStore(): Store {
  return {
    events: new Map(),
    groups: new Map(),
  }
}

export const store: Store =
  global.__vibesync_store ?? (global.__vibesync_store = createStore())

// --- Events ---

export function getEvent(id: string): Event | undefined {
  return store.events.get(id)
}

export function saveEvent(event: Event): void {
  store.events.set(event.id, event)
}

export function deleteEvent(id: string): boolean {
  return store.events.delete(id)
}

export function listEvents(): Event[] {
  return Array.from(store.events.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

// --- Groups ---

export function getGroup(id: string): Group | undefined {
  return store.groups.get(id)
}

export function saveGroup(group: Group): void {
  store.groups.set(group.id, group)
}

export function listGroups(): Group[] {
  return Array.from(store.groups.values())
}

// Seed a default demo group on first run
function seedDemoGroup() {
  if (store.groups.size === 0) {
    const demoGroup: Group = {
      id: "demo-group-1",
      name: "The Squad",
      members: [
        { id: "m1", name: "Veer", phone: "+16504445287" },
        { id: "m2", name: "Caden", phone: "+15162341156" },
        { id: "m3", name: "Jaiyen", phone: "+15599173739" },
      ],
    }
    store.groups.set(demoGroup.id, demoGroup)
  }
}

seedDemoGroup()
