const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

console.log('Testing API key:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testKey() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say hello" }],
      max_tokens: 10
    });
    console.log('✅ API key works! Response:', response.choices[0].message.content);
  } catch (error) {
    console.error('❌ API key failed:', error.message);
  }
}

testKey();
