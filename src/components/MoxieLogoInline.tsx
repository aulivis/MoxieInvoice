'use client';

const MOXIE_LOGO_SRC = '/moxie-logo.png';

interface MoxieLogoInlineProps {
  className?: string;
}

/** Inline Moxie logo, same height as surrounding text (1em). */
export function MoxieLogoInline({ className }: MoxieLogoInlineProps) {
  return (
    <img
      src={MOXIE_LOGO_SRC}
      alt="Moxie"
      className={className}
      style={{
        height: '1em',
        width: 'auto',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    />
  );
}

interface TextWithMoxieLogoProps {
  children: string;
  className?: string;
  logoClassName?: string;
}

/** Renders text with every "Moxie" word replaced by the inline logo. */
export function TextWithMoxieLogo({ children, className, logoClassName }: TextWithMoxieLogoProps) {
  const parts = children.split('Moxie');
  if (parts.length === 1) {
    return <span className={className}>{children}</span>;
  }
  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <MoxieLogoInline className={logoClassName} />}
        </span>
      ))}
    </span>
  );
}
