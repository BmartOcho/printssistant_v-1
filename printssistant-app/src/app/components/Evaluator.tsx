'use client';

import { useState } from 'react';

interface TestResult {
  emailContent: string;
  expectedSpecs: any;
  aiSpecs: any;
  accuracy: number;
  errors: string[];
}

export default function Evaluator() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState<any[]>([]);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);

  const loadTestData = async () => {
    try {
      const response = await fetch('/api/load-test-data');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        alert(data.error);
        return;
      }
      
      if (data.testData && data.testData.length > 0) {
        setTestData(data.testData);
        alert(`Successfully loaded ${data.testData.length} test cases`);
      } else {
        alert('No test data found. Please check that testing-data.json exists.');
      }
    } catch (error) {
      console.error('Error loading test data:', error);
      alert('Failed to load test data. Please check the console for details.');
    }
  };

  const runSingleTest = async (testCase: any) => {
    try {
      const response = await fetch('/api/parse-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: testCase.emailContent, 
          type: 'email',
          useTrainingData: true,
          useFineTuned: true  // Use fine-tuned model
        }),
      });
      
      const data = await response.json();

      // Handle mulit-job response - use first job for testing
      const specs = data.specs.jobs ? data.specs.jobs[0] : data.specs;
      return specs;
    
      
      if (data.error) {
        console.error('API returned error:', data.error);
        return null;
      }
      
      return data.specs;
    } catch (error) {
      console.error('Error calling parse API:', error);
      return null;
    }
  };

  const calculateAccuracy = (expected: any, actual: any): { accuracy: number; errors: string[] } => {
    const errors: string[] = [];
    let correctFields = 0;
    const totalFields = 10;

    // Check if actual is null or undefined
    if (!actual) {
      errors.push('Failed to parse email - no AI response received');
      return { accuracy: 0, errors };
    }

    // Check job type
    if (expected.jobType && actual.jobType) {
      if (expected.jobType.toLowerCase() === actual.jobType.toLowerCase()) {
        correctFields++;
      } else {
        errors.push(`Job Type: Expected "${expected.jobType}", got "${actual.jobType}"`);
      }
    } else if (expected.jobType) {
      errors.push(`Job Type: Expected "${expected.jobType}", got nothing`);
    }

    // Check dimensions
    if (expected.dimensions && actual.dimensions) {
      if (expected.dimensions.width === actual.dimensions.width && 
          expected.dimensions.height === actual.dimensions.height) {
        correctFields++;
      } else {
        errors.push(`Dimensions: Expected ${expected.dimensions.width}x${expected.dimensions.height}, got ${actual.dimensions?.width}x${actual.dimensions?.height}`);
      }
    } else {
      errors.push(`Dimensions: Missing or incomplete`);
    }

    // Check quantity
    if (expected.quantity !== undefined && actual.quantity !== undefined) {
      const expectedQty = parseInt(expected.quantity);
      const actualQty = parseInt(actual.quantity);
      if (Math.abs(expectedQty - actualQty) < 10) {
        correctFields++;
      } else {
        errors.push(`Quantity: Expected ${expectedQty}, got ${actualQty}`);
      }
    }

    // Check color mode
    if (expected.colorMode && actual.colorMode) {
      if (expected.colorMode === actual.colorMode) {
        correctFields++;
      } else {
        errors.push(`Color Mode: Expected "${expected.colorMode}", got "${actual.colorMode}"`);
      }
    }

    // Check resolution
    if (expected.resolution && actual.resolution) {
      if (expected.resolution === actual.resolution) {
        correctFields++;
      } else {
        errors.push(`Resolution: Expected "${expected.resolution}", got "${actual.resolution}"`);
      }
    }

    // Check file format
    if (expected.fileFormat && actual.fileFormat) {
      if (expected.fileFormat === actual.fileFormat) {
        correctFields++;
      } else {
        errors.push(`File Format: Expected "${expected.fileFormat}", got "${actual.fileFormat}"`);
      }
    }

    // Check paper stock
    if (expected.paperStock && actual.paperStock) {
      if (expected.paperStock.toLowerCase() === actual.paperStock.toLowerCase()) {
        correctFields++;
      } else {
        errors.push(`Paper Stock: Expected "${expected.paperStock}", got "${actual.paperStock}"`);
      }
    }

    // Check bleed
    if (expected.bleed?.value && actual.bleed?.value) {
      if (expected.bleed.value === actual.bleed.value) {
        correctFields++;
      } else {
        errors.push(`Bleed: Expected "${expected.bleed.value}", got "${actual.bleed?.value}"`);
      }
    }

    // Check finishing (array comparison)
    if (expected.finishing && actual.finishing) {
      if (Array.isArray(expected.finishing) && Array.isArray(actual.finishing)) {
        const expectedSet = new Set(expected.finishing.map((f: string) => f.toLowerCase()));
        const actualSet = new Set(actual.finishing.map((f: string) => f.toLowerCase()));
        let matchCount = 0;
        expectedSet.forEach(item => {
          if (actualSet.has(item)) matchCount++;
        });
        if (matchCount >= expectedSet.size * 0.7) { // 70% match
          correctFields++;
        } else {
          errors.push(`Finishing: Missing or incorrect items`);
        }
      }
    }

    // Check deadline
    if (expected.deadline && actual.deadline) {
      if (expected.deadline.toLowerCase().includes(actual.deadline.toLowerCase()) ||
          actual.deadline.toLowerCase().includes(expected.deadline.toLowerCase())) {
        correctFields++;
      }
    }

    const accuracy = (correctFields / totalFields) * 100;
    return { accuracy, errors };
  };

  const runAllTests = async () => {
    if (testData.length === 0) {
      alert('Please load test data first');
      return;
    }

    setLoading(true);
    const results: TestResult[] = [];

    for (let i = 0; i < testData.length; i++) {
      setCurrentTestIndex(i + 1);
      const testCase = testData[i];
      
      try {
        console.log(`Running test ${i + 1}/${testData.length}...`);
        const aiSpecs = await runSingleTest(testCase);
        
        if (aiSpecs) {
          const { accuracy, errors } = calculateAccuracy(testCase.extractedSpecs, aiSpecs);
          
          results.push({
            emailContent: testCase.emailContent,
            expectedSpecs: testCase.extractedSpecs,
            aiSpecs,
            accuracy,
            errors
          });
        } else {
          // Handle failed parse
          results.push({
            emailContent: testCase.emailContent,
            expectedSpecs: testCase.extractedSpecs,
            aiSpecs: null,
            accuracy: 0,
            errors: ['Failed to parse email - API error']
          });
        }
      } catch (error) {
        console.error(`Error testing case ${i + 1}:`, error);
        results.push({
          emailContent: testCase.emailContent,
          expectedSpecs: testCase.extractedSpecs,
          aiSpecs: null,
          accuracy: 0,
          errors: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }
    }

    setTestResults(results);
    setLoading(false);
    setCurrentTestIndex(0);
  };

  const getOverallAccuracy = () => {
    if (testResults.length === 0) return 0;
    const sum = testResults.reduce((acc, result) => acc + result.accuracy, 0);
    return (sum / testResults.length).toFixed(2);
  };

  const exportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      overallAccuracy: getOverallAccuracy(),
      totalTests: testResults.length,
      results: testResults
    };

    const dataStr = JSON.stringify(report, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `evaluation-report-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Model Evaluation</h2>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={loadTestData}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg"
        >
          Load Test Data
        </button>
        
        <button
          onClick={runAllTests}
          disabled={loading || testData.length === 0}
          className="px-6 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? `Testing ${currentTestIndex}/${testData.length}...` : 'Run All Tests'}
        </button>

        {testResults.length > 0 && (
          <button
            onClick={exportResults}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg"
          >
            Export Report
          </button>
        )}
      </div>

      {testData.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <p>Test data loaded: {testData.length} samples</p>
        </div>
      )}

      {testResults.length > 0 && (
        <>
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Overall Results</h3>
            <p className="text-3xl font-bold text-blue-600">
              {getOverallAccuracy()}% Accuracy
            </p>
            <p className="text-sm text-gray-600">
              Based on {testResults.length} test cases
            </p>
          </div>

          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Test Case {index + 1}</h4>
                  <span className={`px-3 py-1 rounded ${
                    result.accuracy >= 80 ? 'bg-green-100 text-green-800' : 
                    result.accuracy >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {result.accuracy.toFixed(0)}% Accurate
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <p className="line-clamp-2">{result.emailContent.substring(0, 100)}...</p>
                </div>
                
                {result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-600">Errors:</p>
                    <ul className="text-sm text-red-500 ml-4">
                      {result.errors.map((error, errIndex) => (
                        <li key={errIndex}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.aiSpecs && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-blue-600">View Details</summary>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-semibold">Expected:</p>
                        <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(result.expectedSpecs, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <p className="font-semibold">AI Output:</p>
                        <pre className="bg-gray-100 p-2 rounded overflow-x-auto">
                          {JSON.stringify(result.aiSpecs, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}