import { NextRequest, NextResponse } from 'next/server';
import openai from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { specs } = await request.json();

    if (!specs) {
      return NextResponse.json(
        { error: 'No specifications provided' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a print production expert. Based on the provided print specifications, generate a comprehensive pre-flight checklist.

    Create a detailed checklist with the following categories:
    1. File Setup Requirements
    2. Color & Resolution Checks
    3. Bleed & Safety Margins
    4. Typography & Text Checks
    5. Export Settings
    6. Final Quality Checks

    For each item, include:
    - Clear action item
    - Why it's important
    - Specific values/settings when applicable

    Return as a JSON object with this structure:
    {
      "categories": [
        {
          "name": "Category Name",
          "items": [
            {
              "task": "What to check",
              "importance": "Why this matters",
              "specification": "Exact requirement",
              "checked": false
            }
          ]
        }
      ]
    }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a checklist for these specifications: ${JSON.stringify(specs)}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const checklist = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({ checklist });
  } catch (error) {
    console.error('Checklist generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate checklist' },
      { status: 500 }
    );
  }
}