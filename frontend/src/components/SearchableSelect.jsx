import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// The option list is rendered in a portal attached directly to <body>, positioned
// from the input's live on-screen coordinates (recalculated on open/scroll/resize).
// This is what lets it escape clipping by any scrollable/overflow ancestor (e.g. the
// horizontally-scrolling Line Items table wrapper) and paint above surrounding
// content, instead of being confined to that ancestor's box.
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  getLabel = (o) => o.label,
  getValue = (o) => o.value,
  disabled = false,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const containerRef = useRef(null);

  const selected = options.find((o) => String(getValue(o)) === String(value));

  function updatePosition() {
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setRect({ top: r.bottom, left: r.left, width: r.width });
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event) {
      const insideField = containerRef.current && containerRef.current.contains(event.target);
      const insidePortalList = event.target.closest && event.target.closest('.searchable-select-options');
      if (!insideField && !insidePortalList) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => getLabel(o).toLowerCase().includes(q));
  }, [options, query]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="searchable-select" ref={containerRef}>
      <input
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={open ? query : selected ? getLabel(selected) : ''}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && rect && createPortal(
        <ul
          className="searchable-select-options"
          style={{ position: 'fixed', top: rect.top, left: rect.left, width: rect.width }}
        >
          {filtered.length === 0 && <li className="empty">No matches</li>}
          {filtered.map((o) => (
            <li
              key={getValue(o)}
              onClick={() => {
                onChange(getValue(o));
                setOpen(false);
                setQuery('');
              }}
            >
              {getLabel(o)}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
