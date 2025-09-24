export function mapFineTunedToExpectedFormat(rawSpecs: any): any {
  // Extract job type from various possible locations
  const jobType = rawSpecs.project_type || rawSpecs.job_name || rawSpecs.requestor || '';

  // Extract dimensions
  let width = '', height = '', unit = 'inches';
  if (rawSpecs.specifications?.dimensions) {
    const dims = rawSpecs.specifications.dimensions;
    width = dims.width?.replace(/[^\d.]/g, '') || '';
    height = dims.height?.replace(/[^\d.]/g, '') || '';
  }

  // Extract quantity
  const quantity = rawSpecs.quantity || rawSpecs.orderDetails?.quantity || 0;

  return {
    jobType,
    dimensions: { width, height, unit },
    quantity,
    colorMode: "Not specified",
    bleed: { value: "Not specified", unit: "Not specified" },
    resolution: "Not specified",
    fileFormat: "Not specified",
    paperStock: rawSpecs.specifications?.stock || rawSpecs.specifications?.material || "",
    finishing: rawSpecs.specifications?.finishing || [],
    specialRequirements: rawSpecs.additionalRequirements || [],
    deadline: rawSpecs.pickup_details?.date || rawSpecs.delivery_date || ""
  };
}
