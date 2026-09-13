import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getInvoice } from '../../api/invoices.js';
import { getCompanyInfo } from '../../api/company.js';
import { downloadElementAsPdf, sanitizeForFilename } from '../../utils/pdf.js';
import InvoiceDocument from '../../components/InvoiceDocument.jsx';

export default function InvoicePrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const autoAction = searchParams.get('action'); // 'print' | 'download', set by InvoiceDetail's buttons
  const [invoice, setInvoice] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const documentRef = useRef(null);
  const autoActionHandled = useRef(false);

  useEffect(() => {
    Promise.all([getInvoice(id), getCompanyInfo()])
      .then(([invRes, companyRes]) => {
        setInvoice(invRes.data);
        setCompany(companyRes.data);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleDownload() {
    if (!documentRef.current || !invoice) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf(documentRef.current, `Invoice_${sanitizeForFilename(invoice.invoiceNumber)}`);
    } catch (err) {
      setError(err.message || 'Failed to generate PDF.');
    } finally {
      setDownloading(false);
    }
  }

  // One-click support: InvoiceDetail's "Print Invoice" / "Download PDF"
  // buttons open this page with ?action=print or ?action=download so the
  // user doesn't need a second click here.
  useEffect(() => {
    if (autoActionHandled.current || !invoice || !company) return;
    autoActionHandled.current = true;
    if (autoAction === 'print') {
      setTimeout(() => window.print(), 200);
    } else if (autoAction === 'download') {
      setTimeout(() => handleDownload(), 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice, company, autoAction]);

  if (error) return <div className="alert alert-error" style={{ margin: 20 }}>{error}</div>;
  if (!invoice || !company) return <p style={{ margin: 20 }}>Loading...</p>;

  return (
    <div>
      <div className="no-print" style={{ maxWidth: 860, margin: '0 auto 16px', padding: '0 24px', textAlign: 'right' }}>
        <button className="btn btn-secondary" onClick={() => window.print()} style={{ marginRight: 8 }}>
          Print Invoice
        </button>
        <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
          {downloading ? 'Generating PDF...' : 'Download PDF'}
        </button>
      </div>

      <InvoiceDocument ref={documentRef} invoice={invoice} company={company} />
    </div>
  );
}
