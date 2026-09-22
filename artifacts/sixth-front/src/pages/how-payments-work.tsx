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
            When a customer places an order through a Sixth Front-powered merchant
            website, the payment is processed directly on the merchant&apos;s Stripe
            connected account. The merchant is responsible for the sale to the customer,
            and the applicable statement descriptor is determined by the merchant&apos;s
            Stripe account settings and the card issuer.
          </p>
          <p>
            Sixth Front collects a platform application fee of:
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>8% on food ordering and QR/table-ordering transactions; and</li>
            <li>12% on merchandise storefront transactions.</li>
          </ul>
          <p>
            The application fee is collected from the transaction through Stripe Connect.
            The remaining funds, after applicable Stripe processing fees and the Sixth
            Front application fee, settle directly to the merchant&apos;s connected Stripe
            account. Customers are not charged a separate Sixth Front fee for these
            transactions.
          </p>
          <p>
            Stripe processes and secures the payment. Sixth Front does not store
            customers&apos; full payment-card numbers or security codes. Payment
            information is handled through Stripe&apos;s payment infrastructure.
          </p>
          <section className="space-y-4 pt-3" aria-labelledby="important-distinction">
            <h2
              id="important-distinction"
              className="text-xl font-display font-bold text-red"
            >
              Important distinction
            </h2>
            <p>
              This copy should describe only the transaction-based commissions. It should
              not imply that all Sixth Front fees are collected through Stripe Connect.
              Your separate:
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>POS Sync fee;</li>
              <li>standalone landing-page fee; and</li>
              <li>fallback monthly service fees</li>
            </ul>
            <p>
              are operational service fees payable to Operations LLC under the applicable
              agreement, using the separate ACH or invoice process.
            </p>
          </section>
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