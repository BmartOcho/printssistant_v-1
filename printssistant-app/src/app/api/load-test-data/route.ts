import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Try to read the test data file
    const testDataPath = path.join(process.cwd(), 'src/data/testing/testing-data.json');
    
    try {
      const testData = await fs.readFile(testDataPath, 'utf-8');
      return NextResponse.json({ testData: JSON.parse(testData) });
    } catch (fileError) {
      // File doesn't exist or can't be read
      console.log('Test data file not found at:', testDataPath);
      return NextResponse.json({ 
        testData: [], 
        error: 'Test data file not found. Please ensure testing-data.json exists in src/data/testing/' 
      });
    }
  } catch (error) {
    console.error('Error in load-test-data route:', error);
    return NextResponse.json({ 
      testData: [], 
      error: 'Failed to load test data' 
    });
  }
}