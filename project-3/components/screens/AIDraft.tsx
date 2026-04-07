'use client'

import { useState, useEffect } from 'react'
import { PlanDetails } from '../../types'
import TopBar from '../TopBar'

interface Props {
  planDetails:  PlanDetails
  onApprove:    () => void
  onRegenerate: () => void
  showToast:    (msg: string) => void
}

// ── Loading phrase rotation ─────────────────────────────────────────────────
const PHRASES = [
  "AI is synthesizing everyone's ideas…",
  'Weighing group preferences…',
  'Checking dealbreakers & dietary needs…',
  'Balancing budgets across the group…',
  'Finalising the perfect itinerary…',
]

// ── Itinerary data ──────────────────────────────────────────────────────────
// Swap this out later for a real LLM response shaped to this interface.

interface Stop {
  when:    string
  time:    string
  dotCls:  string        // Tailwind bg-* class for the timeline dot
  hasLine: boolean       // whether to draw a vertical connector below this dot
  name:    string
  desc:    string
  tags:    { label: string; cls: string }[]
}

const STOPS: Stop[] = [
  {
    when: 'Day 1', time: '12:00 PM', dotCls: 'bg-sage', hasLine: true,
    name: 'Arrival & Check-In',
    desc: 'Settle in and sync the group before the day kicks off.',
    tags: [
      { label: 'Logistics', cls: 'bg-sage-dim text-sage' },
      { label: '~1 hr',     cls: 'bg-cream-deep text-ink-faint' },
    ],
  },
  {
    when: 'Day 1', time: '2:00 PM', dotCls: 'bg-sage', hasLine: true,
    name: 'Lakefront Walk & Exploration',
    desc: 'Accessible scenic route — no stairs. Easy way to ease into the trip together.',
    tags: [
      { label: 'Outdoor', cls: 'bg-sage-dim text-sage' },
      { label: 'Free',    cls: 'bg-sand-light text-sand' },
      { label: '~1.5 hrs', cls: 'bg-cream-deep text-ink-faint' },
    ],
  },
  {
    when: 'Day 1', time: '7:00 PM', dotCls: 'bg-sand', hasLine: true,
    name: 'Group Dinner — El Camino Kitchen',
    desc: 'Street-style tacos & cocktails. Dealbreaker-safe: no seafood. Private table reserved.',
    tags: [
      { label: 'Dinner',     cls: 'bg-sage-dim text-sage' },
      { label: '$$',         cls: 'bg-sand-light text-sand' },
      { label: '0.4 mi away', cls: 'bg-cream-deep text-ink-faint' },
    ],
  },
  {
    when: 'Day 2', time: '10:00 AM', dotCls: 'bg-sage', hasLine: true,
    name: 'Brunch — The Publican',
    desc: 'Communal tables, great for groups. Vegetarian & gluten-free options available.',
    tags: [
      { label: 'Brunch', cls: 'bg-sage-dim text-sage' },
      { label: '$$',     cls: 'bg-sand-light text-sand' },
    ],
  },
  {
    when: 'Day 2', time: '1:00 PM', dotCls: 'bg-terra', hasLine: false,
    name: 'Art Institute of Chicago',
    desc: 'World-class collection, fully accessible. High group consensus — everyone voted for this.',
    tags: [
      { label: 'Culture',         cls: 'bg-sage-dim text-sage' },
      { label: '$',               cls: 'bg-sand-light text-sand' },
      { label: '⭐ High consensus', cls: 'bg-cream-deep text-ink-faint' },
    ],
  },
]

// ── Screen component ────────────────────────────────────────────────────────

export default function AIDraft({ planDetails, onApprove, onRegenerate, showToast }: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [loadLabel, setLoadLabel] = useState(PHRASES[0])

  // Run loading sequence on mount (and re-run when key changes = Regenerate)
  useEffect(() => {
    setIsLoading(true)
    setLoadLabel(PHRASES[0])
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % PHRASES.length
      setLoadLabel(PHRASES[idx])
    }, 900)
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setIsLoading(false)
    }, 2800)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [])

  return (
    <section
      className="flex flex-col w-full max-w-[480px] min-h-[100dvh] px-5 pb-[52px] relative z-[1] animate-fade-up"
      role="main"
      aria-labelledby="s3-title"
      aria-live="polite"
    >
      <TopBar step="Step 2 / 3" />

      <div className="flex-1 flex flex-col">

        {/* ── Loading pane ────────────────────────────────────── */}
        {isLoading && (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-5 py-10 text-center"
            role="status"
            aria-live="polite"
          >
            {/* Ripple ring — animated via .pulse-ring in globals.css */}
            <div
              className="pulse-ring w-[66px] h-[66px] rounded-full bg-sage-dim flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-[1.65rem]">✦</span>
            </div>

            <div>
              <p className="text-[0.9rem] text-ink-mid font-medium animate-load-pulse">
                {loadLabel}
              </p>
              {/* Bouncing dots — nth-child delays via Tailwind arbitrary variants */}
              <div className="flex gap-1.5 justify-center mt-2" aria-hidden="true">
                <span className="w-1.5 h-1.5 bg-sage-light rounded-full animate-bounce-dot" />
                <span className="w-1.5 h-1.5 bg-sage-light rounded-full animate-bounce-dot [animation-delay:.2s]" />
                <span className="w-1.5 h-1.5 bg-sage-light rounded-full animate-bounce-dot [animation-delay:.4s]" />
              </div>
            </div>

            <p className="text-[0.82rem] text-ink-mid leading-relaxed max-w-[256px]">
              Balancing ideas, budgets &amp; dealbreakers across your whole group.
            </p>
          </div>
        )}

        {/* ── Draft result ─────────────────────────────────────── */}
        {!isLoading && (
          <div className="flex flex-col gap-4 animate-fade-up">

            {/* Header */}
            <div>
              <h2
                id="s3-title"
                className="font-display text-[clamp(1.9rem,7.5vw,2.6rem)] leading-[1.13] tracking-[-0.02em] text-ink mb-2"
              >
                Proposed<br />Itinerary ✦
              </h2>
              <p className="text-[0.9rem] text-ink-mid leading-relaxed">
                Reviewed against all group input. Approve or ask for a fresh synthesis.
              </p>
            </div>

            {/* Consensus note */}
            <div
              className="flex items-start gap-2.5 bg-sage-dim border-[1.5px] border-sage/20 rounded-card p-3"
              role="note"
            >
              <span className="text-[0.95rem] flex-shrink-0 mt-px" aria-hidden="true">🤝</span>
              <p className="text-[0.8rem] text-sage font-medium leading-relaxed">
                Conflict-free · All dealbreakers respected · Budget within range for all members
              </p>
            </div>

            {/* ── Timeline card ──────────────────────────────────── */}
            <div
              className="bg-white border-[1.5px] border-cream-deep rounded-panel overflow-hidden shadow-float"
              role="region"
              aria-label="Proposed itinerary timeline"
            >
              {/* Card header */}
              <div className="bg-ink text-white px-[18px] py-[13px] flex items-center gap-2.5">
                <span className="text-[0.95rem]" aria-hidden="true">🗓️</span>
                <span className="text-[0.82rem] font-semibold tracking-[0.05em] uppercase">
                  Proposed Itinerary
                </span>
                <span className="ml-auto text-[0.72rem] text-white/50">
                  {planDetails.name}
                </span>
              </div>

              {/* Stops */}
              {STOPS.map((stop, i) => (
                <div
                  key={i}
                  className="px-[18px] py-[14px] flex items-start gap-3.5 border-b border-cream-deep last:border-b-0"
                >
                  {/* Time column */}
                  <div className="flex-shrink-0 min-w-[52px]">
                    <div className="text-[0.79rem] font-semibold text-sage">{stop.when}</div>
                    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.07em] text-ink-faint mt-0.5">
                      {stop.time}
                    </div>
                  </div>

                  {/* Timeline dot + vertical line */}
                  <div className="flex flex-col items-center pt-1 flex-shrink-0" aria-hidden="true">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stop.dotCls}`} />
                    {stop.hasLine && (
                      <div className="flex-1 w-px bg-cream-deep min-h-[22px] mt-1" />
                    )}
                  </div>

                  {/* Stop info */}
                  <div className="flex-1 pb-1">
                    <div className="text-[0.96rem] font-semibold text-ink leading-[1.3]">
                      {stop.name}
                    </div>
                    <div className="text-[0.8rem] text-ink-mid mt-0.5 leading-relaxed">
                      {stop.desc}
                    </div>
                    <div className="flex gap-[5px] flex-wrap mt-[7px]">
                      {stop.tags.map(tag => (
                        <span
                          key={tag.label}
                          className={`text-[0.66rem] font-semibold tracking-[0.04em] uppercase px-2 py-[2px] rounded-full ${tag.cls}`}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Vote buttons ──────────────────────────────────── */}
            <div>
              <p className="text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-ink-faint mb-2">
                Your vote
              </p>
              <div
                className="grid grid-cols-2 gap-2.5"
                role="group"
                aria-label="Vote on this itinerary"
              >
                <button
                  onClick={onApprove}
                  className="flex flex-col items-center gap-[5px] py-4 px-2.5 border-[1.5px] border-cream-deep rounded-panel bg-white font-semibold text-[0.84rem] text-ink-mid shadow-soft transition-all active:scale-[0.95] hover:border-sage hover:bg-sage-dim hover:text-sage [-webkit-tap-highlight-color:transparent]"
                  aria-label="Approve itinerary — looks good"
                >
                  <span className="text-[1.6rem] leading-none" aria-hidden="true">👍</span>
                  Looks Good
                </button>
                <button
                  onClick={onRegenerate}
                  className="flex flex-col items-center gap-[5px] py-4 px-2.5 border-[1.5px] border-cream-deep rounded-panel bg-white font-semibold text-[0.84rem] text-ink-mid shadow-soft transition-all active:scale-[0.95] hover:border-sand hover:bg-sand-light hover:text-sand [-webkit-tap-highlight-color:transparent]"
                  aria-label="Regenerate — ask AI for a new plan"
                >
                  <span className="text-[1.6rem] leading-none" aria-hidden="true">🔄</span>
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
