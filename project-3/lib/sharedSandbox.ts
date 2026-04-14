import type { IdeaItem, PlanDetails } from '../types'

/** Stored in JSONBin for group sandbox collaboration. */
export interface SharedSandboxRecord {
  v: 1
  planDetails: PlanDetails
  ideas: IdeaItem[]
  updatedAt: string
}

export function isTimeCommitment(x: unknown): x is IdeaItem['timeCommitment'] {
  return x === 'regular' || x === 'half_day' || x === 'full_day' || x === 'anchor'
}

export function isPlanDetails(x: unknown): x is PlanDetails {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.name === 'string' &&
    typeof o.location === 'string' &&
    typeof o.dates === 'string' &&
    typeof o.group === 'string' &&
    typeof o.budget === 'string'
  )
}

export function isIdeaItem(x: unknown): x is IdeaItem {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.text === 'string' &&
    typeof o.priority === 'number' &&
    isTimeCommitment(o.timeCommitment) &&
    typeof o.dealbreaker === 'string'
  )
}

export function isSharedSandboxRecord(x: unknown): x is SharedSandboxRecord {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  if (o.v !== 1) return false
  if (typeof o.updatedAt !== 'string') return false
  if (!isPlanDetails(o.planDetails)) return false
  if (!Array.isArray(o.ideas) || !o.ideas.every(isIdeaItem)) return false
  return true
}

export function buildSharedRecord(planDetails: PlanDetails, ideas: IdeaItem[]): SharedSandboxRecord {
  return {
    v: 1,
    planDetails: {
      name: planDetails.name,
      location: planDetails.location,
      dates: planDetails.dates,
      group: planDetails.group,
      budget: planDetails.budget,
    },
    ideas: ideas.map(i => ({
      id: i.id,
      text: i.text,
      priority: i.priority,
      timeCommitment: i.timeCommitment,
      dealbreaker: i.dealbreaker,
    })),
    updatedAt: new Date().toISOString(),
  }
}
