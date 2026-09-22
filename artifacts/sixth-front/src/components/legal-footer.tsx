import { Link } from 'wouter';

/**
 * LegalFooter — persistent, reasonably conspicuous legal links required on ALL pages
 * for clickwrap / consumer-disclosure compliance (Consumer Checkout Implementation
 * Language §3: "Maintain persistent footer links ... to the Terms of Service, Privacy
 * Policy, ... and Cookie Notice ... Legal links should be reasonably conspicuous and
 * should not be removed, obscured, or contradicted by merchant-specific language.").
 *
 * Rendered inside the existing marketing footer (App.tsx) and on the signup wizard so
 * the links are present on every page of the Sixth Front public site.
 */
export function LegalFooter({ variant = 'light' }: { variant?: 'light' | 'muted' }) {
  const linkClass =
    variant === 'light'
      ? 'underline underline-offset-2 hover:text-white focus-visible:text-white transition-colors'
      : 'underline underline-offset-2 text-muted hover:text-ink focus-visible:text-ink transition-colors';

  const links: { href: string; label: string }[] = [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Use' },
    { href: '/cookies', label: 'Cookie Notice' },
    { href: '/sms-terms', label: 'SMS & Email Terms' },
    { href: '/how-it-works-payments', label: 'How Payments Work' },
  ];

  return (
    <nav
      aria-label="Legal"
      data-testid="legal-footer-links"
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] font-medium ${
        variant === 'light' ? 'text-white/90' : 'text-muted'
      }`}
    >
      {links.map((link, index) => (
        <span key={link.href} className="flex items-center gap-x-4">
          <Link href={link.href} data-testid={`link-legal-${link.href.slice(1)}`} className={linkClass}>
            {link.label}
          </Link>
          {index < links.length - 1 && (
            <span aria-hidden="true" className="opacity-50">
              ·
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default LegalFooter;
