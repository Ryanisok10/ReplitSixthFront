import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  getGetMerchantAgreementQueryKey,
  useGetMerchantAgreement,
  useSubmitSignupReferenceCode,
  useSubmitStandardSignup,
} from '@workspace/api-client-react';
import type { BusinessBasics, IntakeResult, MerchantService } from '@workspace/api-client-react';
import logoImage from '@assets/sixth-front-logo-icon.png';
import { ReferenceCode } from '@/components/reference-code';

const services: {
  id: MerchantService;
  title: string;
  description: string;
  pricing: string;
  details: string[];
  includesOrdering: boolean;
}[] = [
  {
    id: 'food',
    title: 'Branded Food Ordering',
    description: 'Online pickup and QR table ordering.',
    pricing: '8% per processed order',
    details: [
      'No monthly fees. Only pay when orders come in.',
      'Online pickup ordering',
      'QR table ordering',
      'QR Scan to Pay',
      'Full menu integration',
      'FREE Custom Web Page included',
    ],
    includesOrdering: true,
  },
  {
    id: 'merch',
    title: 'Branded Merch Ordering',
    description: 'Sell your branded gear effortlessly.',
    pricing: '12% per sale',
    details: [
      'Unlock a new revenue stream without buying inventory upfront.',
      'Sell hats, shirts, mugs, and more',
      'A shop built around your logo and designs',
      'Printing and shipping handled for you',
      'FREE Custom Web Page included',
    ],
    includesOrdering: true,
  },
  {
    id: 'bundle',
    title: 'Food + Merch',
    description: 'Everything you need, working together. No setup fee.',
    pricing: '8% on food orders + 12% on merchandise sales',
    details: [
      'The complete digital storefront: Food + Merch, working together seamlessly.',
      'No setup fee',
      'Everything in Food Ordering',
      'Everything in Merch Store',
      'FREE Custom Web Page included',
    ],
    includesOrdering: true,
  },
  {
    id: 'landing',
    title: 'Custom Landing Page',
    description: 'Professional one-page website for $39/month.',
    pricing: '$39 per month',
    details: [
      'Just need a professional home on the internet?',
      'No ordering included',
      'Professional one-page website',
      'Hours, location, and directions',
      'Menu and photo display',
      'Hosting included',
    ],
    includesOrdering: false,
  },
];

const PROCESSOR_FEE_INFORMATION =
  "The card processor's standard fee is 2.9% + 30¢ per card transaction, charged by the payment processor on each transaction.";

const buttonClass = 'bg-tomato hover:bg-tomato-dark text-white font-bold py-3.5 px-8 rounded-lg shadow-[0_4px_0_rgb(184,52,29)] disabled:opacity-50 disabled:cursor-not-allowed';

export default function Signup() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [basics, setBasics] = useState<BusinessBasics | null>(null);
  const [selectedServices, setSelectedServices] = useState<MerchantService[]>([]);
  const [referenceCode, setReferenceCode] = useState('');
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const referenceSignup = useSubmitSignupReferenceCode();
  const standardSignup = useSubmitStandardSignup();
  const agreement = useGetMerchantAgreement({
    query: { enabled: step === 5, queryKey: getGetMerchantAgreementQueryKey() },
  });
  const selectedService = services.find((service) => service.id === selectedServices[0]);

  useEffect(() => {
    const service = new URLSearchParams(window.location.search).get('service');
    if (service && services.some((option) => option.id === service)) setSelectedServices([service as MerchantService]);
  }, []);

  const continueBasics = (form: HTMLFormElement) => {
    const data = new FormData(form);
    setBasics({
      businessName: data.get('businessName') as string,
      ownerName: data.get('ownerName') as string,
      email: data.get('email') as string,
      phone: data.get('phone') as string,
      address: data.get('address') as string,
      websiteType: data.get('websiteType') as string,
      monthlyOrderVolume: data.get('monthlyOrderVolume') as string,
    });
    setStep(2);
  };

  const submitCode = () => {
    setMessage('');
    if (!referenceCode) return setStep(4);
    if (!basics) return;
    referenceSignup.mutate({ data: { idempotencyKey, basics, services: selectedServices, referenceCode } }, {
      onSuccess: (response) => {
        if (response.codeStatus === 'valid') setResult(response);
        else {
          setMessage('Code not recognized — continuing with standard signup.');
          setStep(4);
        }
      },
      onError: (error) => setMessage(error.data?.error || 'An error occurred. Please try again.'),
    });
  };

  const submitStandard = () => {
    if (!basics || !agreement.data) return;
    setMessage('');
    standardSignup.mutate({
      data: { idempotencyKey, basics, services: selectedServices, agreementVersion: agreement.data.version, accepted },
    }, {
      onSuccess: setResult,
      onError: (error) => setMessage(error.data?.error || 'Your signup could not be submitted. Please try again.'),
    });
  };

  if (result) {
    const custom = result.codeStatus === 'valid';
    return <div className="min-h-screen flex items-center justify-center bg-paper p-6 font-sans text-ink"><section className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-line text-center">
      <h1 className="text-2xl font-display font-bold text-red mb-4" data-testid={custom ? 'status-custom-signup' : 'status-standard-signup'}>{custom ? "Thanks — we've got your info. Your custom agreement will be emailed to you shortly for review and signature." : 'Storefront Setup Started'}</h1>
      {!custom && <p className="text-muted text-lg mb-6">Your storefront setup has started — check your email to complete payment account setup.</p>}
      {!custom && result.onboardingUrl && <a href={result.onboardingUrl} data-testid="button-start-payment-onboarding" className={`${buttonClass} inline-block mb-5`}>Set Up Your Payment Account</a>}
      <button type="button" onClick={() => setLocation('/')} data-testid="button-return-home" className="block mx-auto text-sm font-bold text-muted underline">Return to Homepage</button>
    </section></div>;
  }

  return <div className="min-h-screen bg-paper font-sans text-ink"><header className="h-[68px] flex items-center px-4 md:px-8 border-b border-line"><button type="button" onClick={() => setLocation('/')} data-testid="link-brand" className="flex items-center gap-2.5"><img src={logoImage} alt="" className="w-8 h-7 object-contain" /><span className="font-display font-bold text-lg">Sixth Front</span></button></header>
    <main className="max-w-[600px] mx-auto py-10 px-4"><div className="flex justify-between mb-10">{[1, 2, 3, 4, 5].map((number) => <span key={number} data-testid={`status-progress-step-${number}`} className={`w-8 h-8 rounded-full text-center leading-8 font-bold ${number === step ? 'bg-tomato text-white' : 'bg-cream text-muted'}`}>{number}</span>)}</div>
      <section className="bg-white rounded-2xl shadow-sm border border-line p-6 md:p-10">
        {step === 1 && <form onSubmit={(event) => { event.preventDefault(); continueBasics(event.currentTarget); }} className="space-y-4"><h1 className="text-2xl font-display font-bold text-red">Business Basics</h1><p className="text-muted text-base">Let's start with the essential details about your eatery.</p>
          {[['businessName', 'Business Name', 'text'], ['ownerName', 'Your Name', 'text'], ['email', 'Email Address', 'email'], ['phone', 'Phone Number', 'tel'], ['address', 'Business Address', 'text']].map(([name, label, type]) => <label key={name} className="block text-sm font-bold">{label}<input required type={type} name={name} data-testid={`input-${name}`} className="mt-1 w-full h-[48px] px-3 border border-line rounded-lg font-normal" /></label>)}
          <label className="block text-sm font-bold">Current Web Presence<select required name="websiteType" data-testid="select-website-type" className="mt-1 w-full h-[48px] px-3 border border-line rounded-lg font-normal"><option value="">Select one</option><option value="none">None / Need a website</option><option value="existing">Have an existing website</option><option value="social">Social media only</option></select></label>
          <label className="block text-sm font-bold">Monthly Order Volume<select required name="monthlyOrderVolume" data-testid="select-monthly-volume" className="mt-1 w-full h-[48px] px-3 border border-line rounded-lg font-normal"><option value="">Select one</option><option value="under_100">Under 100 orders</option><option value="100_500">100 - 500 orders</option><option value="500_1000">500 - 1,000 orders</option><option value="over_1000">1,000+ orders</option></select></label>
          <div className="text-right"><button className={buttonClass} data-testid="button-next-1">Continue</button></div></form>}
        {step === 2 && <div><h1 className="text-2xl font-display font-bold text-red mb-2">Select Services</h1><p className="text-muted text-base mb-6">Choose the tools you want to power your storefront.</p><div className="space-y-3 mb-8">{services.map((option) => <label key={option.id} className="flex p-4 border border-line rounded-xl cursor-pointer"><input type="radio" name="services" checked={selectedServices[0] === option.id} onChange={() => setSelectedServices([option.id])} data-testid={`radio-signup-service-${option.id}`} className="mr-3" /><span><b>{option.title}</b><small className="block text-muted text-[15px]">{option.description}</small></span></label>)}</div><div className="flex justify-between"><button type="button" onClick={() => setStep(1)} data-testid="button-back-2">Back</button><button type="button" onClick={() => setStep(3)} disabled={!selectedServices.length} className={buttonClass} data-testid="button-next-2">Continue</button></div></div>}
        {step === 3 && <div><h1 className="text-2xl font-display font-bold text-red mb-2">Reference Code</h1><p className="text-muted text-base mb-6">Enter a reference code if you received one from our team.</p><ReferenceCode value={referenceCode} onChange={setReferenceCode} />{message && <p className="mt-4 text-red text-lg font-bold" data-testid="status-reference-code-error">{message}</p>}<div className="flex justify-between mt-8"><button type="button" onClick={() => setStep(2)} data-testid="button-back-3">Back</button><button type="button" onClick={submitCode} disabled={referenceSignup.isPending} className={buttonClass} data-testid="button-next-3">{referenceSignup.isPending ? 'Checking...' : 'Continue'}</button></div></div>}
        {step === 4 && <div>
          <h1 className="text-2xl font-display font-bold text-red mb-2">Pricing Summary</h1>
          <p className="text-base text-muted mb-6">Review the service you selected and the payment costs before viewing the agreement.</p>
          {message && <p className="my-4 bg-cream p-3 rounded text-lg" data-testid="status-reference-code-message">{message}</p>}
          {selectedService ? <div className="space-y-5">
            <section className="bg-cream p-5 rounded-xl border border-line" aria-labelledby="selected-service-title" data-testid="selected-service-summary">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div>
                  <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Your selected service</p>
                  <h2 id="selected-service-title" className="text-xl font-display font-bold text-red">{selectedService.title}</h2>
                  <p className="text-base text-muted mt-1">{selectedService.description}</p>
                </div>
                <p className="text-tomato text-xl font-display font-bold sm:text-right">{selectedService.pricing}</p>
              </div>
              <ul className="space-y-3 text-base text-ink" aria-label={`${selectedService.title} details`} data-testid="selected-service-details">
                {selectedService.details.map((detail) => <li key={detail} className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-red/10 text-red flex items-center justify-center shrink-0 text-[10px] mt-1" aria-hidden="true">✓</span><span>{detail}</span></li>)}
              </ul>
            </section>
            <section className="bg-paper p-5 rounded-xl border border-line" aria-labelledby="processor-fees-title" data-testid="processor-fee-summary">
              <h2 id="processor-fees-title" className="font-bold text-lg mb-2">Payment processor fees</h2>
              <p className="text-base text-muted">{selectedService.includesOrdering ? PROCESSOR_FEE_INFORMATION : 'Payment processor fees do not apply because this service does not include online ordering.'}</p>
              {selectedService.includesOrdering && <p className="text-base text-muted mt-3">Sixth Front commission and the processor&apos;s fee are the only transaction-based costs for this service.</p>}
            </section>
          </div> : <p className="text-red text-lg">Please go back and select a service before continuing.</p>}
          <div className="flex justify-between mt-8"><button type="button" onClick={() => setStep(3)} data-testid="button-back-4">Back</button><button type="button" onClick={() => setStep(5)} disabled={!selectedService} className={buttonClass} data-testid="button-next-4">Review Agreement</button></div>
        </div>}
        {step === 5 && <div><h1 className="text-2xl font-display font-bold text-red mb-2">Draft Agreement Review</h1>{agreement.isLoading ? <p className="text-lg">Loading agreement…</p> : agreement.isError || !agreement.data ? <p className="text-red text-lg">Unable to load agreement. Please try again later.</p> : <><div className="my-5 p-4 bg-paper border border-line rounded whitespace-pre-wrap text-base"><b>{agreement.data.merchantServicesTitle}</b><p className="mt-2">{agreement.data.merchantServicesContent}</p><b className="block mt-4">{agreement.data.pricingScheduleTitle}</b><p className="mt-2">{agreement.data.pricingScheduleContent}</p></div><label className="flex gap-3"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} data-testid="checkbox-agreement" />I have read and agree to the Merchant Services Agreement and Pricing Schedule</label></>}{message && <p className="mt-4 text-red text-lg" data-testid="status-standard-signup-error">{message}</p>}<div className="flex justify-between mt-8"><button type="button" onClick={() => setStep(4)} data-testid="button-back-5">Back</button><button type="button" onClick={submitStandard} disabled={!accepted || standardSignup.isPending || !agreement.data} className={buttonClass} data-testid="button-create-storefront">{standardSignup.isPending ? 'Submitting...' : 'Create My Storefront'}</button></div></div>}
      </section>
    </main>
  </div>;
}