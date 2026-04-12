'use client'

import { useState, useRef, useEffect } from 'react'
import { PlanDetails, IdeaItem } from '../../types'
import { getIdeaIcon } from '../../lib/utils'
import TopBar from '../TopBar'

interface Props {
  planDetails: PlanDetails
  ideas:       IdeaItem[]
  onAddIdea:   (idea: IdeaItem) => void
  onGenerate:  () => void
  showToast:   (msg: string) => void
}

// ── Internal helpers ────────────────────────────────────────────────────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-[14px]">
      <span className="text-[0.7rem] font-semibold tracking-[0.09em] uppercase text-ink-faint whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-cream-deep" />
    </div>
  )
}

function IdeaCard({ idea }: { idea: IdeaItem }) {
  return (
    <div
      className="bg-white border border-cream-deep rounded-card px-3.5 py-[11px] flex items-start gap-2.5 shadow-soft animate-pop-in"
      role="listitem"
    >
      <span className="text-[1.05rem] flex-shrink-0 mt-px" aria-hidden="true">
        {getIdeaIcon(idea.text)}
      </span>
      <div className="flex-1">
        <p className="text-[0.88rem] text-ink leading-[1.45] break-words">{idea.text}</p>
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {/* Budget chip */}
          <span
            className="text-[0.68rem] font-semibold px-2 py-[2px] rounded-full bg-sand-light text-sand"
            aria-label={`Budget: ${idea.budget}`}
          >
            {idea.budget}
          </span>
          {/* Dealbreaker chip */}
          {idea.dealbreaker && (
            <span
              className="text-[0.68rem] font-semibold px-2 py-[2px] rounded-full bg-terra-light text-terra"
              aria-label={`Dealbreaker: ${idea.dealbreaker}`}
            >
              🚫 {idea.dealbreaker}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Idea count hint text ────────────────────────────────────────────────────
function genHint(count: number): string {
  if (count === 0) return 'Add at least one idea to generate an itinerary'
  if (count === 1) return '1 idea added — add more or generate now'
  return `${count} ideas in the sandbox — AI will reconcile them all`
}

/** Best-effort day count from CreatorSetup's free-text dates (e.g. "Aug 12–14", "3 days"). */
function inferTripDays(dates: string): number {
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
function buildIdeasPayload(
  plan: PlanDetails,
  board: IdeaItem[],
  draftText: string,
  draftBudget: string,
  draftDealbreaker: string,
): string {
  const lines: string[] = []
  if (plan.name.trim()) lines.push(`Trip name: ${plan.name.trim()}`)
  if (plan.dates.trim()) lines.push(`Dates / duration: ${plan.dates.trim()}`)
  if (lines.length) lines.push('')
  board.forEach((idea, i) => {
    let row = `${i + 1}. ${idea.text} [max budget: ${idea.budget}]`
    if (idea.dealbreaker.trim()) row += ` [dealbreakers: ${idea.dealbreaker.trim()}]`
    lines.push(row)
  })
  const draft = draftText.trim()
  if (draft) {
    if (board.length) lines.push('')
    lines.push(
      `${board.length ? 'Also typed in the form (not yet on the board)' : 'Idea from the form'}: ${draft} [max budget: ${draftBudget}]` +
        (draftDealbreaker.trim() ? ` [dealbreakers: ${draftDealbreaker.trim()}]` : ''),
    )
  }
  return lines.join('\n')
}

// ── Screen component ────────────────────────────────────────────────────────

export default function IdeaSandbox({ planDetails, ideas, onAddIdea, onGenerate, showToast }: Props) {
  const [ideaText,     setIdeaText]     = useState('')
  const [budget,       setBudget]       = useState<'$' | '$$' | '$$$'>('$$')
  const [dealbreaker,  setDealbreaker]  = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [trip, setTrip] = useState(null);

  // Focus textarea on mount so mobile users can start typing immediately
  useEffect(() => { textareaRef.current?.focus() }, [])

  const handleAdd = () => {
    const text = ideaText.trim()
    if (!text) {
      showToast('Write an idea or paste a link first.')
      textareaRef.current?.focus()
      return
    }
    onAddIdea({
      id:          crypto.randomUUID(),
      text,
      budget,
      dealbreaker: dealbreaker.trim(),
    })
    setIdeaText('')
    setDealbreaker('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter (without Shift) submits; Shift+Enter inserts newline
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }
  }

  /** Returns true only when the API returns a usable itinerary (so the app can advance). */
  const handleGenerateTrip = async (): Promise<boolean> => {
    const hasBoard = ideas.length > 0
    const hasDraft = ideaText.trim().length > 0
    if (!hasBoard && !hasDraft) {
      showToast('Add at least one idea (or finish typing in the form) first.')
      return false
    }

    const loc = planDetails.location.trim() || 'your destination'
    const orderData = {
      location: loc,
      days: inferTripDays(planDetails.dates),
      ideas: buildIdeasPayload(
        planDetails,
        ideas,
        ideaText,
        budget,
        dealbreaker,
      ),
    }

    try {
      const response = await fetch('/api/generate-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })

      const tripData = await response.json()
      if (!response.ok || tripData?.error) {
        showToast(typeof tripData?.error === 'string' ? tripData.error : 'Failed to generate trip. Please try again.')
        return false
      }
      setTrip(tripData)
      return true
    } catch (error) {
      console.error('Generate trip error:', error)
      showToast('Could not reach the trip planner. Try again.')
      return false
    }
  }

  return (
    <section
      className="flex flex-col w-full max-w-[480px] min-h-[100dvh] px-5 pb-[52px] relative z-[1] animate-fade-up"
      role="main"
      aria-labelledby="s2-title"
      aria-live="polite"
    >
      <TopBar step="Step 1 / 3" />

      <h2
        id="s2-title"
        className="font-display text-[clamp(1.9rem,7.5vw,2.6rem)] leading-[1.13] tracking-[-0.02em] text-ink mb-[14px]"
      >
        Idea<br />Sandbox
      </h2>

      {/* ── Plan context bar ──────────────────────────────────── */}
      <div
        className="flex items-center flex-wrap gap-1.5 bg-white border border-cream-deep rounded-panel px-4 py-3 shadow-soft mb-[18px]"
        role="region"
        aria-label="Plan context"
      >
        {[
          { icon: '📍', value: planDetails.location },
          { icon: '🗓️', value: planDetails.dates },
          { icon: '✦',  value: planDetails.name },
        ].map(({ icon, value }, i) => (
          <span key={i} className="flex items-center gap-[5px] text-[0.8rem] text-ink-mid font-medium">
            {i > 0 && <span className="w-[3px] h-[3px] rounded-full bg-cream-deep mx-1" aria-hidden="true" />}
            {icon} <strong className="text-ink font-semibold">{value}</strong>
          </span>
        ))}
      </div>

      {/* ── Group Idea Board ──────────────────────────────────── */}
      <p className="text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-ink-faint mb-2">
        Group Idea Board
      </p>
      <div
        className={[
          'min-h-[108px] rounded-panel p-3 flex flex-col gap-2 bg-parchment mb-[14px]',
          'transition-all duration-[260ms]',
          ideas.length > 0
            ? 'border border-cream-deep'
            : 'border-[1.5px] border-dashed border-cream-deep',
        ].join(' ')}
        role="region"
        aria-label="Group idea board"
        aria-live="polite"
      >
        {ideas.length === 0 ? (
          <div className="text-center py-5 text-ink-faint text-[0.83rem] leading-relaxed">
            <span className="block text-[1.45rem] mb-1.5" aria-hidden="true">💭</span>
            Ideas from your group will appear here
          </div>
        ) : (
          ideas.map(idea => <IdeaCard key={idea.id} idea={idea} />)
        )}
      </div>

      {/* ── Add idea form ─────────────────────────────────────── */}
      <div className="bg-white border border-cream-deep rounded-panel p-[18px] shadow-soft mb-[14px]">
        <CardLabel>Add Your Idea</CardLabel>

        {/* Idea text */}
        <div className="mb-[13px]">
          <label htmlFor="inp-idea" className="block text-[0.74rem] font-semibold tracking-[0.05em] uppercase text-ink-mid mb-1.5">
            Idea or Link
          </label>
          <textarea
            id="inp-idea"
            ref={textareaRef}
            value={ideaText}
            onChange={e => setIdeaText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. New sushi resturant in Ottawa, a Google Maps link, rooftop bar, hidden gems, Instagram link, etc…"
            className="textarea-field"
          />
        </div>

        {/* Budget + Dealbreaker side by side */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="inp-budget" className="block text-[0.74rem] font-semibold tracking-[0.05em] uppercase text-ink-mid mb-1.5">
              Max Budget
            </label>
            <select
              id="inp-budget"
              value={budget}
              onChange={e => setBudget(e.target.value as '$' | '$$' | '$$$')}
              aria-label="Maximum budget"
              className="select-field"
            >
              <option value="$">$ — Budget</option>
              <option value="$$">$$ — Mid-range</option>
              <option value="$$$">$$$ — Premium</option>
            </select>
          </div>
          <div>
            <label htmlFor="inp-deal" className="block text-[0.74rem] font-semibold tracking-[0.05em] uppercase text-ink-mid mb-1.5">
              Dealbreakers
            </label>
            <input
              id="inp-deal"
              type="text"
              value={dealbreaker}
              onChange={e => setDealbreaker(e.target.value)}
              placeholder="e.g. No seafood"
              maxLength={52}
              className="input-field"
            />
          </div>
        </div>

        {/* Add button */}
        <div className="flex justify-end mt-3">
          <button
            onClick={handleAdd}
            className="flex items-center justify-center gap-1.5 px-4 py-[10px] rounded-card bg-sage text-white font-semibold text-[0.83rem] shadow-[0_2px_10px_rgba(122,158,142,0.2)] transition-all active:scale-[0.97] hover:bg-[#6a8e7e] [-webkit-tap-highlight-color:transparent]"
            aria-label="Add idea to sandbox"
          >
            ＋ Add to Sandbox
          </button>
        </div>
      </div>

      {/* ── Sticky generate button ────────────────────────────── */}
      <div className="sticky bottom-0 pt-[14px] bg-gradient-to-t from-cream from-[70%] to-transparent">
        <button
          onClick={async () => {
            const ok = await handleGenerateTrip()
            if (ok) onGenerate()
          }}
          className="btn-primary bg-ink text-white shadow-[0_2px_10px_rgba(44,43,40,0.16)] hover:bg-[#1c1b18]"
          aria-label="Generate AI itinerary"
        >
          <span aria-hidden="true">✦</span> Generate Itinerary (AI)
        </button>
        <p className="text-center text-[0.73rem] text-ink-faint mt-[7px]">
          {genHint(ideas.length)}
        </p>
      </div>
    </section>
  )
}
