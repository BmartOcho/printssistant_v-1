export interface ChecklistItem {
  id: string;
  label: string;
  type: 'checkbox' | 'input' | 'select' | 'number';
  required: boolean;
  category: string;
  jobTypes?: string[]; // Which job types this applies to
  value?: string | boolean | number;
  options?: string[]; // For select dropdowns
  autoFill?: string; // Maps to parsed job spec field
}

export interface ChecklistCategory {
  id: string;
  name: string;
  items: ChecklistItem[];
  showForJobTypes?: string[];
}

export const checklistCategories: ChecklistCategory[] = [
  {
    id: 'job_info',
    name: 'Job Info',
    items: [
      {
        id: 'job_name',
        label: 'Job Name',
        type: 'input',
        required: true,
        category: 'job_info',
        autoFill: 'jobType'
      },
      {
        id: 'size_flat',
        label: 'Size Flat',
        type: 'input',
        required: true,
        category: 'job_info',
        autoFill: 'dimensions'
      },
      {
        id: 'size_finished',
        label: 'Size Finished',
        type: 'input',
        required: true,
        category: 'job_info'
      },
      {
        id: 'stock',
        label: 'Stock',
        type: 'input',
        required: true,
        category: 'job_info',
        autoFill: 'paperStock'
      },
      {
        id: 'quantity',
        label: 'Quantity',
        type: 'number',
        required: true,
        category: 'job_info',
        autoFill: 'quantity'
      },
      {
        id: 'sides',
        label: 'Sides',
        type: 'select',
        options: ['1 Sided', '2 Sided'],
        required: true,
        category: 'job_info'
      },
      {
        id: 'colors',
        label: 'Colors',
        type: 'input',
        required: true,
        category: 'job_info',
        autoFill: 'colorMode'
      }
    ]
  },
  {
    id: 'universal_checks',
    name: 'Universal Checks',
    items: [
      {
        id: 'correct_bleed',
        label: 'Correct Bleed',
        type: 'checkbox',
        required: true,
        category: 'universal_checks'
      },
      {
        id: 'correct_resolution',
        label: 'Correct Resolution (300 DPI)',
        type: 'checkbox',
        required: true,
        category: 'universal_checks'
      },
      {
        id: 'transparency_flattened',
        label: 'Transparency Flattened',
        type: 'checkbox',
        required: true,
        category: 'universal_checks'
      },
      {
        id: 'gutters_margins',
        label: 'Gutters/Margins',
        type: 'checkbox',
        required: true,
        category: 'universal_checks'
      },
      {
        id: 'fonts_outlined',
        label: 'Fonts Outlined',
        type: 'checkbox',
        required: true,
        category: 'universal_checks'
      },
      {
        id: 'color_space',
        label: 'Color Space (CMYK)',
        type: 'checkbox',
        required: true,
        category: 'universal_checks'
      }
    ]
  },
  {
    id: 'mail_jobs',
    name: 'Mail Jobs',
    showForJobTypes: ['postcards', 'letters', 'catalogs'],
    items: [
      {
        id: 'address_placement',
        label: 'Address Placement',
        type: 'checkbox',
        required: true,
        category: 'mail_jobs'
      },
      {
        id: 'postal_requirements',
        label: 'Postal Requirements Met',
        type: 'checkbox',
        required: true,
        category: 'mail_jobs'
      },
      {
        id: 'indicia_placement',
        label: 'Indicia Placement',
        type: 'checkbox',
        required: false,
        category: 'mail_jobs'
      }
    ]
  },
  {
    id: 'press_jobs',
    name: 'Press Jobs',
    showForJobTypes: ['business cards', 'flyers', 'brochures', 'postcards'],
    items: [
      {
        id: 'press_ready_pdf',
        label: 'Press Ready PDF',
        type: 'checkbox',
        required: true,
        category: 'press_jobs'
      },
      {
        id: 'crop_marks',
        label: 'Crop Marks',
        type: 'checkbox',
        required: true,
        category: 'press_jobs'
      },
      {
        id: 'color_bars',
        label: 'Color Bars',
        type: 'checkbox',
        required: false,
        category: 'press_jobs'
      }
    ]
  },
  {
    id: 'bindery',
    name: 'Bindery',
    items: [
      {
        id: 'binding_type',
        label: 'Binding Type',
        type: 'select',
        options: ['None', 'Saddle Stitch', 'Perfect Bind', 'Spiral', 'Wire-O'],
        required: false,
        category: 'bindery',
        autoFill: 'finishing'
      },
      {
        id: 'folding',
        label: 'Folding',
        type: 'input',
        required: false,
        category: 'bindery'
      },
      {
        id: 'cutting',
        label: 'Cutting',
        type: 'checkbox',
        required: false,
        category: 'bindery'
      }
    ]
  }
];
