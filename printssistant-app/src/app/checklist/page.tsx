'use client';

import React, { useState } from 'react';
import SmartChecklist from '@/components/SmartChecklist';
import { generateChecklist } from '@/utils/checklistGenerator';

export default function ChecklistPage() {
  // Sample job specs (in real app, this would come from your AI parsing)
  const [jobSpecs] = useState({
    jobType: "window decal",
    dimensions: { width: "42", height: "24", unit: "inches" },
    quantity: 1,
    colorMode: "CMYK",
    paperStock: "white vinyl",
    finishing: ["installation"],
    specialRequirements: ["white lettering"],
    deadline: ""
  });

  const [checklist, setChecklist] = useState(() => generateChecklist(jobSpecs));

  const handleItemChange = (categoryId: string, itemId: string, value: string | boolean | number) => {
    console.log(`Changed ${categoryId}.${itemId} to:`, value);
    // Here you would update the checklist state and save progress
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Smart Checklist Demo</h1>
          <div className="mt-2 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900">Job Specifications Detected:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
              <div><strong>Type:</strong> {jobSpecs.jobType}</div>
              <div><strong>Size:</strong> {jobSpecs.dimensions.width}" x {jobSpecs.dimensions.height}"</div>
              <div><strong>Quantity:</strong> {jobSpecs.quantity}</div>
              <div><strong>Material:</strong> {jobSpecs.paperStock}</div>
            </div>
          </div>
        </div>

        <SmartChecklist
          categories={checklist}
          onItemChange={handleItemChange}
        />
      </div>
    </div>
  );
}
