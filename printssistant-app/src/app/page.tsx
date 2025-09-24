'use client';

import { useState } from 'react';
import SpecParser from './components/SpecParser';
import DataPrep from './components/DataPrep';
import Evaluator from './components/Evaluator';
import ModelComparison from './components/ModelComparison';

export default function Home() {
  const [mode, setMode] = useState<'parser' | 'dataprep' | 'evaluator' | 'comparison'>('parser');

  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          PrintPrep AI Assistant
        </h1>
        
        <div className="flex justify-center gap-4 mb-8 flex-wrap">
          <button
            onClick={() => setMode('parser')}
            className={`px-4 py-2 rounded ${
              mode === 'parser' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Parser
          </button>
          <button
            onClick={() => setMode('dataprep')}
            className={`px-4 py-2 rounded ${
              mode === 'dataprep' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Training Data Prep
          </button>
          <button
            onClick={() => setMode('evaluator')}
            className={`px-4 py-2 rounded ${
              mode === 'evaluator' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Evaluator
          </button>
          <button
            onClick={() => setMode('comparison')}
            className={`px-4 py-2 rounded ${
              mode === 'comparison' 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Model Comparison
          </button>
        </div>
        
        {mode === 'parser' && <SpecParser />}
        {mode === 'dataprep' && <DataPrep />}
        {mode === 'evaluator' && <Evaluator />}
        {mode === 'comparison' && <ModelComparison />}
      </div>
    </main>
  );
}