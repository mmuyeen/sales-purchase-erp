import { forwardRef } from 'react';
import { formatCurrency, formatDate } from '../utils/format.js';
import { amountInWordsInr } from '../utils/numberToWords.js';
import { resolveStateCode } from '@shared/gst.js';
import { DEFAULT_INVOICE_TERMS } from '@shared/constants.js';

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

// Effective/blended rate for display only (amount ÷ taxable × 100) — matches
// the on-screen TotalsBox convention, and stays correct even on the rare
// invoice mixing more than one tax_percentage across its lines.
function effectiveRate(amount, taxableAmount) {
  const base = Number(taxableAmount || 0);
  if (base <= 0) return 0;
  return round2((Number(amount || 0) / base) * 100);
}

// Pure presentational invoice layout — no data fetching, no calculation.
// Used by both the on-screen/print route (InvoicePrint.jsx) and the
// "Download PDF" action, so there is exactly one invoice design, never two.
// forwardRef exposes the outer DOM node so it can be captured (html2canvas)
// for PDF generation.
const InvoiceDocument = forwardRef(function InvoiceDocument({ invoice, company }, ref) {
  // The customer's state/GST are read from the invoice's own frozen snapshot
  // (customerGstNumber/customerState), never from a live customer lookup, so
  // an old invoice keeps showing exactly what applied when it was created.
  const customerStateCode = resolveStateCode({ gstNumber: invoice.customerGstNumber, state: invoice.customerState });
  const companyStateCode = company.stateCode;
  const hasGstBreakup = invoice.gstType !== null && invoice.gstType !== undefined;

  const cgstRate = hasGstBreakup ? effectiveRate(invoice.cgstAmount, invoice.taxableAmount) : 0;
  const sgstRate = hasGstBreakup ? effectiveRate(invoice.sgstAmount, invoice.taxableAmount) : 0;
  const igstRate = hasGstBreakup ? effectiveRate(invoice.igstAmount, invoice.taxableAmount) : 0;

  return (
    <div ref={ref} className="invoice-paper">
      {/* ============ Header: company masthead + TAX INVOICE / number / date ============ */}
      <div className="invoice-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '1.15rem', fontWeight: 'bold' }}>{company.name || 'Your Company Name'}</div>
          {company.address && <div>{company.address}</div>}
          {company.gstNumber && <div>GSTIN: {company.gstNumber}</div>}
          {company.state && <div>State: {company.state}{companyStateCode ? `, Code: ${companyStateCode}` : ''}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: 1 }}>TAX INVOICE</div>
          <div>Invoice Number: {invoice.invoiceNumber}</div>
          <div>Invoice Date: {formatDate(invoice.invoiceDate)}</div>
        </div>
      </div>

      {/* ============ Bill To (left) | Invoice details (right) ============ */}
      <div className="invoice-section invoice-two-col">
        <div className="invoice-two-col-cell">
          <div className="invoice-cell-heading">Bill To</div>
          <div>{invoice.customerName}</div>
          {invoice.customerAddress && <div>{invoice.customerAddress}</div>}
          {invoice.customerGstNumber && <div>GSTIN: {invoice.customerGstNumber}</div>}
          {invoice.customerState && <div>State: {invoice.customerState}{customerStateCode ? `, Code: ${customerStateCode}` : ''}</div>}
        </div>
        <div className="invoice-two-col-cell">
          <div className="invoice-cell-heading">Invoice Details</div>
          <div>Invoice No.: {invoice.invoiceNumber}</div>
          <div>Invoice Date: {formatDate(invoice.invoiceDate)}</div>
          {invoice.soNumber && <div>Reference SO: {invoice.soNumber}</div>}
          <div>Payment Terms: {invoice.paymentTerms || '-'}</div>
        </div>
      </div>

      {/* ============ Line items ============ */}
      <div className="invoice-section" style={{ padding: 0 }}>
        <table className="invoice-items-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>S.No</th>
              <th style={{ textAlign: 'left' }}>Description</th>
              <th style={{ textAlign: 'left' }}>HSN Code</th>
              <th style={{ textAlign: 'right' }}>UOM</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Rate</th>
              <th style={{ textAlign: 'right' }}>Discount</th>
              <th style={{ textAlign: 'right' }}>Taxable Value</th>
              <th style={{ textAlign: 'right' }}>Tax %</th>
              <th style={{ textAlign: 'right' }}>Tax Amount</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => {
              const taxableValue = round2(Number(item.quantity) * Number(item.rate) - Number(item.discountAmount));
              return (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>{item.productName}{item.description ? ` - ${item.description}` : ''}</td>
                  <td>{item.hsnCode || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{item.uom}</td>
                  <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.rate)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.discountAmount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(taxableValue)}</td>
                  <td style={{ textAlign: 'right' }}>{item.taxPercentage}%</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.taxAmount)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(item.lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ============ Tax breakup + totals (right-aligned box) ============ */}
      <div className="invoice-section" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <table className="invoice-totals-table">
          <tbody>
            <tr><td>Subtotal</td><td>{formatCurrency(invoice.subtotal)}</td></tr>
            <tr><td>Discount</td><td>{formatCurrency(invoice.discountAmount)}</td></tr>
            <tr><td>Taxable Amount</td><td>{formatCurrency(invoice.taxableAmount)}</td></tr>
            {hasGstBreakup ? (
              <>
                <tr><td>CGST @ {cgstRate}%</td><td>{formatCurrency(invoice.cgstAmount)}</td></tr>
                <tr><td>SGST @ {sgstRate}%</td><td>{formatCurrency(invoice.sgstAmount)}</td></tr>
                <tr><td>IGST @ {igstRate}%</td><td>{formatCurrency(invoice.igstAmount)}</td></tr>
                <tr><td>Total GST</td><td>{formatCurrency(invoice.totalGst)}</td></tr>
                <tr><td>Round Off</td><td>{formatCurrency(invoice.roundOff)}</td></tr>
              </>
            ) : (
              <tr><td>Tax</td><td>{formatCurrency(invoice.taxAmount)}</td></tr>
            )}
            <tr><td>Paid</td><td>{formatCurrency(invoice.paidAmount)}</td></tr>
            <tr><td>Balance</td><td>{formatCurrency(invoice.balanceAmount)}</td></tr>
            <tr className="invoice-totals-grand"><td>Grand Total</td><td>{formatCurrency(invoice.grandTotal)}</td></tr>
          </tbody>
        </table>
      </div>

      {/* ============ Amount in words + Terms (left) | Signatory (right) ============ */}
      <div className="invoice-section invoice-footer-block">
        <div className="invoice-two-col">
          <div className="invoice-two-col-cell">
            <div style={{ marginBottom: 10 }}>
              Amount in Words : {amountInWordsInr(invoice.grandTotal)}.
            </div>
            <div className="invoice-terms-heading">Terms &amp; Conditions :</div>
            <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {DEFAULT_INVOICE_TERMS.map((term, idx) => (
                <li key={idx} style={{ fontWeight: term.bold ? 'bold' : 'normal', marginBottom: 2 }}>
                  {term.text}
                </li>
              ))}
            </ol>
          </div>
          <div className="invoice-two-col-cell invoice-signatory-block" style={{ textAlign: 'right', minHeight: 110 }}>
            <div>For {company.name || 'Your Company Name'}</div>
            <div style={{ marginTop: 70, borderTop: '1px solid #111', display: 'inline-block', paddingTop: 4, minWidth: 180 }}>
              Authorised Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default InvoiceDocument;
