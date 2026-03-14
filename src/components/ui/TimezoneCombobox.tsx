'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

/** All IANA timezone names via Intl API (with fallback for older environments). */
function getTimezoneList(): string[] {
  try {
    return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone');
  } catch {
    return [
      'Africa/Abidjan', 'America/New_York', 'America/Chicago', 'America/Denver',
      'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
      'Australia/Sydney', 'Europe/Berlin', 'Europe/Budapest', 'Europe/London',
      'Europe/Paris', 'Europe/Prague', 'Pacific/Auckland', 'UTC',
    ];
  }
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4 text-text-tertiary pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export interface TimezoneComboboxProps {
  value: string;
  onChange: (tz: string) => void;
  placeholder: string;
  disabled?: boolean;
  inputClass: string;
  /** Hidden input name for form submission (default "timezone") */
  name?: string;
}

/**
 * Searchable combobox for IANA timezone selection.
 * Reusable from ScheduleForm and any other form that needs timezone picker.
 */
export function TimezoneCombobox({
  value,
  onChange,
  placeholder,
  disabled,
  inputClass,
  name = 'timezone',
}: TimezoneComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const tzList = useMemo(getTimezoneList, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tzList.slice(0, 80);
    return tzList.filter((tz) => tz.toLowerCase().includes(q)).slice(0, 100);
  }, [tzList, query]);

  useEffect(() => {
    if (!open) return;
    function onMousedown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onMousedown);
    return () => document.removeEventListener('mousedown', onMousedown);
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filtered]);

  function handleSelect(tz: string) {
    onChange(tz);
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightedIndex]) handleSelect(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />

      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          value={open ? query : value}
          placeholder={open ? placeholder : value || placeholder}
          onChange={(e) => { setQuery(e.target.value); setHighlightedIndex(0); }}
          onFocus={() => { setQuery(''); setOpen(true); }}
          onKeyDown={handleKeyDown}
          className={`${inputClass} pr-8`}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
        />
        <span className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
          <ChevronDownIcon />
        </span>
      </div>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 w-full mt-1 max-h-52 overflow-y-auto rounded-lg border border-border-medium bg-background-card shadow-lg py-1"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-text-tertiary select-none">—</li>
          ) : (
            filtered.map((tz, idx) => (
              <li
                key={tz}
                role="option"
                aria-selected={tz === value}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(tz); }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={[
                  'px-3 py-2 text-sm cursor-pointer select-none',
                  idx === highlightedIndex
                    ? 'bg-primary/10 text-primary'
                    : tz === value
                      ? 'text-primary font-medium'
                      : 'text-text-primary hover:bg-surface-50',
                ].join(' ')}
              >
                {tz}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
