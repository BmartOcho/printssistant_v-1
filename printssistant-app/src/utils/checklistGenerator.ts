import { checklistCategories, ChecklistCategory, ChecklistItem } from '@/data/checklist-templates';

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

export function generateChecklist(jobSpecs: JobSpecs): ChecklistCategory[] {
  // Clone the template categories
  const categories = JSON.parse(JSON.stringify(checklistCategories)) as ChecklistCategory[];

  // Filter categories based on job type
  const relevantCategories = categories.filter(category => {
    if (!category.showForJobTypes) return true; // Show universal categories
    return category.showForJobTypes.some(jobType =>
      jobSpecs.jobType.toLowerCase().includes(jobType.toLowerCase())
    );
  });

  // Auto-fill items based on parsed job specs
  relevantCategories.forEach(category => {
    category.items.forEach(item => {
      if (item.autoFill) {
        item.value = autoFillValue(item.autoFill, jobSpecs);
      }
    });
  });

  return relevantCategories;
}

function autoFillValue(field: string, specs: JobSpecs): string | number | boolean {
  switch (field) {
    case 'jobType':
      return specs.jobType;
    case 'dimensions':
      return `${specs.dimensions.width}" x ${specs.dimensions.height}"`;
    case 'paperStock':
      return specs.paperStock || '';
    case 'quantity':
      return specs.quantity;
    case 'colorMode':
      return specs.colorMode;
    case 'finishing':
      return specs.finishing.join(', ');
    default:
      return '';
  }
}

// Helper function to determine job category for filtering
export function categorizeJobType(jobType: string): string[] {
  const type = jobType.toLowerCase();
  const categories: string[] = [];

  if (type.includes('postcard') || type.includes('mail')) categories.push('postcards');
  if (type.includes('business card')) categories.push('business cards');
  if (type.includes('flyer') || type.includes('brochure')) categories.push('flyers', 'brochures');
  if (type.includes('booklet') || type.includes('catalog')) categories.push('catalogs');

  return categories;
}
