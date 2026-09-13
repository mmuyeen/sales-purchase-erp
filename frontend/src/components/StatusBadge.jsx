export default function StatusBadge({ status }) {
  const slug = String(status || '').toLowerCase().replace(/\s+/g, '-');
  return <span className={`badge badge-${slug}`}>{status}</span>;
}
