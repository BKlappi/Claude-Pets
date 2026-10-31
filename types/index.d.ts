export type Species = 'blob' | 'moth' | 'ghost' | 'crab' | 'sprout'

export type Mood = 'neutral' | 'happy' | 'proud' | 'worried' | 'scared' | 'sleepy'

export type Pet = {
  id: string
  name: string
  species: Species
  xp: number
  bornAt: number
  pats: number
  turns: number
  mood: Mood
  line: string
  lineAt: number
  lastActiveAt: number
  failStreak: number
  hat: string | null
  dye: string | null
  hasGivenEgg: boolean
  // When it last grew into a new title, for the burst drawn after.
  evolvedAt?: number
}

// Everything the person owns, kept once per user in the mod's store and
// shared by every session and project.
export type Save = {
  pets: Pet[]
  activeId: string | null
  coins: number
  owned: string[]
  eggs: number
  isShopOpen: boolean
  patDay: string
  patXp: number
  updatedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    pet: {
      save: Shaped<Save>
      isHidden: boolean
      tick: number
    }
  }
}
