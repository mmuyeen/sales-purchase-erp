import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const MARGIN_MM = 10;

// Elements that should never be sliced across an artificial page boundary in
// the rasterized PDF output. Selectors are joined per-call so this stays
// generic across document types (invoice, sales report, ...).
const DEFAULT_NO_SPLIT_SELECTOR = '.invoice-items-table tbody tr, .invoice-footer-block, .sales-report-table tbody tr';

// Filesystem-invalid characters only — the underlying value (e.g. invoice
// number, report date) as shown inside the document is never altered, only
// this filename copy of it.
export function sanitizeForFilename(value) {
  return String(value || 'document').trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');
}

// Walks the given elements in document order and, for any that would
// straddle a page boundary in the sliced PDF output, inserts a blank spacer
// before it so it starts cleanly at the top of the next page instead.
// Positions are re-measured for each element (via getBoundingClientRect)
// so earlier spacers already inserted are correctly accounted for.
// Returns the inserted spacers so the caller can remove them afterward.
function avoidPageSplits(containerEl, pageHeightPx, selector) {
  const spacers = [];
  const elements = containerEl.querySelectorAll(selector);

  elements.forEach((el) => {
    const containerRect = containerEl.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    const top = rect.top - containerRect.top;
    const height = rect.height;
    if (height <= 0 || height >= pageHeightPx) return;

    const startPage = Math.floor(top / pageHeightPx);
    const endPage = Math.floor((top + height - 1) / pageHeightPx);
    if (startPage === endPage) return;

    const nextPageStart = (startPage + 1) * pageHeightPx;
    const spacer = document.createElement('div');
    spacer.style.height = `${nextPageStart - top}px`;
    el.parentNode.insertBefore(spacer, el);
    spacers.push(spacer);
  });

  return spacers;
}

// Renders `element` (an already-mounted DOM node) to a multi-page A4 PDF and
// triggers a browser download as `${filenameBase}.pdf`. Does not read or
// recompute any underlying data itself — it only rasterizes whatever is
// already on screen, so it can never diverge from the real calculated values.
//
// options.orientation: 'portrait' (default) or 'landscape'.
// options.noSplitSelector: override which elements must not be sliced across
// a page boundary (defaults to the invoice + sales-report selectors above).
export async function downloadElementAsPdf(element, filenameBase, options = {}) {
  const orientation = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  const noSplitSelector = options.noSplitSelector || DEFAULT_NO_SPLIT_SELECTOR;

  const pageWidthMm = orientation === 'landscape' ? 297 : 210;
  const pageHeightMm = orientation === 'landscape' ? 210 : 297;
  const contentWidthMm = pageWidthMm - MARGIN_MM * 2;
  const contentHeightMm = pageHeightMm - MARGIN_MM * 2;

  const widthPx = element.scrollWidth;
  const pxToMm = contentWidthMm / widthPx;
  const pageHeightPx = contentHeightMm / pxToMm;

  const spacers = avoidPageSplits(element, pageHeightPx, noSplitSelector);
  try {
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });

    const imgWidthMm = contentWidthMm;
    const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation });
    const totalPages = Math.max(1, Math.ceil(imgHeightMm / contentHeightMm));

    for (let page = 0; page < totalPages; page += 1) {
      if (page > 0) pdf.addPage();
      const position = MARGIN_MM - page * contentHeightMm;
      pdf.addImage(imgData, 'PNG', MARGIN_MM, position, imgWidthMm, imgHeightMm);

      // Keep margins clean on every page regardless of where the sliced
      // image happens to land (this is a rasterized slice, not a native
      // paginated layout, so nothing stops content from bleeding into the
      // margin area without this mask).
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidthMm, MARGIN_MM, 'F');
      pdf.rect(0, pageHeightMm - MARGIN_MM, pageWidthMm, MARGIN_MM, 'F');
      pdf.rect(0, 0, MARGIN_MM, pageHeightMm, 'F');
      pdf.rect(pageWidthMm - MARGIN_MM, 0, MARGIN_MM, pageHeightMm, 'F');
    }

    pdf.save(`${filenameBase}.pdf`);
  } finally {
    spacers.forEach((spacer) => spacer.remove());
  }
}
