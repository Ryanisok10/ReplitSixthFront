import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useCheckMerchantOnboardingStatus } from '@workspace/api-client-react';

export default function PaymentOnboardingReturn() {
  const [, setLocation] = useLocation();
  const checked = useRef(false);
  const status = useCheckMerchantOnboardingStatus();
  const params = new URLSearchParams(window.location.search);
  const merchantId = params.get('merchant') ?? '';
  const token = params.get('token') ?? '';
  useEffect(() => {
    if (!checked.current && merchantId && token) {
      checked.current = true;
      status.mutate({ data: { merchantId, token } });
    }
  }, [merchantId, token, status]);
  const complete = status.data?.status === 'complete';
  return <main className="min-h-screen bg-paper flex items-center justify-center p-6 text-center"><section className="max-w-lg bg-white border border-line rounded-2xl p-8"><h1 className="text-2xl font-display font-bold text-red mb-3" data-testid="status-payment-onboarding">{status.isPending ? 'Checking your payment account' : status.isError || !status.data ? 'We couldn’t verify this link' : complete ? 'Payment account setup complete' : 'A few payment details remain'}</h1>{status.data && <p className="text-muted mb-6">{status.data.message}</p>}{!complete && status.data?.onboardingUrl && <a href={status.data.onboardingUrl} data-testid="button-continue-payment-onboarding" className="inline-block bg-tomato text-white font-bold py-3 px-5 rounded-lg">Continue Secure Setup</a>}<button type="button" onClick={() => setLocation('/')} className="block mt-6 mx-auto underline" data-testid="button-return-home">Return to Homepage</button></section></main>;
}