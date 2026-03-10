'use client';

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type KeyboardEvent,
} from 'react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional leading content (e.g. flag emoji, icon) */
  leading?: ReactNode;
}

export interface SelectProps<T extends string = string> {
  id?: string;
  name?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  onBlur?: () => void;
  disabled?: boolean;
  /** Placeholder when no value matches (should not happen if value is controlled) */
  placeholder?: string;
  /** 'default' = form style with border; 'compact' = tighter for inline/sidebar */
  variant?: 'default' | 'compact';
  /** For dark sidebar context – uses CSS variables */
  dark?: boolean;
  /** Optional label – not rendered inside Select, use with external label for form layout */
  'aria-label': string;
  className?: string;
}

const triggerBase =
  'w-full flex items-center justify-between gap-2 text-left rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

const triggerDefault =
  'min-h-[44px] px-3 py-2.5 text-base border border-border-medium bg-background-card text-text-primary';

const triggerCompact = 'min-h-[36px] px-3 py-2 text-sm font-medium';

const listBase =
  'absolute z-50 min-w-[var(--select-trigger-width)] max-h-[280px] overflow-auto rounded-lg shadow-dropdown border border-border-light bg-background-card py-1 animate-fade-up origin-top';

const optionBase =
  'flex items-center gap-2 w-full px-3 py-2.5 text-left text-base cursor-pointer transition-colors outline-none';

export function Select<T extends string = string>({
  id,
  name,
  value,
  options,
  onChange,
  onBlur,
  disabled = false,
  placeholder,
  variant = 'default',
  dark = false,
  'aria-label': ariaLabel,
  className = '',
}: SelectProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    if (open && triggerRef.current && containerRef.current) {
      const w = triggerRef.current.getBoundingClientRect().width;
      containerRef.current.style.setProperty('--select-trigger-width', `${w}px`);
    }
  }, [open]);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label ?? placeholder ?? value;

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(0);
    onBlur?.();
  }, [onBlur]);

  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    setHighlightedIndex(idx >= 0 ? idx : 0);
  }, [open, value, options]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const handleKeyDown = (e: Event) => {
      if ((e as unknown as KeyboardEvent).key === 'Escape') close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, close]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => (i < options.length - 1 ? i + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : options.length - 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (options[highlightedIndex]) {
          onChange(options[highlightedIndex].value);
          close();
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open, highlightedIndex]);

  const triggerClass =
    variant === 'compact' ? triggerCompact : triggerDefault;
  const triggerStyle = dark
    ? {
        background: 'var(--sidebar-surface)',
        borderColor: 'var(--sidebar-border)',
        color: 'var(--sidebar-muted)',
      }
    : undefined;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {name != null && (
        <input
          type="hidden"
          name={name}
          value={value}
          readOnly
          aria-hidden
        />
      )}
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        className={`${triggerBase} ${triggerClass}`}
        style={triggerStyle}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        ref={triggerRef}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selectedOption?.leading != null && (
            <span className="shrink-0 flex items-center justify-center text-lg leading-none">
              {selectedOption.leading}
            </span>
          )}
          <span className="truncate">{displayLabel}</span>
        </span>
        <span
          className={`shrink-0 text-text-tertiary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <ChevronDown className={variant === 'compact' ? 'w-4 h-4' : 'w-5 h-5'} />
        </span>
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-activedescendant={options[highlightedIndex] ? `option-${options[highlightedIndex].value}` : undefined}
          className={listBase}
          style={{
            top: 'calc(100% + 4px)',
            left: 0,
          }}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isHighlighted = i === highlightedIndex;
            return (
              <li
                key={opt.value}
                id={`option-${opt.value}`}
                role="option"
                aria-selected={isSelected}
                className={`${optionBase} ${
                  isSelected
                    ? 'bg-primary/10 text-primary font-medium'
                    : isHighlighted
                      ? 'bg-background-hover text-text-primary'
                      : 'text-text-primary hover:bg-background-hover'
                }`}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseLeave={() => setHighlightedIndex(-1)}
                onClick={() => {
                  onChange(opt.value);
                  close();
                }}
              >
                {opt.leading != null && (
                  <span className="shrink-0 flex items-center justify-center text-lg leading-none">
                    {opt.leading}
                  </span>
                )}
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <span className="ml-auto shrink-0 text-primary" aria-hidden>
                    <Check className="w-4 h-4" />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
