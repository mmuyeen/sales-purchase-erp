// Mirrors backend/services/calculations.js so the form shows live totals.
// The backend always recalculates and is the source of truth on save.
function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// gstType is 'INTRA' or 'INTER' (see @shared/gst.js) — determined once per
// document from the selected party's + company's state, then applied to
// every line, exactly mirroring the backend.
export function computeLine(item, gstType) {
  const quantity = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const discountAmount = Number(item.discountAmount) || 0;
  const taxPercentage = Number(item.taxPercentage) || 0;

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

  return { gross, taxableAmount, cgstAmount, sgstAmount, igstAmount, taxAmount, lineTotal };
}

export function computeDocumentTotals(items, gstType) {
  const totals = items.reduce(
    (acc, item) => {
      const computed = computeLine(item, gstType);
      return {
        subtotal: acc.subtotal + computed.gross,
        discountAmount: acc.discountAmount + (Number(item.discountAmount) || 0),
        taxableAmount: acc.taxableAmount + computed.taxableAmount,
        cgstAmount: acc.cgstAmount + computed.cgstAmount,
        sgstAmount: acc.sgstAmount + computed.sgstAmount,
        igstAmount: acc.igstAmount + computed.igstAmount,
      };
    },
    { subtotal: 0, discountAmount: 0, taxableAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 }
  );

  const taxableAmount = round2(totals.taxableAmount);
  const cgstAmount = round2(totals.cgstAmount);
  const sgstAmount = round2(totals.sgstAmount);
  const igstAmount = round2(totals.igstAmount);
  const totalGst = round2(cgstAmount + sgstAmount + igstAmount);

  const totalBeforeRounding = round2(taxableAmount + totalGst);
  const roundedTotal = Math.round(totalBeforeRounding);
  const roundOff = round2(roundedTotal - totalBeforeRounding);
  const grandTotal = round2(totalBeforeRounding + roundOff);

  return {
    subtotal: round2(totals.subtotal),
    discountAmount: round2(totals.discountAmount),
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalGst,
    roundOff,
    grandTotal,
    gstType,
  };
}
