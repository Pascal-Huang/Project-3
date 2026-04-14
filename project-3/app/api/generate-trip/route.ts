import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize the AI client using your secret key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    // Grab the user's input from the frontend (The Sandbox Ideas)
    const body = await req.json();
    const { location, days, ideas } = body; 

    // THE PROMPT
    const prompt = `
      You are a local travel expert. Plan a ${days}-day trip to ${location}.

      CONTEXT:
      <user_ideas>${ideas.slice(0, 400)}</user_ideas>

      RULES (follow exactly):
      1. Only use real, named places — never generic descriptions.
      2. Group activities geographically — no cross-city back-to-back stops.
      3. Activity "name": 3–5 words, specific (e.g. "Lunch at The Manx Pub").
      4. Activity "description": exactly 1 sentence, 15–25 words, vivid and specific.
      5. Activity "tags": 1–3 short labels (e.g. ["Culture", "$$", "Outdoor"]).
      6. Day "theme": 1–3 words.
      7. If you are not confident about a specific venue, pick a different one you know well.

      Respond ONLY with valid JSON. No explanation, no markdown, no code fences.

      {
        "tripName": "string",
        "itinerary": [
          {
            "day": 1,
            "theme": "string",
            "activities": [
              {
                "time": "9:00 AM",
                "name": "string",
                "description": "string",
                "tags": ["string"]
              }
            ]
          }
        ]
      }
      `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    // Clean the response
    // Sometimes AI wraps JSON in markdown blocks (```json ... ```). 
    // We strip that out so JSON.parse doesn't throw an error.
    const rawText = response.text || '';
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    // 5. Send the perfect data back to your React frontend!
    return NextResponse.json(JSON.parse(cleanJson));

  } catch (error) {
    console.error('AI Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate trip. Please try again.' }, 
      { status: 500 }
    );
  }
}