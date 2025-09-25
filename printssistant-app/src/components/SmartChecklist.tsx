'use client';

import React, { useState } from 'react';
import { ChecklistCategory, ChecklistItem } from '@/data/checklist-templates';

interface SmartChecklistProps {
  categories: ChecklistCategory[];
  onItemChange: (categoryId: string, itemId: string, value: string | boolean | number) => void;
}

export default function SmartChecklist({ categories, onItemChange }: SmartChecklistProps) {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">PrintPrep Checklist</h2>
        <p className="text-gray-600">Pre-flight checklist auto-generated from job specifications</p>
      </div>

      <div className="space-y-6">
        {categories.map(category => (
          <ChecklistSection
            key={category.id}
            category={category}
            onItemChange={onItemChange}
          />
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Export PDF
        </button>
        <button className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
          Mark Complete
        </button>
        <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
          Save Progress
        </button>
      </div>
    </div>
  );
}

interface ChecklistSectionProps {
  category: ChecklistCategory;
  onItemChange: (categoryId: string, itemId: string, value: string | boolean | number) => void;
}

function ChecklistSection({ category, onItemChange }: ChecklistSectionProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
        {category.name}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {category.items.map(item => (
          <ChecklistItemComponent
            key={item.id}
            item={item}
            onChange={(value) => onItemChange(category.id, item.id, value)}
          />
        ))}
      </div>
    </div>
  );
}

interface ChecklistItemComponentProps {
  item: ChecklistItem;
  onChange: (value: string | boolean | number) => void;
}

function ChecklistItemComponent({ item, onChange }: ChecklistItemComponentProps) {
  const [value, setValue] = useState<string | number | boolean>(item.value ?? '');

  const handleChange = (newValue: string | boolean | number) => {
    setValue(newValue);
    onChange(newValue);
  };

  const renderInput = () => {
    switch (item.type) {
      case 'checkbox':
        return (
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id={item.id}
              checked={Boolean(value)}
              onChange={(e) => handleChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor={item.id}
              className={`text-sm ${item.required ? 'font-medium text-gray-900' : 'text-gray-700'}`}
            >
              {item.label}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-1">
            <label
              htmlFor={item.id}
              className={`text-sm ${item.required ? 'font-medium text-gray-900' : 'text-gray-700'}`}
            >
              {item.label}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              id={item.id}
              value={String(value)}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">Select...</option>
              {item.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-1">
            <label
              htmlFor={item.id}
              className={`text-sm ${item.required ? 'font-medium text-gray-900' : 'text-gray-700'}`}
            >
              {item.label}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              id={item.id}
              value={String(value)}
              onChange={(e) => handleChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        );

      default: // 'input'
        return (
          <div className="space-y-1">
            <label
              htmlFor={item.id}
              className={`text-sm ${item.required ? 'font-medium text-gray-900' : 'text-gray-700'}`}
            >
              {item.label}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              id={item.id}
              value={String(value)}
              onChange={(e) => handleChange(e.target.value)}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm ${
                item.value ? 'bg-blue-50 border-blue-300' : ''
              }`}
              placeholder={item.value ? 'Auto-filled from job specs' : ''}
            />
          </div>
        );
    }
  };

  return (
    <div className={`p-3 rounded-md ${item.required ? 'bg-red-50' : 'bg-gray-50'}`}>
      {renderInput()}
    </div>
  );
}
