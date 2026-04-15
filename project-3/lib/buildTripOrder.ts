import type { IdeaItem, PlanDetails, TimeCommitment } from '../types'

const TIME_COMMITMENT_LABEL: Record<TimeCommitment, string> = {
  regular: 'Regular visit (~1–2 hrs)',
  half_day: 'Half day',
  full_day: 'Full day',
  anchor: 'Trip anchor / major focus',
}

function priorityLabel(n: number): string {
  const p = Math.min(5, Math.max(1, Math.round(n)))
  const words = ['', 'Nice to have', 'Low', 'Medium', 'High', 'Must-include'] as const
  return `${p}/5 (${words[p]})`
}

function ideaMeta(idea: Pick<IdeaItem, 'priority' | 'timeCommitment'>): string {
  return `[priority: ${priorityLabel(idea.priority)}] [time: ${TIME_COMMITMENT_LABEL[idea.timeCommitment]}]`
}

/** JSON shape returned by `/api/generate-trip` (Gemini). */
export interface GeneratedTrip {
  tripName: string
  /**
   * Optional: present when the model detects conflicting preferences.
   * The UI can surface this so the group can make an explicit call.
   */
  harmonyPlan?: {
    conflicts: {
      /** Short label like "Active vs Chill day" */
      title: string
      /** What each side wants, in plain language */
      sides: string[]
      /** One-sentence explanation of why this is a conflict */
      why: string
      /**
       * The proposed resolution, using the "ladder":
       * 1) find something with both
       * 2) split the group for that event
       * 3) propose a new compromise idea
       */
      resolution: {
        strategy: 'both' | 'split' | 'new_idea'
        plan: string
      }
      /** If strategy is "split", suggest two sub-plans */
      splitSuggestion?: { groupA: string; groupB: string }
    }[]
    /** Quick, actionable note for the group (1–2 sentences). */
    note: string
  }
  itinerary: {
    day: number
    theme: string
    activities: { time: string; name: string; description: string; tags: string[] }[]
  }[]
}

export function isGeneratedTrip(x: unknown): x is GeneratedTrip {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return typeof o.tripName === 'string' && Array.isArray(o.itinerary)
}

/** Best-effort day count from CreatorSetup's free-text dates (e.g. "Aug 12–14", "3 days"). */
export function inferTripDays(dates: string): number {
  const d = dates.trim()
  if (!d) return 3
  const dayWord = d.match(/(\d+)\s*days?/i)
  if (dayWord) return Math.min(14, Math.max(1, parseInt(dayWord[1], 10)))
  if (/\d+\s*hours?/i.test(d)) return 1
  const span = d.match(/(\d{1,2})\s*[–-]\s*(\d{1,2})/)
  if (span) {
    const a = parseInt(span[1], 10)
    const b = parseInt(span[2], 10)
    if (b >= a && b - a <= 30) return Math.min(14, Math.max(1, b - a + 1))
  }
  const n = parseInt(d.match(/\b(\d{1,2})\b/)?.[1] ?? '', 10)
  if (n >= 1 && n <= 14) return n
  return 3
}

/** Builds the single `ideas` string the generate-trip API sends to the model. */
export function buildIdeasPayload(
  plan: PlanDetails,
  board: IdeaItem[],
  draftText: string,
  draft: Pick<IdeaItem, 'priority' | 'timeCommitment' | 'dealbreaker'>,
): string {
  const lines: string[] = []
  if (plan.name.trim()) lines.push(`Trip name: ${plan.name.trim()}`)
  if (plan.dates.trim()) lines.push(`Dates / duration: ${plan.dates.trim()}`)
  if (plan.group.trim()) lines.push(`Group dynamic: ${plan.group.trim()}`)
  if (plan.budget.trim()) lines.push(`Overall trip budget: ${plan.budget.trim()}`)
  if (lines.length) lines.push('')
  board.forEach((idea, i) => {
    let row = `${i + 1}. ${idea.text} ${ideaMeta(idea)}`
    if (idea.dealbreaker.trim()) row += ` [dealbreakers: ${idea.dealbreaker.trim()}]`
    lines.push(row)
  })
  const draftT = draftText.trim()
  if (draftT) {
    if (board.length) lines.push('')
    const meta = ideaMeta(draft)
    lines.push(
      `${board.length ? 'Also typed in the form (not yet on the board)' : 'Idea from the form'}: ${draftT} ${meta}` +
        (draft.dealbreaker.trim() ? ` [dealbreakers: ${draft.dealbreaker.trim()}]` : ''),
    )
  }

  console.log('buildIdeasPayload lines:', lines)

  return lines.join('\n')
}

export interface DraftFields {
  text: string
  priority: number
  timeCommitment: TimeCommitment
  dealbreaker: string
}

const emptyDraft = (): DraftFields => ({
  text: '',
  priority: 3,
  timeCommitment: 'half_day',
  dealbreaker: '',
})

/** Body for `POST /api/generate-trip` — same shape from Sandbox (with draft) and Draft (board only). */
export function buildOrderData(
  plan: PlanDetails,
  ideas: IdeaItem[],
  draft?: DraftFields,
) {
  const d = draft ?? emptyDraft()
  const planOut = {
    name: plan.name.trim(),
    dates: plan.dates.trim(),
    group: plan.group.trim(),
    budget: plan.budget.trim(),
  }
  return {
    location: plan.location.trim() || 'your destination',
    days: inferTripDays(plan.dates),
    plan: planOut,
    ideas: buildIdeasPayload(plan, ideas, d.text, d),
  }
}
