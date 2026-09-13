const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return `${TENS[tens]}${ones ? ' ' + ONES[ones] : ''}`;
}

// Used for the crore/lakh/thousand groups, which are not followed by "and".
function threeDigits(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

// Used only for the final (0-999) group, where standard Indian currency
// phrasing joins the hundred and the remaining tens/ones with "and"
// (e.g. "Two Hundred and Fifty", not "Two Hundred Fifty").
function finalGroupToWords(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) {
    if (hundreds) parts.push('and');
    parts.push(twoDigits(rest));
  }
  return parts.join(' ');
}

// Indian numbering system: crore (10^7), lakh (10^5), thousand (10^3).
function integerToWords(n) {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const parts = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(finalGroupToWords(hundred));
  return parts.join(' ');
}

// e.g. amountInWordsInr(44250) => "Rupees Forty Four Thousand Two Hundred and Fifty Only"
export function amountInWordsInr(amount) {
  const value = Math.round((Number(amount) || 0) * 100) / 100;
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);

  const rupeeWords = integerToWords(rupees);
  if (paise > 0) {
    return `Rupees ${rupeeWords} and ${integerToWords(paise)} Paise Only`;
  }
  return `Rupees ${rupeeWords} Only`;
}
