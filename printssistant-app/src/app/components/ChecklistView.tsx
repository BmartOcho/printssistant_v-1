'use client';

import { useState, useEffect } from 'react';

interface ChecklistItem {
  task: string;
  importance: string;
  specification: string;
  checked: boolean;
}

interface ChecklistCategory {
  name: string;
  items: ChecklistItem[];
}

interface ChecklistViewProps {
  specs: any;
}

export default function ChecklistView({ specs }: ChecklistViewProps) {
  const [checklist, setChecklist] = useState<{ categories: ChecklistCategory[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkStates, setCheckStates] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (specs) {
      generateChecklist();
    }
  }, [specs]);

  const generateChecklist = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specs }),
      });
      
      const data = await response.json();
      setChecklist(data.checklist);
      
      // Initialize check states
      const initialStates: { [key: string]: boolean } = {};
      data.checklist.categories.forEach((category: ChecklistCategory, catIndex: number) => {
        category.items.forEach((item: ChecklistItem, itemIndex: number) => {
          initialStates[`${catIndex}-${itemIndex}`] = false;
        });
      });
      setCheckStates(initialStates);
    } catch (error) {
      console.error('Error generating checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (categoryIndex: number, itemIndex: number) => {
    const key = `${categoryIndex}-${itemIndex}`;
    setCheckStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getProgress = () => {
    const total = Object.keys(checkStates).length;
    const checked = Object.values(checkStates).filter(Boolean).length;
    return total > 0 ? Math.round((checked / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2">Generating checklist...</p>
      </div>
    );
  }

  if (!checklist) return null;

  const progress = getProgress();

  return (
    <div className="mt-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold">Pre-flight Checklist</h2>
          <span className="text-sm font-medium">{progress}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {checklist.categories.map((category, catIndex) => (
          <div key={catIndex} className="bg-white border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              {category.name}
            </h3>
            <div className="space-y-3">
              {category.items.map((item, itemIndex) => {
                const isChecked = checkStates[`${catIndex}-${itemIndex}`];
                return (
                  <div 
                    key={itemIndex}
                    className={`border rounded p-4 transition-all ${
                      isChecked ? 'bg-green-50 border-green-300' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCheck(catIndex, itemIndex)}
                        className="mt-1 h-5 w-5 text-blue-600 rounded cursor-pointer"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">
                          {item.task}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {item.importance}
                        </div>
                        {item.specification && (
                          <div className="text-sm font-mono bg-white px-2 py-1 rounded mt-2 inline-block">
                            {item.specification}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {progress === 100 && (
        <div className="mt-6 p-4 bg-green-100 border border-green-400 rounded-lg text-center">
          <p className="text-green-800 font-semibold">
            ✓ All checks complete! Your file is ready for print production.
          </p>
        </div>
      )}
    </div>
  );
}