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
      const data = await response.json();
      setTestData(data.testData);
    } catch (error) {
      console.error('Error loading test data:', error);
    }
  };

  const runSingleTest = async (testCase: any) => {
    // Call your enhanced parser
    const response = await fetch('/api/parse-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content: testCase.emailContent, 
        type: 'email',
        useTrainingData: true 
      }),
    });
    
    const data = await response.json();
    return data.specs;
  };

  const calculateAccuracy = (expected: any, actual: any): { accuracy: number; errors: string[] } => {
    const errors: string[] = [];
    let correctFields = 0;
    const totalFields = 10; // Adjust based on your fields

    // Check job type
    if (expected.jobType?.toLowerCase() === actual.jobType?.toLowerCase()) {
      correctFields++;
    } else {
      errors.push(`Job Type: Expected "${expected.jobType}", got "${actual.jobType}"`);
    }

    // Check dimensions
    if (expected.dimensions?.width === actual.dimensions?.width && 
        expected.dimensions?.height === actual.dimensions?.height) {
      correctFields++;
    } else {
      errors.push(`Dimensions: Mismatch`);
    }

    // Check quantity (with tolerance)
    const expectedQty = parseInt(expected.quantity);
    const actualQty = parseInt(actual.quantity);
    if (Math.abs(expectedQty - actualQty) < 10) {
      correctFields++;
    } else {
      errors.push(`Quantity: Expected ${expectedQty}, got ${actualQty}`);
    }

    // Check color mode
    if (expected.colorMode === actual.colorMode) {
      correctFields++;
    } else {
      errors.push(`Color Mode: Expected "${expected.colorMode}", got "${actual.colorMode}"`);
    }

    // Check resolution
    if (expected.resolution === actual.resolution) {
      correctFields++;
    } else {
      errors.push(`Resolution: Expected "${expected.resolution}", got "${actual.resolution}"`);
    }

    // Add more field checks...

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
        const aiSpecs = await runSingleTest(testCase);
        const { accuracy, errors } = calculateAccuracy(testCase.extractedSpecs, aiSpecs);
        
        results.push({
          emailContent: testCase.emailContent,
          expectedSpecs: testCase.extractedSpecs,
          aiSpecs,
          accuracy,
          errors
        });
      } catch (error) {
        console.error(`Error testing case ${i + 1}:`, error);
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
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}