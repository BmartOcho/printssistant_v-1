export function validateAndFixSpecs(specs: any, emailContent: string): any {
  const fixed = { ...specs };
  const emailLower = emailContent.toLowerCase();

  // Fix job type based on context
  if (emailLower.includes('wallet') && !fixed.jobType.toLowerCase().includes('wallet')) {
    fixed.jobType = 'Pre-Trip Wallet';
  }
  if (emailLower.includes('booklet') && !fixed.jobType.toLowerCase().includes('booklet')) {
    if (emailLower.includes('self cover') || emailLower.includes('self-cover')) {
      fixed.jobType = 'Self-Cover Booklet';
    } else {
      fixed.jobType = 'Booklet';
    }
  }
  if (emailLower.includes('window decal')) {
    fixed.jobType = 'Window Decals';
  }
  if (emailLower.includes('name badge')) {
    fixed.jobType = 'Name Badges';
  }
  if (emailLower.includes('lookbook')) {
    fixed.jobType = 'Lookbook';
  }

  // Fix quantity - look for first clear quantity mention
  if (fixed.quantity === 0 || !fixed.quantity) {
    const qtyMatch = emailContent.match(/qty:?\s*(\d+)/i) || 
                     emailContent.match(/quantity:?\s*(\d+)/i) ||
                     emailContent.match(/print\s+(\d+)\s+units/i);
    if (qtyMatch) {
      fixed.quantity = parseInt(qtyMatch[1]);
    }
  }

  // Ensure color mode has a value
  if (!fixed.colorMode || fixed.colorMode === '') {
    if (emailLower.includes('4cp') || emailLower.includes('full color') || emailLower.includes('cmyk')) {
      fixed.colorMode = 'CMYK';
    } else if (emailLower.includes('black and white') || emailLower.includes('b&w')) {
      fixed.colorMode = 'Black & White';
    } else {
      fixed.colorMode = 'CMYK'; // Default
    }
  }

  // Fix dimensions for booklets (finished size vs flat size)
  if (fixed.jobType.toLowerCase().includes('booklet')) {
    const finishedMatch = emailContent.match(/finished\s+size:?\s*(\d+(?:\.\d+)?)["\s]*x\s*(\d+(?:\.\d+)?)/i);
    if (finishedMatch) {
      fixed.dimensions = {
        width: finishedMatch[1],
        height: finishedMatch[2],
        unit: 'inches'
      };
    }
  }

  // Ensure basic defaults
  if (!fixed.bleed || !fixed.bleed.value) {
    fixed.bleed = { value: '0.125', unit: 'inches' };
  }
  
  if (!fixed.resolution) {
    fixed.resolution = '300';
  }
  
  if (!fixed.fileFormat) {
    fixed.fileFormat = 'PDF';
  }

  // Ensure finishing is an array
  if (!Array.isArray(fixed.finishing)) {
    fixed.finishing = [];
  }

  // Add standard finishing for booklets
  if (fixed.jobType.toLowerCase().includes('booklet') && fixed.finishing.length === 0) {
    if (emailLower.includes('saddle') || emailLower.includes('stitch')) {
      fixed.finishing.push('Saddle-stitch');
    }
    if (emailLower.includes('trim')) {
      fixed.finishing.push('Trim');
    }
    if (emailLower.includes('score')) {
      fixed.finishing.push('Score');
    }
    if (emailLower.includes('collate')) {
      fixed.finishing.push('Collate');
    }
  }

  // Ensure special requirements is an array
  if (!Array.isArray(fixed.specialRequirements)) {
    fixed.specialRequirements = [];
  }

  return fixed;
}