import { NextRequest, NextResponse } from 'next/server';
import openai from '@/lib/openai';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  console.log('🔍 API called');

  try {
    const { content, type, useTrainingData, useFineTuned, debug } = await request.json();
    if (process.env.NODE_ENV !== 'production') {
      console.log('📝 Request data:', { hasContent: !!content, useFineTuned, debug: !!debug });
    }

    if (!content) {
      return NextResponse.json(
        { error: 'No content provided' },
        { status: 400 }
      );
    }

    
    // STEP 1: Rich Information Extraction
    console.log('🔧 Step 1: Rich extraction starting...');

    const extractionPrompt = `Extract comprehensive print job information from the email and return as detailed JSON. Include all specifications, quantities, materials, finishing requirements, and special notes mentioned.`;

    const extraction = await openai.chat.completions.create({
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Step 1 - Rich extraction received');
    }

    // STEP 2: Convert to Standard Job Specs
    console.log('🔧 Step 2: Standardizing specs...');

    const conversionPrompt = `Convert the extracted information to standard print job specifications using these EXACT rules and mappings.

Return JSON structure:
{
  "jobs": [
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
      "deadline": "deadline if mentioned"
    }
  ]
}

CRITICAL JOB TYPE MAPPINGS:
- If context mentions "name badges" → jobType: "name badges" (never "Plastic Cards")
- Customer says "window decal" → jobType: "window decal"
- Customer says "lookbook" → jobType: "Lookbook"
- Customer says "mini booklet" → jobType: "Mini Booklet"
- Customer says "wallet" → jobType: "wallet"

MATERIAL STANDARDIZATION:
- "14 mil synaps" context + shop offers "15 Mil rigid PVC" → paperStock: "15 mil PVC"
- Keep customer terminology: "semi-gloss thin pages" → "semi-gloss thin pages"
- Consistent lowercase: "White Vinyl" → "white vinyl"
- "100# Gloss Cover" → "100# Gloss Cover" (preserve customer format)

FINISHING RULES:
- "installation" mentioned → finishing: ["installation"]
- "two slot punches" or "slot punches" → finishing: ["slot punches"]
- "Score, Collate, Stitch, Trim" → finishing: ["Score", "Collate", "Stitch", "Trim"]
- Only include processes explicitly mentioned in the conversation

TECHNICAL SPECS RULES:
- NEVER infer or assume CMYK, 300 DPI, PDF, or specific bleed values
- Only extract technical specs if customer explicitly mentions them
- If customer says "4cp / 4cp with Bleeds" → colorMode: "CMYK", bleed: {"value": "Yes", "unit": "Not specified"}
- Otherwise keep as "Not specified"

MULTI-ITEM HANDLING:
- Create separate job objects for each distinct product mentioned
- Use specific quantity for each product
- Share common deadline across all jobs

EXAMPLES:
- Email: "600 name badges on plastic" → jobType: "name badges", NOT "Plastic Cards"
- Shop offers "15 mil PVC" for "14 mil synaps" → paperStock: "15 mil PVC"
- Customer: "semi-gloss thin pages" → paperStock: "semi-gloss thin pages" (exact match)`;


    const conversion = await openai.chat.completions.create({
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

    // Validate and normalize model output
    const jobSpecSchema = z.object({
      jobType: z.string().optional().default(''),
      dimensions: z.object({
        width: z.coerce.string().optional().default(''),
        height: z.coerce.string().optional().default(''),
        unit: z.string().optional().default('inches'),
      }),
      quantity: z.coerce.number().int().optional().default(0),
      colorMode: z.string().optional().default('Not specified'),
      bleed: z.object({
        value: z.coerce.string().optional().default('Not specified'),
        unit: z.string().optional().default('inches'),
      }).optional().default({ value: 'Not specified', unit: 'inches' }),
      resolution: z.string().optional().default('Not specified'),
      fileFormat: z.string().optional().default('Not specified'),
      paperStock: z.string().optional().default(''),
      finishing: z.array(z.string()).optional().default([]),
      specialRequirements: z.array(z.string()).optional().default([]),
      deadline: z.string().optional().default(''),
    });

    const jobSpecResponseSchema = z.object({
      jobs: z.array(jobSpecSchema),
    });

    const parsed = jobSpecResponseSchema.safeParse(standardSpecs);
    if (!parsed.success) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Validation failed:', parsed.error.issues);
      }
      return NextResponse.json(
        { error: 'Invalid model output', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const validatedSpecs = parsed.data;

    if (process.env.NODE_ENV !== 'production') {
      const count = Array.isArray(validatedSpecs?.jobs) ? validatedSpecs.jobs.length : 0;
      console.log(`✅ Step 2 - Standard specs parsed; jobs: ${count}`);
    }

    const responseBody: any = {
      specs: validatedSpecs,
      modelUsed: "gpt-4-turbo-preview",
      isFineTuned: false,
    };

    if (debug === true && process.env.NODE_ENV !== 'production') {
      responseBody.extractedInfo = extractedInfo; // For debugging when explicitly enabled
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('💥 API Error:', error);
    return NextResponse.json(
      { error: 'Failed to parse content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
