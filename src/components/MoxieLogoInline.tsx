'use client';

const MOXIE_LOGO_SRC = '/moxie-logo.png';
const MOXIE_LOGO_WHITE_SRC = '/moxie-logo-white.png';

export type MoxieLogoVariant = 'default' | 'white';

interface MoxieLogoInlineProps {
  className?: string;
  /** Use "white" for dark backgrounds (e.g. login panel). */
  variant?: MoxieLogoVariant;
}

/** Inline Moxie logo, height 1.4em to align with text (logo art doesn't fill full height). */
export function MoxieLogoInline({ className, variant = 'default' }: MoxieLogoInlineProps) {
  const src = variant === 'white' ? MOXIE_LOGO_WHITE_SRC : MOXIE_LOGO_SRC;
  return (
    <img
      src={src}
      alt="Moxie"
      className={className}
      style={{
        height: '1.4em',
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
  /** Use "white" for dark backgrounds (e.g. login panel). */
  logoVariant?: MoxieLogoVariant;
}

/** Renders text with every "Moxie" word replaced by the inline logo. */
export function TextWithMoxieLogo({ children, className, logoClassName, logoVariant }: TextWithMoxieLogoProps) {
  const parts = children.split('Moxie');
  if (parts.length === 1) {
    return <span className={className}>{children}</span>;
  }
  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <MoxieLogoInline className={logoClassName} variant={logoVariant} />}
        </span>
      ))}
    </span>
  );
}
