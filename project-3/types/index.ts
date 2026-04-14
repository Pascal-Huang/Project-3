// ── Domain types ──────────────────────────────────────────────────────────

export interface PlanDetails {
  name:     string
  location: string
  dates:    string
  group:    string
  budget:   string
}

/** Per-idea time footprint (dropdown in Idea Sandbox). */
export type TimeCommitment = 'regular' | 'half_day' | 'full_day' | 'anchor'

export interface IdeaItem {
  id:               string   // crypto.randomUUID()
  text:             string
  /** 1 = nice-to-have … 5 = must-include */
  priority:         number
  timeCommitment:   TimeCommitment
  dealbreaker:      string   // empty string if none
}

// The four screens of the app flow
export type Screen = 'setup' | 'sandbox' | 'draft' | 'success'
