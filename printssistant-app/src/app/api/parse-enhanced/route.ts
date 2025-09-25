import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  console.log('🔍 API called');

  try {
    const { content, type, useTrainingData, useFineTuned } = await request.json();
    console.log('📝 Request data:', { hasContent: !!content, useFineTuned });

    if (!content) {
      return NextResponse.json(
        { error: 'No content provided' },
        { status: 400 }
      );
    }

    const directOpenAI = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // STEP 1: Rich Information Extraction
    console.log('🔧 Step 1: Rich extraction starting...');

    const extractionPrompt = `Extract comprehensive print job information from the email and return as detailed JSON. Include all specifications, quantities, materials, finishing requirements, and special notes mentioned.`;

    const extraction = await directOpenAI.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: extractionPrompt },
        { role: "user", content: `Extract all information from this email:\n\n${content}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 1000
    });

    const extractedInfo = JSON.parse(extraction.choices[0].message.content || '{}');
    console.log('✅ Step 1 - Rich extraction:', JSON.stringify(extractedInfo, null, 2));

    // STEP 2: Convert to Standard Job Specs
    console.log('🔧 Step 2: Standardizing specs...');

    const conversionPrompt = `Convert the extracted information to standard print job specifications. Use this exact JSON structure:

    {
      "jobType": "Primary product name",
      "dimensions": {"width": "", "height": "", "unit": "inches"},
      "quantity": 0,
      "colorMode": "CMYK|RGB|Not specified",
      "bleed": {"value": "Not specified", "unit": "inches"},
      "resolution": "300|Not specified",
      "fileFormat": "PDF|Not specified",
      "paperStock": "material description",
      "finishing": ["array of finishing steps"],
      "specialRequirements": ["array of special notes"],
      "deadline": "deadline if mentioned or empty string"
    }

    CONVERSION RULES:
    - jobType: Use customer's preferred term (e.g. "window decal", "name badges", "Mini Booklet", "Lookbook")
    - dimensions: Use empty strings "" for width/height if not specified, never "Not specified"
    - quantity: ALWAYS return a number. If single item and no quantity mentioned, use 1
    - Keep quantities as integers, not strings
    - paperStock: Simplify but keep key details (e.g. "15 mil PVC", "white vinyl")
    - Only include actual finishing steps mentioned in the conversation
    - deadline: Use exact wording from email or empty string "";

    Examples:
    - If email mentions "42 wide, 24 tall" → width: "42", height: "24"
    - If no dimensions mentioned → width: "", height: ""
    - If "600 name badges" → quantity: 600
    - If "a window decal" with no quantity → quantity: 1`;

    const conversion = await directOpenAI.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: conversionPrompt },
        { role: "user", content: `Convert this extracted information to standard job specs:\n\n${JSON.stringify(extractedInfo, null, 2)}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 800
    });

    const standardSpecs = JSON.parse(conversion.choices[0].message.content || '{}');
    console.log('✅ Step 2 - Standard specs:', JSON.stringify(standardSpecs, null, 2));

    return NextResponse.json({
      specs: standardSpecs,
      extractedInfo: extractedInfo, // For debugging
      modelUsed: "gpt-4-turbo-preview",
      isFineTuned: false
    });
  } catch (error) {
    console.error('💥 API Error:', error);
    return NextResponse.json(
      { error: 'Failed to parse content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
