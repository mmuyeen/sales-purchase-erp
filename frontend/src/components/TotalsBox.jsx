import { formatCurrency } from '../utils/format.js';

// Falls back to a single legacy "Tax" line for records created before the
// CGST/SGST/IGST breakup existed (all three amounts are exactly 0 but the
// old tax_amount is not) — those totals are never recalculated retroactively.
export default function TotalsBox({ totals }) {
  const hasBreakup = Number(totals.cgstAmount || 0) > 0 || Number(totals.sgstAmount || 0) > 0 || Number(totals.igstAmount || 0) > 0;
  const isLegacy = !hasBreakup && Number(totals.taxAmount || 0) > 0;

  const taxableAmount = Number(totals.taxableAmount || 0);
  const cgstRate = taxableAmount > 0 ? Math.round((Number(totals.cgstAmount || 0) / taxableAmount) * 10000) / 100 : 0;
  const sgstRate = taxableAmount > 0 ? Math.round((Number(totals.sgstAmount || 0) / taxableAmount) * 10000) / 100 : 0;
  const igstRate = taxableAmount > 0 ? Math.round((Number(totals.igstAmount || 0) / taxableAmount) * 10000) / 100 : 0;

  return (
    <div className="totals-box">
      <table>
        <tbody>
          <tr><td>Subtotal</td><td>{formatCurrency(totals.subtotal)}</td></tr>
          <tr><td>Discount</td><td>{formatCurrency(totals.discountAmount)}</td></tr>
          <tr><td>Taxable Amount</td><td>{formatCurrency(totals.taxableAmount)}</td></tr>
          {isLegacy ? (
            <tr><td>Tax</td><td>{formatCurrency(totals.taxAmount)}</td></tr>
          ) : (
            <>
              <tr><td>CGST @ {cgstRate}%</td><td>{formatCurrency(totals.cgstAmount)}</td></tr>
              <tr><td>SGST @ {sgstRate}%</td><td>{formatCurrency(totals.sgstAmount)}</td></tr>
              <tr><td>IGST @ {igstRate}%</td><td>{formatCurrency(totals.igstAmount)}</td></tr>
              <tr><td>Total GST</td><td>{formatCurrency(totals.totalGst)}</td></tr>
              <tr><td>Round Off</td><td>{formatCurrency(totals.roundOff)}</td></tr>
            </>
          )}
          <tr className="grand-total"><td>Grand Total</td><td>{formatCurrency(totals.grandTotal)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
