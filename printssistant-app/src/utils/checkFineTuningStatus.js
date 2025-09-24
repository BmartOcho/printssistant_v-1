const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function checkStatus() {
  try {
    const configPath = path.join(__dirname, '../data/fine-tune-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    if (!config.fineTuningJobId) {
      console.log('❌ No fine-tuning job ID found. Run createFineTuningJob.js first.');
      return;
    }
    
    const job = await openai.fineTuning.jobs.retrieve(config.fineTuningJobId);
    
    console.log('📊 Fine-Tuning Job Status');
    console.log('========================');
    console.log('🆔 Job ID:', job.id);
    console.log('📈 Status:', job.status);
    console.log('🎯 Model:', job.model);
    
    if (job.status === 'succeeded') {
      console.log('\n✅ Training Complete!');
      console.log('🤖 Fine-tuned model:', job.fine_tuned_model);
      console.log('\n💡 Your custom model is ready to use!');
      
      // Save the model name
      config.fineTunedModel = job.fine_tuned_model;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      console.log('\n📝 Next step: Update your parser to use:', job.fine_tuned_model);
    } else if (job.status === 'failed') {
      console.log('\n❌ Training failed!');
      console.log('Error:', job.error);
    } else {
      console.log('\n⏳ Training in progress...');
      console.log('Check back in a few minutes.');
    }
    
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  }
}

// Check status every 30 seconds
console.log('Starting status monitor... (Press Ctrl+C to stop)\n');
checkStatus();
setInterval(checkStatus, 30000);