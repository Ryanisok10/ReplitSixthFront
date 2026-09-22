import { useEffect } from "react";
import { useLocation } from "wouter";
import logoImage from "@assets/sixth-front-logo-icon.png";
import { LegalFooter } from "@/components/legal-footer";

export default function HowPaymentsWorkPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0 });
    document.title = "How Payments Work — Sixth Front";
  }, []);

  return (
    <div className="min-h-screen bg-paper font-sans text-ink flex flex-col">
      <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur border-b border-line shadow-sm">
        <div className="max-w-3xl mx-auto px-4 md:px-8 h-[68px] flex items-center">
          <button
            type="button"
            onClick={() => setLocation("/")}
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
        <h1
          className="text-3xl md:text-4xl font-display font-bold text-red tracking-tight mb-6"
          data-testid="legal-title"
        >
          How Payments Work
        </h1>
        <article
          data-testid="legal-body"
          className="space-y-5 text-[15px] leading-relaxed text-ink/90 font-sans"
        >
          <p>
            When a customer pays on Sixth Front, the charge goes directly to the
            merchant&apos;s Stripe account. The merchant is the seller of record, and
            the merchant&apos;s name appears on the customer&apos;s card statement.
          </p>
          <p>
            Sixth Front&apos;s platform service fee is 8% on food and QR ordering
            transactions, and 12% on merchandise transactions. This fee is deducted from
            the merchant&apos;s charge. Customers are never charged separately by Sixth
            Front.
          </p>
          <p>
            Stripe processes and secures every payment. Sixth Front never stores customer
            card details.
          </p>
          <p>
            Stripe&apos;s terms apply to all payment transactions. Review the{" "}
            <a
              href="https://stripe.com/legal/ssa"
              target="_blank"
              rel="noreferrer"
              data-testid="link-stripe-services-agreement"
              className="underline underline-offset-2 text-red hover:text-tomato transition-colors"
            >
              Stripe Services Agreement
            </a>
            .
          </p>
          <p>
            For payment questions, contact{" "}
            <a
              href="mailto:support@sixthfront.com"
              data-testid="link-payment-support"
              className="underline underline-offset-2 text-red hover:text-tomato transition-colors"
            >
              support@sixthfront.com
            </a>
            .
          </p>
        </article>
        <div className="mt-12 pt-6 border-t border-line">
          <LegalFooter variant="muted" />
        </div>
      </main>

      <footer className="bg-tomato border-t border-white/20 text-[#fff4e5] py-8 flex flex-col items-center justify-center gap-3">
        <p className="text-[14px] font-medium text-white/90 tracking-wide">
          Digital support for independent restaurants.
        </p>
        <LegalFooter variant="light" />
      </footer>
    </div>
  );
}