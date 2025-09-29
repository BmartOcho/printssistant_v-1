'use client';

import React, { useState } from 'react';
import SmartChecklist from '@/components/SmartChecklist';
import { generateChecklist } from '@/utils/checklistGenerator';

interface JobSpecs {
  jobType: string;
  dimensions: { width: string; height: string; unit: string };
  quantity: number;
  colorMode: string;
  paperStock: string;
  finishing: string[];
  specialRequirements: string[];
  deadline: string;
}

export default function JobProcessor() {
  const [emailContent, setEmailContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobSpecs, setJobSpecs] = useState<JobSpecs | null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [error, setError] = useState('');

  const processEmail = async () => {
    if (!emailContent.trim()) {
      setError('Please enter email content');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/parse-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: emailContent,
          type: 'email',
          useTrainingData: true,
          useFineTuned: true
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Handle multi-job responses - use first job
      const specs = data.specs.jobs ? data.specs.jobs[0] : data.specs;

      setJobSpecs(specs);
      const generatedChecklist = generateChecklist(specs);
      setChecklist(generatedChecklist);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process email');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemChange = (categoryId: string, itemId: string, value: string | boolean | number) => {
    console.log(`Updated checklist: ${categoryId}.${itemId} = ${value}`);
    // Here you could save progress to local storage or database
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-200 mb-6">PrintPrep AI Assistant</h1>

      {/* Email Input Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-black">
        <h2 className="text-xl font-semibold mb-4">Step 1: Paste Job Email</h2>
        <textarea
          value={emailContent}
          onChange={(e) => setEmailContent(e.target.value)}
          placeholder="Paste the print job email here..."
          className="w-full h-40 p-4 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            {emailContent.length} characters
          </div>
          <button
            onClick={processEmail}
            disabled={isProcessing || !emailContent.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Generate Checklist'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Job Specs Display */}
      {jobSpecs && (
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-black">
          <h3 className="font-semibold text-blue-900 mb-3">Step 2: Extracted Job Specifications</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><strong>Job Type:</strong> {jobSpecs.jobType}</div>
            <div><strong>Dimensions:</strong> {jobSpecs.dimensions.width}" × {jobSpecs.dimensions.height}"</div>
            <div><strong>Quantity:</strong> {jobSpecs.quantity}</div>
            <div><strong>Material:</strong> {jobSpecs.paperStock || 'Not specified'}</div>
            <div><strong>Color Mode:</strong> {jobSpecs.colorMode}</div>
            <div><strong>Finishing:</strong> {jobSpecs.finishing.join(', ') || 'None'}</div>
            <div><strong>Deadline:</strong> {jobSpecs.deadline || 'Not specified'}</div>
            <div><strong>Special Notes:</strong> {jobSpecs.specialRequirements.length} items</div>
          </div>
        </div>
      )}

      {/* Smart Checklist */}
      {checklist.length > 0 && (
        <div className="text-black">
          <h3 className="text-xl font-semibold mb-4">Step 3: Complete Pre-Flight Checklist</h3>
          <SmartChecklist
            categories={checklist}
            onItemChange={handleItemChange}
          />
        </div>
      )}
    </div>
  );
}
