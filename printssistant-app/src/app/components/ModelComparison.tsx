'use client';

import { useState } from 'react';

export default function ModelComparison() {
  const [emailContent, setEmailContent] = useState('');
  const [standardResult, setStandardResult] = useState<any>(null);
  const [fineTunedResult, setFineTunedResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runComparison = async () => {
    if (!emailContent) {
      alert('Please enter email content');
      return;
    }

    setLoading(true);
    
    try {
      // Test with standard model
      const standardResponse = await fetch('/api/parse-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: emailContent, 
          type: 'email',
          useFineTuned: false
        }),
      });
      const standardData = await standardResponse.json();
      setStandardResult(standardData);

      // Test with fine-tuned model
      const fineTunedResponse = await fetch('/api/parse-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: emailContent, 
          type: 'email',
          useFineTuned: true
        }),
      });
      const fineTunedData = await fineTunedResponse.json();
      setFineTunedResult(fineTunedData);
      
    } catch (error) {
      console.error('Error in comparison:', error);
      alert('Error running comparison. Check console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Model Comparison Tool</h2>
      
      <div className="mb-6">
        <textarea
          className="w-full h-64 p-4 border rounded-lg font-mono text-sm"
          placeholder="Paste an email to test both models..."
          value={emailContent}
          onChange={(e) => setEmailContent(e.target.value)}
        />
        
        <button
          onClick={runComparison}
          disabled={loading || !emailContent}
          className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? 'Running Comparison...' : 'Compare Models'}
        </button>
      </div>

      {(standardResult || fineTunedResult) && (
        <div className="grid grid-cols-2 gap-6">
          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2 text-blue-600">Standard GPT-4 Model</h3>
            {standardResult?.modelUsed && (
              <p className="text-xs text-gray-500 mb-2">Model: {standardResult.modelUsed}</p>
            )}
            {standardResult?.specs ? (
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(standardResult.specs, null, 2)}
              </pre>
            ) : (
              <p className="text-gray-500">No results yet</p>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2 text-green-600">Fine-Tuned Model</h3>
            {fineTunedResult?.modelUsed && (
              <p className="text-xs text-gray-500 mb-2">Model: {fineTunedResult.modelUsed}</p>
            )}
            {fineTunedResult?.specs ? (
              <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(fineTunedResult.specs, null, 2)}
              </pre>
            ) : fineTunedResult?.error ? (
              <p className="text-red-500">Error: {fineTunedResult.error}</p>
            ) : (
              <p className="text-gray-500">Model not configured yet</p>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm">
          <strong>Note:</strong> The fine-tuned model will show results once you update the config file with your model name from OpenAI.
        </p>
      </div>
    </div>
  );
}