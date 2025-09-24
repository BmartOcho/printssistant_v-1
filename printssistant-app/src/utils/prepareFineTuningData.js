const fs = require('fs');
const path = require('path');

// Load your training data
const trainingData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/training/training-data.json'), 'utf-8')
);

// System prompt for your fine-tuned model
const systemPrompt = `You are an expert print production specialist. Extract print job specifications from emails and return them as a JSON object with these exact fields:
- jobType: specific product name
- dimensions: {width, height, unit}
- quantity: numeric value
- colorMode: CMYK, RGB, Pantone, or Black & White
- bleed: {value, unit}
- resolution: DPI value
- fileFormat: file type
- paperStock: paper type
- finishing: array of finishing options
- specialRequirements: array of special notes
- deadline: deadline if mentioned`;

// Convert to OpenAI fine-tuning format
const fineTuningData = trainingData.map((item, index) => {
  return {
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Extract print specifications from this email:\n\n${item.emailContent}`
      },
      {
        role: "assistant",
        content: JSON.stringify(item.extractedSpecs, null, 2)
      }
    ]
  };
});

// Write JSONL file (one JSON object per line)
const outputPath = path.join(__dirname, '../data/fine-tuning-data.jsonl');
const jsonlContent = fineTuningData.map(item => JSON.stringify(item)).join('\n');

fs.writeFileSync(outputPath, jsonlContent);

console.log(`✅ Created fine-tuning file with ${fineTuningData.length} examples`);
console.log(`📁 File saved to: ${outputPath}`);
console.log(`📏 File size: ${(Buffer.byteLength(jsonlContent) / 1024).toFixed(2)} KB`);

// Validate the format
let validationErrors = 0;
fineTuningData.forEach((item, index) => {
  if (!item.messages || item.messages.length !== 3) {
    console.error(`❌ Error in example ${index + 1}: Invalid message structure`);
    validationErrors++;
  }
});

if (validationErrors === 0) {
  console.log('✅ All examples passed validation!');
} else {
  console.log(`⚠️ Found ${validationErrors} validation errors`);
}