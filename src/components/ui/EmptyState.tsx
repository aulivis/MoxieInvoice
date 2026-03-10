import { Link } from '@/i18n/navigation';

interface EmptyStateProps {
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  icon?: React.ReactNode;
}

function DefaultIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="28" cy="28" r="28" fill="#F1F0F5" />
      <rect x="18" y="16" width="20" height="24" rx="3" fill="#E0DDEB" />
      <rect x="21" y="21" width="10" height="2" rx="1" fill="#B8B4CC" />
      <rect x="21" y="25" width="14" height="2" rx="1" fill="#B8B4CC" />
      <rect x="21" y="29" width="8" height="2" rx="1" fill="#B8B4CC" />
      <circle cx="36" cy="36" r="8" fill="#C2185B" />
      <path
        d="M33 36h6M36 33v6"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({ title, description, ctaLabel, ctaHref, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in">
      <div className="mb-4">
        {icon ?? <DefaultIcon />}
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary mb-6 max-w-xs">{description}</p>
      )}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref as '/'}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
