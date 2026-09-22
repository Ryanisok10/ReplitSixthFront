import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import logoImage from "@assets/sixth-front-logo-icon.png";
import wordmarkImage from "@assets/sixth-front-wordmark-transparent.png";
import { LegalFooter } from "@/components/legal-footer";

interface OrderTransaction {
  id: string;
  merchantId: string;
  stripePaymentIntentId: string;
  stripeConnectedAccountId: string;
  orderTotalCents: number;
  applicationFeeCents: number;
  serviceType: string;
  currency: string;
  status: string;
  stripeStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise(publishableKey: string) {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

function PaymentForm({
  transaction,
  clientSecret,
  onStatusChange,
}: {
  transaction: OrderTransaction;
  clientSecret: string;
  onStatusChange: (transaction: OrderTransaction) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [, setLocation] = useLocation();
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setFormError(null);
    setProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}`,
      },
      redirect: "if_required",
    });

    if (error) {
      setFormError(error.message ?? "Payment failed");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        const res = await fetch(`/api/orders/${transaction.id}`);
        if (res.ok) {
          const updated = await res.json();
          onStatusChange(updated);
        }
      } catch {
        // Fallback: optimistically mark paid if the webhook already updated the record.
        onStatusChange({ ...transaction, status: "paid", stripeStatus: "succeeded" });
      }
    } else {
      try {
        const res = await fetch(`/api/orders/${transaction.id}`);
        if (res.ok) {
          const updated = await res.json();
          onStatusChange(updated);
        }
      } catch {
        setFormError("Payment could not be completed. Please try again.");
      }
    }

    setProcessing(false);
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-display font-bold text-ink mb-2">
        Secure Card Payment
      </h2>
      <p className="text-muted text-sm mb-6">
        Funds settle directly to the merchant. Sixth Front platform fee of {((transaction.applicationFeeCents / transaction.orderTotalCents) * 100).toFixed(0)}% is deducted automatically.
      </p>

      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl font-bold">
          {formError}
        </div>
      )}

      <div className="space-y-4">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      <div className="pt-4 flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-tomato hover:bg-tomato-dark text-white font-bold py-4 px-8 rounded-lg shadow-[0_4px_0_rgb(184,52,29)] hover:shadow-[0_2px_0_rgb(184,52,29)] hover:translate-y-[2px] transition-all text-sm flex justify-center items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tomato focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing Payment...
            </>
          ) : (
            `Pay ${new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: transaction.currency.toUpperCase(),
            }).format(transaction.orderTotalCents / 100)}`
          )}
        </button>
        <button
          type="button"
          onClick={() => setLocation("/")}
          disabled={processing}
          className="sm:px-6 py-4 rounded-lg border border-line text-sm text-muted font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all disabled:opacity-50"
        >
          Cancel Order
        </button>
      </div>
    </form>
  );
}

export default function OrderCheckout() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [transaction, setTransaction] = useState<OrderTransaction | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/orders/${id}`).then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load order transaction");
        }
        return res.json();
      }),
      fetch("/api/orders/config").then((res) => {
        if (!res.ok) {
          throw new Error("Stripe configuration is not available");
        }
        return res.json();
      }),
    ])
      .then(([txData, config]) => {
        setTransaction(txData);
        setClientSecret(txData.stripePaymentIntentClientSecret ?? null);
        setPublishableKey(config.publishableKey);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "An error occurred");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!id || !transaction || transaction.status === "pending") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) {
          const updated = await res.json();
          setTransaction(updated);
          if (updated.status === "paid" || updated.status === "canceled") {
            clearInterval(interval);
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id, transaction]);

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const getServiceLabel = (type: string) => {
    const labels: Record<string, string> = {
      food: "Branded Food Ordering",
      merch: "Branded Merch Ordering",
      bundle: "Food + Merch Bundle",
      landing: "Custom Landing Page Only",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tomato"></div>
        <p className="mt-4 text-muted font-medium">Loading your secure checkout...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white border border-line rounded-2xl p-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-red text-2xl font-bold">!</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-red mb-3">Unable to Load Checkout</h1>
          <p className="text-muted mb-6">{error || "We couldn't retrieve the specified transaction details."}</p>
          <button
            onClick={() => setLocation("/")}
            className="bg-tomato hover:bg-tomato-dark text-white font-bold py-3 px-6 rounded-lg transition-all"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  const isPaid = transaction.status === "paid";
  const isCanceled = transaction.status === "canceled";

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-between" id="top">
      {/* Header */}
      <header className="bg-white border-b border-line py-4 px-6 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setLocation("/");
            }}
            className="flex items-center gap-2 outline-none"
          >
            <img src={logoImage} alt="" className="w-8 h-7 object-contain" />
            <img src={wordmarkImage} alt="Sixth Front" className="w-24 h-5 object-contain" />
          </a>
          <span className="text-[12px] uppercase tracking-wider font-bold text-muted bg-cream px-3 py-1 rounded-full border border-line">
            🛡️ Secure Stripe Checkout
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-12 px-6 flex items-center justify-center">
        <div className="max-w-4xl w-full grid md:grid-cols-12 gap-8 items-start">
          {/* Order Summary Column */}
          <section className="md:col-span-5 bg-white border border-line rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-display font-bold text-ink mb-4 pb-3 border-b border-line">
              Order Summary
            </h2>
            <div className="space-y-4">
              <div>
                <span className="block text-[11px] font-bold text-muted uppercase tracking-wider">
                  Service
                </span>
                <span className="text-sm font-bold text-ink block mt-1">
                  {getServiceLabel(transaction.serviceType)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[11px] font-bold text-muted uppercase tracking-wider">
                    Total Amount
                  </span>
                  <span className="text-xl font-display font-bold text-tomato block mt-1" data-testid="checkout-total">
                    {formatAmount(transaction.orderTotalCents, transaction.currency)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-muted uppercase tracking-wider">
                    Status
                  </span>
                  <span
                    className={`inline-block text-[12px] font-bold px-2.5 py-0.5 rounded-full mt-1 border ${
                      isPaid
                        ? "bg-green-50 text-green-700 border-green-200"
                        : isCanceled
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                    }`}
                    data-testid="checkout-status"
                  >
                    {transaction.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-line space-y-2 text-[12px] text-muted leading-relaxed">
                <p>
                  <strong>Merchant ID:</strong> {transaction.merchantId}
                </p>
                <p>
                  <strong>Payment Intent ID:</strong> {transaction.stripePaymentIntentId}
                </p>
                <p>
                  <strong>Platform Fee:</strong> {formatAmount(transaction.applicationFeeCents, transaction.currency)} ({((transaction.applicationFeeCents / transaction.orderTotalCents) * 100).toFixed(0)}%)
                </p>
              </div>
            </div>
          </section>

          {/* Payment Form / Status Column */}
          <section className="md:col-span-7 bg-white border border-line rounded-2xl p-8 shadow-sm">
            {isPaid ? (
              <div className="text-center py-6" data-testid="checkout-success">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 border border-green-200">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-display font-bold text-green-700 mb-2">
                  Payment Succeeded!
                </h2>
                <p className="text-muted text-sm mb-6 max-w-sm mx-auto">
                  Your transaction has been processed and completed. Funds have settled directly on the connected merchant account.
                </p>
                <div className="bg-cream border border-line rounded-xl p-4 mb-8 text-left text-xs text-ink space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted">Transaction ID:</span>
                    <span className="font-mono font-bold">{transaction.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Stripe Connected Account:</span>
                    <span className="font-mono">{transaction.stripeConnectedAccountId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Completed At:</span>
                    <span>{new Date(transaction.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setLocation("/")}
                  className="bg-tomato hover:bg-tomato-dark text-white font-bold py-3 px-8 rounded-lg shadow-[0_4px_0_rgb(184,52,29)] transition-all text-sm"
                >
                  Return to Homepage
                </button>
              </div>
            ) : isCanceled ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6 border border-red-200">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-display font-bold text-red-700 mb-2">
                  Payment Canceled
                </h2>
                <p className="text-muted text-sm mb-8">
                  This transaction has been canceled and can no longer be processed.
                </p>
                <button
                  onClick={() => setLocation("/")}
                  className="bg-tomato hover:bg-tomato-dark text-white font-bold py-3 px-8 rounded-lg shadow-[0_4px_0_rgb(184,52,29)] transition-all text-sm"
                >
                  Return to Homepage
                </button>
              </div>
            ) : !clientSecret || !publishableKey ? (
              <div className="text-center py-6">
                <h2 className="text-xl font-display font-bold text-red mb-2">
                  Checkout Unavailable
                </h2>
                <p className="text-muted text-sm mb-6">
                  This order cannot be paid at this time. Please contact support.
                </p>
                <button
                  onClick={() => setLocation("/")}
                  className="bg-tomato hover:bg-tomato-dark text-white font-bold py-3 px-8 rounded-lg shadow-[0_4px_0_rgb(184,52,29)] transition-all text-sm"
                >
                  Return to Homepage
                </button>
              </div>
            ) : (
              <Elements
                stripe={getStripePromise(publishableKey)}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#e94e32",
                    },
                  },
                }}
              >
                <PaymentForm
                  transaction={transaction}
                  clientSecret={clientSecret}
                  onStatusChange={setTransaction}
                />
              </Elements>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-tomato border-t border-white/20 text-[#fff4e5] py-8 flex flex-col items-center justify-center gap-2">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setLocation("/");
          }}
          className="flex items-center gap-2 outline-none"
        >
          <img
            src={logoImage}
            alt=""
            className="w-8 h-7 object-contain brightness-0 invert opacity-95"
          />
          <img
            src={wordmarkImage}
            alt="Sixth Front"
            className="w-24 h-5 object-contain brightness-0 invert opacity-95"
          />
        </a>
        <p className="text-xs text-white/80">Digital support for independent restaurants.</p>
        <LegalFooter variant="light" />
      </footer>
    </div>
  );
}
