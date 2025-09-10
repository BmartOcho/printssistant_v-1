import { NextRequest, NextResponse } from 'next/server';
import openai from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { content, type } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'No content provided' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a print production expert. Extract and structure print job requirements from the provided ${type || 'text'}.
    
    Return a JSON object with these fields:
    - jobType: (business card, poster, brochure, etc.)
    - dimensions: { width, height, unit }
    - quantity: number
    - colorMode: (CMYK, RGB, Pantone)
    - bleed: { top, bottom, left, right, unit }
    - resolution: required DPI
    - fileFormat: preferred format
    - specialRequirements: array of any special notes
    - deadline: if mentioned`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const specs = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({ specs });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse content' },
      { status: 500 }
    );
  }
}