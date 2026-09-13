export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// Recomputes one line item's amounts server-side. Never trusts totals sent by
// the frontend — only quantity, rate, discount and tax % are used, plus the
// document's GST type (intra/inter-state), which the caller determines once
// from seller/buyer state codes (see shared/gst.js) and applies to every line.
//
// Intra-state: the line's total GST is split evenly into CGST + SGST.
// Inter-state: the line's total GST goes entirely to IGST.
export function computeLine(item, gstType) {
  const quantity = Number(item.quantity);
  const rate = Number(item.rate);
  const discountAmount = Number(item.discountAmount || 0);
  const taxPercentage = Number(item.taxPercentage);

  const gross = round2(quantity * rate);
  const taxableAmount = round2(gross - discountAmount);

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  if (gstType === 'INTER') {
    igstAmount = round2((taxableAmount * taxPercentage) / 100);
  } else {
    cgstAmount = round2((taxableAmount * taxPercentage) / 200);
    sgstAmount = round2((taxableAmount * taxPercentage) / 200);
  }
  const taxAmount = round2(cgstAmount + sgstAmount + igstAmount);
  const lineTotal = round2(taxableAmount + taxAmount);

  return {
    ...item, quantity, rate, discountAmount, taxPercentage,
    gross, taxableAmount, cgstAmount, sgstAmount, igstAmount, taxAmount, lineTotal,
  };
}

// gstType must be 'INTRA' or 'INTER' — the caller resolves this once per
// document from seller/buyer state codes before calling this function.
export function computeDocumentTotals(items, gstType) {
  const computedItems = items.map((item) => computeLine(item, gstType));

  const subtotal = round2(computedItems.reduce((sum, i) => sum + i.gross, 0));
  const discountAmount = round2(computedItems.reduce((sum, i) => sum + i.discountAmount, 0));
  const taxableAmount = round2(computedItems.reduce((sum, i) => sum + i.taxableAmount, 0));
  const cgstAmount = round2(computedItems.reduce((sum, i) => sum + i.cgstAmount, 0));
  const sgstAmount = round2(computedItems.reduce((sum, i) => sum + i.sgstAmount, 0));
  const igstAmount = round2(computedItems.reduce((sum, i) => sum + i.igstAmount, 0));
  const totalGst = round2(cgstAmount + sgstAmount + igstAmount);

  // Round Off: nudges the total to the nearest whole rupee, per standard
  // Indian invoicing convention. round_off = rounded - unrounded, so
  // unrounded + round_off === rounded exactly.
  const totalBeforeRounding = round2(taxableAmount + totalGst);
  const roundedTotal = Math.round(totalBeforeRounding);
  const roundOff = round2(roundedTotal - totalBeforeRounding);
  const grandTotal = round2(totalBeforeRounding + roundOff);

  return {
    computedItems,
    subtotal,
    discountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalGst,
    // Kept as an alias for totalGst: existing columns/reports named tax_amount
    // continue to mean "total GST" for documents created after this change.
    taxAmount: totalGst,
    roundOff,
    grandTotal,
    gstType,
  };
}
