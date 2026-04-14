import { NextResponse } from 'next/server'
import {
  buildSharedRecord,
  isIdeaItem,
  isPlanDetails,
  isSharedSandboxRecord,
} from '@/lib/sharedSandbox'

const JSONBIN = 'https://api.jsonbin.io/v3/b'

function jsonbinKey(): string | null {
  const k =
    process.env.JSONBIN_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_JSONBIN_API_KEY?.trim()
  return k || null
}

function jsonbinHeaders(): HeadersInit {
  const key = jsonbinKey()
  if (!key) throw new Error('MISSING_KEY')
  return {
    'Content-Type': 'application/json',
    'X-Master-Key': key,
  }
}

async function readJsonbinJson(res: Response): Promise<unknown> {
  const text = await res.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { raw: text }
  }
}

function extractRecord(data: unknown): unknown {
  if (data && typeof data === 'object' && 'record' in data) {
    return (data as { record: unknown }).record
  }
  return data
}

function extractBinMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message: unknown }).message
    return typeof m === 'string' ? m : 'JSONBin request failed'
  }
  return 'JSONBin request failed'
}

export async function POST(req: Request) {
  try {
    if (!jsonbinKey()) {
      return NextResponse.json(
        { error: 'JSONBin API key is not configured (JSONBIN_API_KEY).' },
        { status: 500 },
      )
    }
    const body = (await req.json()) as unknown
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const { planDetails, ideas } = body as { planDetails?: unknown; ideas?: unknown }
    if (!isPlanDetails(planDetails)) {
      return NextResponse.json({ error: 'Invalid planDetails' }, { status: 400 })
    }
    const ideaList = Array.isArray(ideas) ? ideas : []
    for (const item of ideaList) {
      if (!isIdeaItem(item)) {
        return NextResponse.json({ error: 'Invalid idea in ideas list' }, { status: 400 })
      }
    }
    const record = buildSharedRecord(planDetails, ideaList)

    const res = await fetch(JSONBIN, {
      method: 'POST',
      headers: jsonbinHeaders(),
      body: JSON.stringify(record),
    })
    const data = await readJsonbinJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: extractBinMessage(data) },
        { status: res.status === 401 || res.status === 403 ? res.status : 502 },
      )
    }
    const meta =
      data && typeof data === 'object' && 'metadata' in data
        ? (data as { metadata: { id?: string } }).metadata
        : null
    const binId = meta?.id
    if (typeof binId !== 'string' || !binId) {
      return NextResponse.json({ error: 'JSONBin did not return a bin id' }, { status: 502 })
    }

    const origin = new URL(req.url).origin
    const shareUrl = `${origin}/?share=${encodeURIComponent(binId)}`
    return NextResponse.json({ binId, shareUrl, record })
  } catch (e) {
    if (e instanceof Error && e.message === 'MISSING_KEY') {
      return NextResponse.json({ error: 'JSONBin API key missing' }, { status: 500 })
    }
    console.error('share-bin POST', e)
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    if (!jsonbinKey()) {
      return NextResponse.json(
        { error: 'JSONBin API key is not configured (JSONBIN_API_KEY).' },
        { status: 500 },
      )
    }
    const binId = new URL(req.url).searchParams.get('binId')
    if (!binId?.trim()) {
      return NextResponse.json({ error: 'Missing binId query parameter' }, { status: 400 })
    }

    const res = await fetch(`${JSONBIN}/${encodeURIComponent(binId)}/latest`, {
      method: 'GET',
      headers: jsonbinHeaders(),
    })
    const data = await readJsonbinJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: extractBinMessage(data) },
        { status: res.status === 404 ? 404 : 502 },
      )
    }
    const record = extractRecord(data)
    if (!isSharedSandboxRecord(record)) {
      return NextResponse.json({ error: 'Shared data is missing or invalid' }, { status: 422 })
    }
    return NextResponse.json({ binId, record })
  } catch (e) {
    if (e instanceof Error && e.message === 'MISSING_KEY') {
      return NextResponse.json({ error: 'JSONBin API key missing' }, { status: 500 })
    }
    console.error('share-bin GET', e)
    return NextResponse.json({ error: 'Failed to load shared sandbox' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    if (!jsonbinKey()) {
      return NextResponse.json(
        { error: 'JSONBin API key is not configured (JSONBIN_API_KEY).' },
        { status: 500 },
      )
    }
    const body = (await req.json()) as unknown
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const { binId, planDetails, ideas } = body as {
      binId?: unknown
      planDetails?: unknown
      ideas?: unknown
    }
    if (typeof binId !== 'string' || !binId.trim()) {
      return NextResponse.json({ error: 'Missing binId' }, { status: 400 })
    }
    if (!isPlanDetails(planDetails)) {
      return NextResponse.json({ error: 'Invalid planDetails' }, { status: 400 })
    }
    const ideaList = Array.isArray(ideas) ? ideas : []
    for (const item of ideaList) {
      if (!isIdeaItem(item)) {
        return NextResponse.json({ error: 'Invalid idea in ideas list' }, { status: 400 })
      }
    }
    const record = buildSharedRecord(planDetails, ideaList)

    const res = await fetch(`${JSONBIN}/${encodeURIComponent(binId)}`, {
      method: 'PUT',
      headers: jsonbinHeaders(),
      body: JSON.stringify(record),
    })
    const data = await readJsonbinJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: extractBinMessage(data) },
        { status: res.status === 404 ? 404 : 502 },
      )
    }
    return NextResponse.json({ ok: true, record })
  } catch (e) {
    if (e instanceof Error && e.message === 'MISSING_KEY') {
      return NextResponse.json({ error: 'JSONBin API key missing' }, { status: 500 })
    }
    console.error('share-bin PUT', e)
    return NextResponse.json({ error: 'Failed to update shared sandbox' }, { status: 500 })
  }
}
