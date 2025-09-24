import { NextRequest, NextResponse } from 'next/server';
import openai from '@/lib/openai';
import fs from 'fs/promises';
import path from 'path';
import { fixFineTunedOutput } from '@/utils/fixFineTunedOutput';
import { validateAndFixSpecs } from '@/utils/validateSpecs';

export async function POST(request: NextRequest) {
  try {
    const { content, type, useTrainingData, useFineTuned } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'No content provided' },
        { status: 400 }
      );
    }

    let modelToUse = "gpt-4-turbo-preview";
    
    if (useFineTuned) {
      try {
        const configPath = path.join(process.cwd(), 'src/data/fine-tune-config.json');
        const configData = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        
        if (config.fineTunedModel && config.fineTunedModel !== 'PLACEHOLDER - will update when training completes') {
          modelToUse = config.fineTunedModel;
          console.log('✅ Using fine-tuned model:', modelToUse);
        }
      } catch (error) {
        console.log('Fine-tuned model config not found');
      }
    }

    const systemPrompt = useFineTuned 
      ? `Extract print job specifications from the email and return as JSON.`
      : `[your existing detailed prompt]`;

    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract print specifications from this email:\n\n${content}` }
      ],
      response_format: { type: "json_object" },
      temperature: useFineTuned ? 0 : 0.2,
      max_tokens: 1000
    });

    let specs = JSON.parse(completion.choices[0].message.content || '{}');

    // Apply fixes based on model type
    if (useFineTuned) {
      specs = mapFineTunedToExpectedFormat(specs);
    }

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