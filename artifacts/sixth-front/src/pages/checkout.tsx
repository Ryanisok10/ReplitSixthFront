import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useCreateOrder } from '@workspace/api-client-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
);

const VALID_SERVICE_TYPES = ['food', 'merch', 'bundle', 'landing', 'qr'] as const;

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const merchantId = params.get('merchant') ?? '';
  const serviceTypeParam = params.get('service') ?? '';
  const totalCents = parseInt(params.get('total') ?? '0', 10);
  
  const [orderId, setOrderId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCreateOrder();

  // Validate serviceType
  const serviceType = VALID_SERVICE_TYPES.includes(serviceTypeParam as any) 
    ? serviceTypeParam 
    : '';

  useEffect(() => {
    if (!merchantId || !serviceType || totalCents <= 0) {
      setError('Invalid checkout parameters');
      return;
    }

    createOrder.mutate(
      {
        data: {
          merchantId,
          orderTotalCents: totalCents,
          serviceType: serviceType as any,
          currency: 'usd',
        },
      },
      {
        onSuccess: (result) => {
          setOrderId(result.transaction.id);
          setClientSecret(result.clientSecret);
        },
        onError: (err: any) => {
          setError(err.response?.data?.error || 'Failed to create order');
        },
      }
    );
  }, [merchantId, serviceType, totalCents]);

  if (error) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center p-6">
        <section className="max-w-lg bg-white border border-line rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-display font-bold text-red mb-3">
            Checkout Error
          </h1>
          <p className="text-muted mb-6">{error}</p>
          <button
            onClick={() => setLocation('/')}
            className="inline-block bg-tomato text-white font-bold py-3 px-5 rounded-lg hover:bg-tomato-dark"
          >
            Return Home
          </button>
        </section>
      </main>
    );
  }

  if (!clientSecret || !orderId) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center p-6">
        <section className="max-w-lg bg-white border border-line rounded-2xl p-8 text-center">
          <h1 className="text-2xl font-display font-bold text-red mb-3">
            Loading Checkout
          </h1>
          <p className="text-muted">Preparing your payment...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper py-10">
      <div className="max-w-2xl mx-auto px-5">
        <h1 className="text-3xl font-display font-bold text-red mb-8 text-center">
          Complete Your Order
        </h1>
        <div className="bg-white border border-line rounded-2xl p-8">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </div>
    </main>
  );
}
