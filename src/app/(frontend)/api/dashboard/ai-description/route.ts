import { GoogleGenAI } from '@google/genai'
import { requireActiveDashboardUser } from '@/lib/app-auth'
import { checkRateLimit } from '@/lib/rate-limit'

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: 'Professional, polished, trustworthy, and clear',
  exciting: 'High-energy, exciting, promotional, and compelling',
  luxury: 'Luxury, refined, exclusive, and VIP-oriented',
  casual: 'Warm, conversational, friendly, and welcoming',
  nightlife: 'Electric, vibrant nightlife and entertainment energy',
  corporate: 'Structured, executive, corporate, and formal',
}

const ACTION_INSTRUCTIONS: Record<string, string> = {
  improve:
    'Rewrite and polish the event description to be clearer, more engaging, and structured with strong readability while preserving every single factual detail.',
  regenerate:
    'Create a fresh alternative phrasing and structure for the event description using the selected tone without inventing new facts.',
  shorten:
    'Condense the description into a crisp, punchy 2-paragraph version (roughly 50 to 90 words) keeping all essential factual details.',
  expand:
    'Expand the description into a richer, well-paced 3-to-4-paragraph narrative (roughly 140 to 240 words) highlighting the atmosphere, what guests can expect based ONLY on provided details, and why attending matters.',
}

export async function POST(request: Request) {
  const auth = await requireActiveDashboardUser(['organizer'])
  if (!auth.ok) {
    return Response.json(
      { error: auth.error, requirePasswordChange: auth.requirePasswordChange },
      { status: auth.status },
    )
  }
  const user = auth.user

  const rate = checkRateLimit(`ai-desc:${user.id}`, {
    maxRequests: 25,
    windowMs: 10 * 60 * 1000,
  })
  if (!rate.allowed) {
    return Response.json(
      { error: 'AI writing rate limit reached. Please wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    )
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json(
      {
        error:
          'AI description assistant is unavailable because GEMINI_API_KEY is not configured on the server.',
      },
      { status: 503 },
    )
  }

  try {
    const body = (await request.json().catch(() => null)) as Record<string, any> | null
    if (!body) {
      return Response.json({ error: 'Invalid JSON request body.' }, { status: 400 })
    }

    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 140) : ''
    const category = typeof body.category === 'string' ? body.category.trim().slice(0, 60) : ''
    const eventFormat =
      typeof body.eventFormat === 'string' ? body.eventFormat.trim().slice(0, 40) : 'physical'
    const venue = typeof body.venue === 'string' ? body.venue.trim().slice(0, 180) : ''
    const startsAt = typeof body.startsAt === 'string' ? body.startsAt.trim().slice(0, 80) : ''
    const shortDescription =
      typeof body.shortDescription === 'string' ? body.shortDescription.trim().slice(0, 180) : ''
    const currentDescription =
      typeof body.currentDescription === 'string'
        ? body.currentDescription.trim().slice(0, 4000)
        : ''

    const tone =
      typeof body.tone === 'string' && TONE_DESCRIPTIONS[body.tone] ? body.tone : 'professional'
    const action =
      typeof body.action === 'string' && ACTION_INSTRUCTIONS[body.action]
        ? body.action
        : 'improve'

    if (!title && currentDescription.length < 10) {
      return Response.json(
        {
          error:
            'Enter at least an event title or a brief draft description before using Improve with AI.',
        },
        { status: 400 },
      )
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    })

    const systemInstruction = `You are a copywriting assistant for AZORTIX, an Abuja, Nigeria live events and ticketing platform.
CRITICAL ACCURACY RULES:
1. NEVER invent or fabricate any factual details that were not provided by the organizer. Do NOT make up ticket prices, artist/speaker names, sponsors, schedules, addresses, age restrictions, free drinks, VIP perks, or dates.
2. Only use the facts provided in the prompt (Event Title, Category, Format, Venue, Date/Time, Short Description, Current Description, and Abuja, Nigeria context).
3. Write natural, compelling, publication-ready event copy with zero markdown headers or hashtags unless already present.
4. Keep the improvedDescription at least 45 characters long so it passes event publishing validation.`

    const prompt = `Task: ${ACTION_INSTRUCTIONS[action]}
Desired Tone: ${TONE_DESCRIPTIONS[tone]}

Organizer Input:
- Event Title: ${title || '(not specified yet)'}
- Category: ${category || '(not specified)'}
- Format: ${eventFormat}
- City: Abuja, FCT, Nigeria
- Venue: ${venue || '(not specified yet)'}
- Start Date/Time: ${startsAt || '(not specified yet)'}
- Short Summary: ${shortDescription || '(none provided)'}
- Current Draft Description:
"""
${currentDescription || '(none provided yet — write an accurate starter description based strictly on the title, category, format, and venue above)'}
"""

Return ONLY valid JSON with:
- "improvedDescription": string (polished full description following the tone and task above)
- "suggestedShortDescription": string (a crisp summary <= 160 characters)`

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: action === 'regenerate' ? 0.85 : 0.6,
      },
    })

    const rawText = response.text?.trim() || ''
    if (!rawText) {
      return Response.json(
        { error: 'Gemini returned an empty response. Please try again.' },
        { status: 502 },
      )
    }

    let parsed: { improvedDescription?: string; suggestedShortDescription?: string }
    try {
      parsed = JSON.parse(rawText)
    } catch {
      parsed = { improvedDescription: rawText }
    }

    const improvedDescription = String(parsed.improvedDescription || '').trim()
    const suggestedShortDescription = String(parsed.suggestedShortDescription || '')
      .trim()
      .slice(0, 180)

    if (!improvedDescription) {
      return Response.json(
        { error: 'AI could not generate an event description from your input. Try adding more detail.' },
        { status: 502 },
      )
    }

    return Response.json({
      improvedDescription,
      suggestedShortDescription,
      tone,
      action,
    })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? `AI description generation failed: ${error.message}`
            : 'AI description generation failed. Please try again.',
      },
      { status: 502 },
    )
  }
}
