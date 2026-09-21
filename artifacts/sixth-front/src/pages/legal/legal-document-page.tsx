import { useEffect } from 'react';
import { useLocation } from 'wouter';
import logoImage from '@assets/sixth-front-logo-icon.png';
import { LegalFooter } from '@/components/legal-footer';

/**
 * LegalDocumentPage — shared layout for the standalone legal route pages
 * (/privacy, /terms, /cookies, /sms-terms).
 *
 * The document body is passed in as a raw string imported from the attorney-approved
 * source file via Vite's `?raw` loader and rendered inside a <pre> with
 * `whitespace-pre-wrap`. This guarantees the FINAL legal text is displayed VERBATIM —
 * no retyping, paraphrasing, or markdown transformation can alter it.
 */
export function LegalDocumentPage({ title, body }: { title: string; body: string }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title = `${title} — Sixth Front`;
  }, [title]);

  return (
    <div className="min-h-screen bg-paper font-sans text-ink flex flex-col">
      <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur border-b border-line shadow-sm">
        <div className="max-w-3xl mx-auto px-4 md:px-8 h-[68px] flex items-center">
          <button
            type="button"
            onClick={() => setLocation('/')}
            data-testid="link-brand"
            className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-tomato rounded"
            aria-label="Sixth Front home"
          >
            <img src={logoImage} alt="" className="w-8 h-7 object-contain" aria-hidden="true" />
            <span className="font-display font-bold text-lg">Sixth Front</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-5 md:px-8 py-10 md:py-14">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-red tracking-tight mb-6" data-testid="legal-title">
          {title}
        </h1>
        <article
          data-testid="legal-body"
          className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink/90 font-sans"
        >
          {body}
        </article>
        <div className="mt-12 pt-6 border-t border-line">
          <LegalFooter variant="muted" />
        </div>
      </main>

      <footer className="bg-tomato border-t border-white/20 text-[#fff4e5] py-8 flex flex-col items-center justify-center gap-3">
        <p className="text-[14px] font-medium text-white/90 tracking-wide">Digital support for independent restaurants.</p>
        <LegalFooter variant="light" />
      </footer>
    </div>
  );
}

export default LegalDocumentPage;
