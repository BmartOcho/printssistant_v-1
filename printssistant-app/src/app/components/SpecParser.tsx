'use client';

import { useState } from 'react';
import ChecklistView from './ChecklistView';

export default function SpecParser() {
  const [content, setContent] = useState('');
  const [specs, setSpecs] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleParse = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/parse-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type: 'email' }),
      });
      
      const data = await response.json();
      setSpecs(data.specs);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Parse Print Specifications</h2>
      
      <textarea
        className="w-full h-64 p-4 border rounded-lg"
        placeholder="Paste email or XML content here..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      
      <button
        onClick={handleParse}
        disabled={loading || !content}
        className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
      >
        {loading ? 'Parsing...' : 'Parse Specifications'}
      </button>

      {specs && (
        <>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Extracted Specifications:</h3>
            <pre className="text-sm overflow-x-auto">{JSON.stringify(specs, null, 2)}</pre>
          </div>
          
          <ChecklistView specs={specs} />
        </>
      )}
    </div>
  );
}