import { NextRequest, NextResponse } from 'next/server';
import openai from '@/lib/openai';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { content, type, useTrainingData, useFineTuned } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'No content provided' },
        { status: 400 }
      );
    }

    // Default model
    let modelToUse = "gpt-4-turbo-preview";
    
    // Use fine-tuned model if requested
    if (useFineTuned) {
      try {
        const configPath = path.join(process.cwd(), 'src/data/fine-tune-config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        if (config.fineTunedModel && config.fineTunedModel !== 'PLACEHOLDER - will update when training completes') {
          modelToUse = config.fineTunedModel;
          console.log('✅ Using fine-tuned model:', modelToUse);
        } else {
          console.log('⚠️ Fine-tuned model not configured yet');
        }
      } catch (error) {
        console.log('Fine-tuned model config not found');
      }
    }

    // Simplified prompt for fine-tuned model
    const systemPrompt = useFineTuned 
      ? `Extract print job specifications from the email and return as JSON.`
      : `You are an expert print production specialist. Extract and structure print job requirements from the provided ${type || 'text'}.
      
Return a JSON object with these fields:
- jobType: (business card, poster, brochure, etc.)
- dimensions: { width, height, unit }
- quantity: number
- colorMode: (CMYK, RGB, Pantone)
- bleed: { value, unit }
- resolution: required DPI
- fileFormat: preferred format
- paperStock: type of paper
- finishing: array of finishing options
- specialRequirements: array of special notes
- deadline: if mentioned`;

    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: useFineTuned 
          ? `Extract print specifications from this email:\n\n${content}`
          : content 
        }
      ],
      response_format: { type: "json_object" },
      temperature: useFineTuned ? 0 : 0.2, // Zero temperature for fine-tuned model
      max_tokens: 1000
    });

    const specs = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({ 
      specs,
      modelUsed: modelToUse,
      isFineTuned: useFineTuned 
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse content', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}