'use client';

import { useState } from 'react';

interface EmailAnnotation {
  emailContent: string;
  extractedSpecs: {
    jobType: string;
    dimensions: { width: string; height: string; unit: string };
    quantity: number;
    colorMode: string;
    bleed: { value: string; unit: string };
    resolution: string;
    fileFormat: string;
    paperStock?: string;
    finishing?: string[];
    specialRequirements?: string[];
    deadline?: string;
  };
}

export default function DataPrep() {
  const [emailContent, setEmailContent] = useState('');
  const [finishingText, setFinishingText] = useState('');
  const [specialReqText, setSpecialReqText] = useState('');
  const [currentAnnotation, setCurrentAnnotation] = useState<EmailAnnotation['extractedSpecs']>({
    jobType: '',
    dimensions: { width: '', height: '', unit: 'inches' },
    quantity: 0,
    colorMode: 'Not Specified',
    bleed: { value: '', unit: 'inches' },
    resolution: '',
    fileFormat: 'PDF',
    paperStock: '',
    finishing: [],
    specialRequirements: [],
    deadline: ''
  });
  const [annotations, setAnnotations] = useState<EmailAnnotation[]>([]);

  const handleSaveAnnotation = () => {
    // Parse the text fields into arrays before saving
    const finishingArray = finishingText
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
    
    const specialReqArray = specialReqText
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);

    const newAnnotation: EmailAnnotation = {
      emailContent,
      extractedSpecs: {
        ...currentAnnotation,
        finishing: finishingArray,
        specialRequirements: specialReqArray
      }
    };
    
    setAnnotations([...annotations, newAnnotation]);
    
    // Reset for next email
    setEmailContent('');
    setFinishingText('');
    setSpecialReqText('');
    setCurrentAnnotation({
      jobType: '',
      dimensions: { width: '', height: '', unit: 'inches' },
      quantity: 0,
      colorMode: 'Not Specified',
      bleed: { value: '', unit: 'inches' },
      resolution: '',
      fileFormat: 'PDF',
      paperStock: '',
      finishing: [],
      specialRequirements: [],
      deadline: ''
    });
    
    alert(`Annotation saved! Total annotations: ${annotations.length + 1}`);
  };

  const exportAnnotations = () => {
    const dataStr = JSON.stringify(annotations, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `training-data-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Training Data Preparation</h2>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column - Email Input */}
        <div>
          <h3 className="font-semibold mb-2">Email Content</h3>
          <textarea
            className="w-full h-96 p-4 border rounded-lg font-mono text-sm"
            placeholder="Paste email content here..."
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
          />
        </div>

        {/* Right Column - Annotation Fields */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <h3 className="font-semibold mb-2">Correct Specifications</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">Job Type</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="e.g., Business Card, Brochure, Poster"
              value={currentAnnotation.jobType}
              onChange={(e) => setCurrentAnnotation({...currentAnnotation, jobType: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Width</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={currentAnnotation.dimensions.width}
                onChange={(e) => setCurrentAnnotation({
                  ...currentAnnotation,
                  dimensions: {...currentAnnotation.dimensions, width: e.target.value}
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Height</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={currentAnnotation.dimensions.height}
                onChange={(e) => setCurrentAnnotation({
                  ...currentAnnotation,
                  dimensions: {...currentAnnotation.dimensions, height: e.target.value}
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <select
                className="w-full p-2 border rounded"
                value={currentAnnotation.dimensions.unit}
                onChange={(e) => setCurrentAnnotation({
                  ...currentAnnotation,
                  dimensions: {...currentAnnotation.dimensions, unit: e.target.value}
                })}
              >
                <option value="Not Specified">Not Specified</option>
                <option value="inches">inches</option>
                <option value="mm">mm</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number"
              className="w-full p-2 border rounded"
              value={currentAnnotation.quantity}
              onChange={(e) => setCurrentAnnotation({...currentAnnotation, quantity: parseInt(e.target.value) || 0})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Color Mode</label>
            <select
              className="w-full p-2 border rounded"
              value={currentAnnotation.colorMode}
              onChange={(e) => setCurrentAnnotation({...currentAnnotation, colorMode: e.target.value})}
            >
              <option value="Not specified">Not Specified</option>
              <option value="CMYK">CMYK</option>
              <option value="RGB">RGB</option>
              <option value="Pantone">Pantone</option>
              <option value="Black & White">Black & White</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Bleed</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={currentAnnotation.bleed.value}
                onChange={(e) => setCurrentAnnotation({
                  ...currentAnnotation,
                  bleed: {...currentAnnotation.bleed, value: e.target.value}
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bleed Unit</label>
              <select
                className="w-full p-2 border rounded"
                value={currentAnnotation.bleed.unit}
                onChange={(e) => setCurrentAnnotation({
                  ...currentAnnotation,
                  bleed: {...currentAnnotation.bleed, unit: e.target.value}
                })}
              >
                <option value="Not Specified">Not Specified</option>
                <option value="inches">inches</option>
                <option value="mm">mm</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Resolution (DPI)</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={currentAnnotation.resolution}
              onChange={(e) => setCurrentAnnotation({...currentAnnotation, resolution: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Paper Stock</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="e.g., 100lb Gloss Text"
              value={currentAnnotation.paperStock}
              onChange={(e) => setCurrentAnnotation({...currentAnnotation, paperStock: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Finishing (comma-separated)</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="e.g., Lamination, Die-cutting, Foil stamping"
              value={finishingText}
              onChange={(e) => setFinishingText(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple items with commas</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Special Requirements (one per line)</label>
            <textarea
              className="w-full p-2 border rounded h-20"
              placeholder="Enter each requirement on a new line"
              value={specialReqText}
              onChange={(e) => setSpecialReqText(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Press Enter for each new requirement</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Deadline</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="e.g., Next Friday, EOD"
              value={currentAnnotation.deadline}
              onChange={(e) => setCurrentAnnotation({...currentAnnotation, deadline: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={handleSaveAnnotation}
          disabled={!emailContent}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
        >
          Save Annotation ({annotations.length + 1}/25)
        </button>
        
        {annotations.length > 0 && (
          <button
            onClick={exportAnnotations}
            className="px-6 py-2 bg-green-500 text-white rounded-lg"
          >
            Export {annotations.length} Annotations as JSON
          </button>
        )}
      </div>

      {annotations.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Progress</h3>
          <div className="flex gap-2 flex-wrap">
            {[...Array(25)].map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded ${
                  i < annotations.length ? 'bg-green-500' : 'bg-gray-300'
                } flex items-center justify-center text-white text-xs`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}