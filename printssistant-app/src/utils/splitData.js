const fs = require('fs');
const path = require('path');

// Load your exported JSON file
const allData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/all-annotations-25.json'), 'utf-8')
);

// Shuffle the data randomly
const shuffled = allData.sort(() => 0.5 - Math.random());

// Split into training (first 20) and testing (last 5)
const trainingData = shuffled.slice(0, 20);
const testingData = shuffled.slice(20, 25);

// Save training data
fs.writeFileSync(
  path.join(__dirname, '../data/training/training-data.json'),
  JSON.stringify(trainingData, null, 2)
);

// Save testing data
fs.writeFileSync(
  path.join(__dirname, '../data/testing/testing-data.json'),
  JSON.stringify(testingData, null, 2)
);

console.log('✅ Data split complete!');
console.log(`Training samples: ${trainingData.length}`);
console.log(`Testing samples: ${testingData.length}`);