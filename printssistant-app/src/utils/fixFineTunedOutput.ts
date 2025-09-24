export function fixFineTunedOutput(specs: any): any {
  // Create a clean object with proper defaults
  const fixed: any = {
    jobType: '',
    dimensions: {
      width: '',
      height: '',
      unit: 'inches'
    },
    quantity: 0,
    colorMode: 'CMYK',
    bleed: {
      value: '0.125',
      unit: 'inches'
    },
    resolution: '300',
    fileFormat: 'PDF',
    paperStock: '',
    finishing: [],
    specialRequirements: [],
    deadline: ''
  };

  // Fix job type - capitalize properly
  if (specs.jobType) {
    fixed.jobType = specs.jobType
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Fix common variations
    if (fixed.jobType.toLowerCase().includes('window decal')) {
      fixed.jobType = 'Window Decals';
    }
    if (fixed.jobType.toLowerCase().includes('name badge')) {
      fixed.jobType = 'Name Badges';
    }
    if (fixed.jobType.toLowerCase().includes('booklet')) {
      fixed.jobType = 'Self Cover Booklet';
    }
  }

  // Fix dimensions
  if (specs.dimensions) {
    fixed.dimensions.width = String(specs.dimensions.width || '');
    fixed.dimensions.height = String(specs.dimensions.height || '');
    
    // Fix unit variations
    const unit = String(specs.dimensions.unit || 'inches').toLowerCase();
    if (unit.includes('inch') || unit === 'in' || unit === '"') {
      fixed.dimensions.unit = 'inches';
    } else if (unit === 'mm' || unit.includes('millimeter')) {
      fixed.dimensions.unit = 'mm';
    } else {
      fixed.dimensions.unit = 'inches';
    }
  }

  // Fix quantity
  fixed.quantity = parseInt(specs.quantity) || 0;

  // Fix color mode
  if (specs.colorMode) {
    const colorMode = String(specs.colorMode).toLowerCase();
    if (colorMode.includes('not specified') || colorMode === 'null' || !colorMode) {
      fixed.colorMode = 'CMYK'; // Default
    } else if (colorMode.includes('cmyk') || colorMode.includes('4cp')) {
      fixed.colorMode = 'CMYK';
    } else if (colorMode.includes('rgb')) {
      fixed.colorMode = 'RGB';
    } else if (colorMode.includes('black') || colorMode.includes('b&w')) {
      fixed.colorMode = 'Black & White';
    } else {
      fixed.colorMode = specs.colorMode;
    }
  }

  // Fix bleed
  if (specs.bleed) {
    const bleedValue = String(specs.bleed.value || '').toLowerCase();
    if (bleedValue.includes('not specified') || bleedValue === 'null' || bleedValue === 'yes') {
      fixed.bleed.value = '0.125'; // Standard bleed
    } else if (bleedValue) {
      fixed.bleed.value = bleedValue.replace(/[^\d.]/g, ''); // Extract number
    }
    
    const bleedUnit = String(specs.bleed.unit || '').toLowerCase();
    if (bleedUnit.includes('inch') || !bleedUnit || bleedUnit === 'not specified') {
      fixed.bleed.unit = 'inches';
    } else if (bleedUnit === 'mm') {
      fixed.bleed.unit = 'mm';
    }
  }

  // Fix resolution
  if (specs.resolution) {
    const resolution = String(specs.resolution).toLowerCase();
    if (resolution.includes('not specified') || resolution === 'null' || !resolution) {
      fixed.resolution = '300';
    } else if (resolution.includes('standard')) {
      fixed.resolution = '300';
    } else {
      fixed.resolution = specs.resolution.replace(/[^\d]/g, ''); // Extract number
    }
  }

  // Fix file format
  if (specs.fileFormat) {
    const format = String(specs.fileFormat).toUpperCase();
    if (format.includes('NOT SPECIFIED') || format === 'NULL') {
      fixed.fileFormat = 'PDF';
    } else {
      fixed.fileFormat = format;
    }
  }

  // Fix paper stock
  if (specs.paperStock) {
    fixed.paperStock = specs.paperStock;
    // Standardize common stocks
    if (fixed.paperStock.toLowerCase().includes('15 mil') || 
        fixed.paperStock.toLowerCase().includes('14 mil')) {
      fixed.paperStock = '15 mil PVC';
    }
  }

  // Fix finishing - ensure it's an array
  if (Array.isArray(specs.finishing)) {
    fixed.finishing = specs.finishing.map((item: any) => {
      const itemStr = String(item);
      // Capitalize first letter of each word
      return itemStr.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    });
  }

  // Fix special requirements - ensure it's an array
  if (Array.isArray(specs.specialRequirements)) {
    fixed.specialRequirements = specs.specialRequirements;
  }

  // Fix deadline
  if (specs.deadline) {
    const deadline = String(specs.deadline).toLowerCase();
    if (deadline.includes('not mentioned') || deadline === 'null') {
      fixed.deadline = '';
    } else {
      fixed.deadline = specs.deadline;
    }
  }

  return fixed;
}