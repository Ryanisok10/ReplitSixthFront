import { useState, FormEvent } from 'react';
import { Link } from 'wouter';
import { useSubmitPreviewLead } from '@workspace/api-client-react';
import { MerchantService } from '@workspace/api-zod';
import logoImage from '/assets/logo-icon.png';
import wordmarkImage from '/assets/wordmark.png';
import heroImage from '/assets/hero.webp';
import orderImage from '/assets/order.webp';
import merchImage from '/assets/merch.webp';

const bundleImage = '/assets/merch.webp'; // Using merch as placeholder for bundle

const ReferenceCode = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => (
  <label className="flex flex-col gap-2">
    <span className="text-sm font-medium">Reference Code (Optional)</span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter your reference code if you have one"
      maxLength={64}
      className="w-full px-4 py-2 rounded-lg border border-line bg-paper focus:bg-white focus:border-tomato focus:ring-2 focus:ring-tomato/20 outline-none transition-all text-[15px]"
    />
  </label>
);

const scrollToId = (id: string) => {
  if (id === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const CtaButton = ({ onClick, children, testId, className = "", disabled = false }: { onClick?: () => void, children: React.ReactNode, testId?: string, className?: string, disabled?: boolean }) => (
  <button
    type={onClick ? "button" : "submit"}
    onClick={onClick}
    disabled={disabled}
    className={`bg-tomato hover:bg-tomato-dark text-white font-bold py-3.5 px-8 rounded-lg shadow-[0_4px_0_rgb(184,52,29)] hover:shadow-[0_2px_0_rgb(184,52,29)] hover:translate-y-[2px] transition-all text-[15px] tracking-wide active:shadow-none active:translate-y-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tomato focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    data-testid={testId}
  >
    {children}
  </button>
);

function MapIllustration() {
  return (
    <svg viewBox="0 0 52 40" role="presentation" aria-hidden="true" className="w-full h-full">
      <path d="M4 10.5 16 5l19 5 13-5v24.5l-13 5-19-5-12 5Z" fill="#e7d8b9" stroke="#d7c39f" strokeWidth="1.2" />
      <path d="m16 5-.2 24.5M35 10v24.5" stroke="#d2b98c" strokeWidth="1.2" />
      <path d="M17 15.8c0-4 3.2-7.1 7.2-7.1s7.1 3.1 7.1 7.1c0 5.2-7.1 12-7.1 12s-7.2-6.8-7.2-12Z" fill="#c74426" />
      <circle cx="24.2" cy="15.7" r="2.5" fill="#fff5e6" />
    </svg>
  );
}

function BagIllustration() {
  return (
    <svg viewBox="0 0 52 40" role="presentation" aria-hidden="true" className="w-full h-full">
      <ellipse cx="26" cy="33" rx="21" ry="4.5" fill="#ead7b7" />
      <path d="M10 13h32l-3 21H13Z" fill="#a6462b" />
      <path d="M17 13c0-5.8 3.3-8.8 9-8.8s9 3 9 8.8" fill="none" stroke="#a6462b" strokeWidth="2.2" />
      <path d="M23 11V3.8h6V13" fill="#d0ad78" stroke="#a6462b" strokeWidth="1.2" />
      <path d="M15 18h22" stroke="#d67443" strokeWidth="1.3" />
      <circle cx="26" cy="25" r="1.4" fill="#e5bd86" />
    </svg>
  );
}

const CtaLink = ({ href, children, testId, className = "" }: { href: string, children: React.ReactNode, testId?: string, className?: string }) => (
  <Link
    href={href}
    className={`inline-block text-center bg-tomato hover:bg-tomato-dark text-white font-bold py-3.5 px-8 rounded-lg shadow-[0_4px_0_rgb(184,52,29)] hover:shadow-[0_2px_0_rgb(184,52,29)] hover:translate-y-[2px] transition-all text-[15px] tracking-wide active:shadow-none active:translate-y-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tomato focus-visible:ring-offset-2 ${className}`}
    data-testid={testId}
  >
    {children}
  </Link>
);

const contactBenefits = [
  {
    title: 'No Long-Term Commitments',
    description: "Stay because it's working, not because you're locked in. Everything is month-to-month.",
  },
  {
    title: 'Use Devices You Already Own',
    description: 'Receive orders directly on your current phone, tablet, or PC.',
  },
  {
    title: 'You Get Paid Directly',
    description: 'Money deposits straight to your account — commission comes out of the order. No invoicing or extra bills to worry about. Card processor fees are deducted by the processor — our commission and their fee are the only costs. Funds then settle direct to your account.',
  },
  {
    title: 'Live in About a Week',
    description: "Once you send your details, we'll have your storefront ready to review within 5–7 business days. Most go live sooner.",
  },
];

const benefits = [
  { title: 'Get Found Online', description: 'Attract more customers.', icon: MapIllustration },
  { title: 'Take Orders 24/7', description: 'Beyond just walk-ins.', icon: BagIllustration },
  { title: 'Ditch the Telephone', description: 'Fewer calls. More time where it matters.', icon: PhoneIllustration },
];

export default function Home() {
  const [selectedServices, setSelectedServices] = useState<string[]>(['bundle']);
  const [referenceCode, setReferenceCode] = useState('');
  const [previewIdempotencyKey] = useState(() => crypto.randomUUID());
  
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success'>('idle');
  const [successMessage, setSuccessMessage] = useState('');
  const [inlineErrorMessage, setInlineErrorMessage] = useState('');

  const submitPreviewLead = useSubmitPreviewLead();

  const toggleService = (service: string) => {
    setSelectedServices((currentServices) =>
      currentServices.includes(service)
        ? currentServices.filter((currentService) => currentService !== service)
        : [...currentServices, service],
    );
  };

  const handlePreviewSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInlineErrorMessage('');
    
    if (selectedServices.length === 0) {
      setInlineErrorMessage('Please select at least one service.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      idempotencyKey: previewIdempotencyKey,
      businessName: formData.get('restaurantName') as string,
      ownerName: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      venueType: (formData.get('venueType') as string) || null,
      dailyOrderVolume: (formData.get('dailyOrderVolume') as string) || null,
      services: selectedServices as MerchantService[],
      comments: (formData.get('comments') as string) || null,
      referenceCode: referenceCode || null,
    };

    submitPreviewLead.mutate({ data }, {
      onSuccess: (res) => {
        setSubmitStatus('success');
        if (res.codeStatus === 'valid') {
          setSuccessMessage("Thanks — we've got your info. Your custom agreement will be emailed to you shortly for review and signature.");
        } else {
          setSuccessMessage("Thanks for requesting a preview! We'll be in touch soon.");
          if (['invalid', 'expired', 'mismatched'].includes(res.codeStatus)) {
            setInlineErrorMessage("Code not recognized — continuing with standard signup.");
          }
        }
      },
      onError: (err) => {
        setInlineErrorMessage(err.data?.error || 'An error occurred. Please try again.');
      }
    });
  };

  return (
    <div className="w-full mx-auto bg-paper shadow-[0_0_70px_rgba(115,59,31,0.08)] flex flex-col relative font-sans text-ink overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur border-b border-line shadow-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-[68px] flex items-center justify-between gap-3">
          <a href="#top" onClick={(e) => { e.preventDefault(); scrollToId('top'); }} className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-tomato rounded" data-testid="link-brand" aria-label="Sixth Front home">
            <img src={logoImage} alt="" className="w-8 h-7 md:w-10 md:h-8 object-contain" aria-hidden="true" />
            <img src={wordmarkImage} alt="Sixth Front" className="hidden md:block w-[250px] h-[52px] object-contain" />
          </a>
          <nav className="flex items-center gap-3 sm:gap-5 md:gap-8" aria-label="Primary navigation">
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollToId('how-it-works'); }} className="text-[11px] sm:text-xs md:text-[13px] font-display font-bold uppercase tracking-wide md:tracking-wider text-ink/80 hover:text-tomato focus-visible:text-tomato transition-colors whitespace-nowrap">How It Works</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToId('pricing'); }} className="text-[11px] sm:text-xs md:text-[13px] font-display font-bold uppercase tracking-wide md:tracking-wider text-ink/80 hover:text-tomato focus-visible:text-tomato transition-colors">Pricing</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); scrollToId('contact'); }} className="text-[11px] sm:text-xs md:text-[13px] font-display font-bold uppercase tracking-wide md:tracking-wider text-ink/80 hover:text-tomato focus-visible:text-tomato transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="relative max-w-5xl mx-auto px-5 md:px-8 pt-12 pb-16 md:pt-24 md:pb-24 flex flex-col md:flex-row items-center gap-10 md:gap-0 min-h-[460px]">
          <div className="w-full md:w-1/2 relative z-10 animate-rise">
            <h1 id="hero-title" className="text-[44px] leading-[0.95] md:text-5xl lg:text-[64px] font-display font-extrabold text-red tracking-tight mb-5">
              <span className="block mb-1.5">Your Food.</span>
              <span className="block mb-1.5">Your Orders.</span>
              <span className="block text-ink">Your Next Storefront.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted font-medium mb-8 max-w-sm">
              Done-For-You Online Ordering
            </p>
            <CtaLink href="/signup" testId="button-hero-get-started">
              Get Started
            </CtaLink>
          </div>
          <div className="w-full md:w-[60%] h-[260px] md:h-full md:absolute md:right-[-5%] md:top-0 animate-rise delay-200">
            <div className="hero-restaurant-image w-full h-full bg-right-top bg-no-repeat [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)] md:[mask-image:linear-gradient(to_left,black_60%,transparent_100%)]" style={{ backgroundImage: `url(${heroImage})` }} aria-label="Restaurant owner holding a phone" role="img" data-testid="img-hero-restaurant-owner"></div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-cream border-t border-line py-16 md:py-24" aria-labelledby="benefits-title">
          <div className="max-w-5xl mx-auto px-5 md:px-8">
            <div className="text-center mb-14">
              <h2 id="benefits-title" className="text-3xl md:text-4xl font-display font-bold text-red tracking-tight mb-4">Why Go Digital?</h2>
              <div className="w-16 h-1 bg-tomato mx-auto rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {benefits.map(({ title, description, icon: Icon }, index) => (
                <article key={title} data-testid={`card-benefit-${index}`} className="bg-paper border border-line rounded-xl p-8 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all text-center flex flex-col items-center">
                  <div className="w-[58px] h-[48px] flex items-center justify-center mb-6 text-tomato">
                    <Icon />
                  </div>
                  <h3 className="text-xl font-display font-bold text-red mb-2 tracking-tight">{title}</h3>
                  <p className="text-muted text-[15px] leading-relaxed">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section id="how-it-works" className="py-16 md:py-24 bg-paper" aria-labelledby="process-title">
          <div className="max-w-5xl mx-auto px-5 md:px-8">
            <div className="text-center mb-16">
              <h2 id="process-title" className="text-3xl md:text-4xl font-display font-bold text-red tracking-tight mb-4">How It Works</h2>
              <p className="text-muted font-medium text-lg">Simple setup. Powerful results.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 max-w-4xl mx-auto" aria-label="Three steps to get started">
              <div className="flex items-start gap-4" data-testid="step-sign-up">
                <span className="w-10 h-10 shrink-0 rounded-full bg-tomato text-white flex items-center justify-center font-display font-bold text-lg shadow-sm">1</span>
                <div>
                  <h3 className="text-lg font-bold text-ink mb-2 tracking-tight">Tell us about your food service.</h3>
                  <p className="text-muted text-[15px] leading-relaxed">Send a few photos of your menu, business card, and any food photos you have.</p>
                </div>
              </div>
              <div className="flex items-start gap-4" data-testid="step-build-everything">
                <span className="w-10 h-10 shrink-0 rounded-full bg-tomato text-white flex items-center justify-center font-display font-bold text-lg shadow-sm">2</span>
                <div>
                  <h3 className="text-lg font-bold text-ink mb-2 tracking-tight">We build your storefront.</h3>
                  <p className="text-muted text-[15px] leading-relaxed">Our experts handle the design, posting, and technical setup.</p>
                </div>
              </div>
              <div className="flex items-start gap-4" data-testid="step-start-orders">
                <span className="w-10 h-10 shrink-0 rounded-full bg-tomato text-white flex items-center justify-center font-display font-bold text-lg shadow-sm">3</span>
                <div>
                  <h3 className="text-lg font-bold text-ink mb-2 tracking-tight">You start getting orders.</h3>
                  <p className="text-muted text-[15px] leading-relaxed">Customers search and visit you online while you handle the food. It's that simple to go digital.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Image Bands */}
        <section className="bg-paper pb-16 md:pb-24">
          <div className="max-w-5xl mx-auto px-5 md:px-8 flex flex-col gap-6 md:gap-8">
            <div className="rounded-2xl overflow-hidden shadow-sm border border-line bg-cream">
              <h2 id="order-title" className="sr-only">Order and pay right from the table.</h2>
              <img
                className="block w-full h-auto"
                src={orderImage}
                alt="A diner scans a table QR code beside a plated meal with the message: Order and pay right from the table."
                data-testid="img-order-and-pay"
              />
            </div>

            <div className="rounded-2xl overflow-hidden shadow-sm border border-line bg-cream" aria-labelledby="merch-title">
              <h2 id="merch-title" className="px-6 py-5 md:px-10 md:py-7 text-2xl md:text-3xl font-display font-bold text-red text-center leading-tight tracking-tight">
                A whole new way to earn: Your <span className="text-tomato">OWN</span> branded merchandise.
              </h2>
              <img
                className="block w-full h-[180px] md:h-auto object-cover object-center"
                src={merchImage}
                alt="Branded shirts, hats, mugs, and a canvas tote"
                data-testid="img-merchandise"
              />
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="bg-cream py-16 md:py-24 border-y border-line" aria-labelledby="pricing-title">
          <div className="max-w-5xl mx-auto px-5 md:px-8">
            <div className="text-center mb-14">
              <h2 id="pricing-title" className="text-3xl md:text-4xl font-display font-bold text-red tracking-tight mb-4">Pricing</h2>
              <div className="w-16 h-1 bg-tomato mx-auto rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <article className="bg-white border border-line rounded-2xl p-6 md:p-8 flex flex-col shadow-sm" data-testid="card-price-food-ordering">
                <h3 className="text-xl font-display font-bold text-red mb-3">Food Ordering</h3>
                <div className="flex items-baseline gap-2 mb-4 text-tomato flex-wrap">
                  <span className="text-4xl md:text-[42px] font-display font-bold tracking-tight">8%*</span>
                  <span className="text-xs font-bold text-muted uppercase tracking-wide">per processed order</span>
                </div>
                <p className="text-muted text-sm leading-relaxed mb-2">No monthly fees. Only pay when orders come in.</p>
                <p className="text-muted text-sm leading-relaxed mb-4">Perfect for taking orders online and at the table.</p>
                <p className="text-ink font-bold text-sm mb-6 pb-6 border-b border-line">$99 one-time setup</p>
                <ul className="space-y-3 mb-8 text-sm text-ink flex-1">
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-red/10 text-red flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> Online pickup ordering</li>
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-red/10 text-red flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> QR table ordering</li>
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-red/10 text-red flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> QR Scan to Pay</li>
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-red/10 text-red flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> Full menu integration</li>
                  <li className="flex gap-3 items-start font-bold"><span className="text-tomato text-base leading-none" aria-hidden="true">★</span> FREE Custom Web Page included</li>
                </ul>
                <Link href="/signup?service=food" data-testid="link-select-food" className="block text-center w-full bg-paper border-2 border-line hover:border-tomato hover:text-tomato text-ink font-bold py-3 px-6 rounded-lg transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tomato focus-visible:ring-offset-2">
                  Select Ordering
                </Link>
              </article>

              <article className="bg-white border border-line rounded-2xl p-6 md:p-8 flex flex-col shadow-sm" data-testid="card-price-merch-storefront">
                <h3 className="text-xl font-display font-bold text-red mb-3">Merch Store</h3>
                <div className="flex items-baseline gap-2 mb-4 text-tomato flex-wrap">
                  <span className="text-4xl md:text-[42px] font-display font-bold tracking-tight">12%*</span>
                  <span className="text-xs font-bold text-muted uppercase tracking-wide">per sale</span>
                </div>
                <p className="text-muted text-sm mb-4 leading-relaxed">Unlock a new revenue stream. Sell your branded gear without buying any inventory upfront.</p>
                <p className="text-ink font-bold text-sm mb-6 mt-auto pb-6 border-b border-line">$99 one-time setup</p>
                <ul className="space-y-3 mb-8 text-sm text-ink flex-1">
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-red/10 text-red flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> Sell hats, shirts, mugs, and more</li>
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-red/10 text-red flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> A shop built around your logo and designs</li>
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-red/10 text-red flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> Printing and shipping handled for you</li>
                  <li className="flex gap-3 items-start font-bold"><span className="text-tomato text-base leading-none" aria-hidden="true">★</span> FREE Custom Web Page included</li>
                </ul>
                <Link href="/signup?service=merch" data-testid="link-select-merch" className="block text-center w-full bg-paper border-2 border-line hover:border-tomato hover:text-tomato text-ink font-bold py-3 px-6 rounded-lg transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tomato focus-visible:ring-offset-2">
                  Select Merch
                </Link>
              </article>

              <article className="relative bg-[#132A38] border border-[#1d3d52] rounded-2xl p-6 md:p-8 flex flex-col shadow-xl text-paper" data-testid="card-price-bundle">
                <span className="absolute -top-3 right-5 bg-tomato text-white text-[11px] font-bold uppercase tracking-wider py-1.5 px-3.5 rounded-full shadow-sm">Most Popular</span>
                <h3 className="text-2xl font-display font-bold mb-4">The Bundle</h3>
                <img src={bundleImage} alt="Sixth Front ordering phone, QR stand, and signature merchandise" className="w-full aspect-video object-cover rounded-xl mb-5" data-testid="img-bundle-offer" />
                <div className="flex items-baseline gap-2 mb-4 text-tomato flex-wrap">
                  <span className="text-4xl md:text-[42px] font-display font-bold tracking-tight">8%* + 12%*</span>
                  <span className="text-xs font-bold text-paper/75 uppercase tracking-wide">on respective sales</span>
                </div>
                <p className="text-paper/90 text-sm leading-relaxed mb-2">The complete digital storefront. Food + Merch, working together seamlessly.</p>
                <p className="text-[#FFD3A3] font-bold text-sm mb-6 pb-6 border-b border-paper/15">$0 setup — you save $198</p>
                <ul className="space-y-3 mb-8 text-sm text-paper/90 flex-1">
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-paper/15 text-paper flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> Everything in Food Ordering</li>
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-paper/15 text-paper flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> Everything in Merch Store</li>
                  <li className="flex gap-3 items-start font-bold"><span className="text-[#FFD3A3] text-base leading-none" aria-hidden="true">★</span> FREE Custom Web Page included</li>
                </ul>
                <CtaLink href="/signup?service=bundle" testId="link-select-bundle" className="w-full">
                  Get The Bundle
                </CtaLink>
              </article>

              <article className="lg:col-span-3 bg-white border border-line rounded-2xl p-6 md:p-8 flex flex-col lg:grid lg:grid-cols-[1fr_1.25fr_200px] lg:gap-10 lg:items-center shadow-sm" data-testid="card-price-landing-page">
                <div>
                  <h3 className="text-xl font-display font-bold text-ink mb-3">Custom Web Page Only</h3>
                  <div className="flex items-baseline gap-1.5 mb-4 text-ink flex-wrap">
                    <span className="text-4xl md:text-[42px] font-display font-bold tracking-tight">$39</span>
                    <span className="text-xs font-bold text-muted uppercase tracking-wide">/month</span>
                  </div>
                  <p className="text-muted text-sm mb-2 leading-relaxed">Just need a professional home on the internet?</p>
                  <p className="text-muted text-sm mb-2">No ordering included.</p>
                  <p className="text-ink font-bold text-sm">$99 one-time setup</p>
                </div>
                <ul className="space-y-3 my-7 lg:my-0 text-sm text-ink">
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-line text-muted flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> Professional one-page website</li>
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-line text-muted flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> Hours, location, and directions</li>
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-line text-muted flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> Menu and photo display</li>
                  <li className="flex gap-3 items-start"><span className="w-[18px] h-[18px] rounded-full bg-line text-muted flex items-center justify-center shrink-0 text-[10px] mt-0.5" aria-hidden="true">✓</span> Hosting included</li>
                </ul>
                <Link href="/signup?service=landing" data-testid="link-select-landing" className="block text-center w-full bg-paper border-2 border-line hover:border-ink hover:text-ink text-muted font-bold py-3 px-6 rounded-lg transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2">
                  Select Custom Web Page
                </Link>
              </article>
            </div>
            <p className="mt-6 text-sm md:text-[15px] leading-relaxed text-muted">
              *Plus the card processor&apos;s standard fee (2.9% + 30¢), charged by the payment processor on each transaction.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="bg-paper py-16 md:py-24" aria-labelledby="contact-title">
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <div className="flex flex-col lg:flex-row gap-0 rounded-[28px] overflow-hidden border border-line shadow-lg bg-white">

              {/* Left Column - Info */}
              <div className="lg:w-5/12 bg-cream p-8 md:p-12 flex flex-col">
                <h2 id="contact-title" className="text-[32px] md:text-4xl font-display font-bold text-red tracking-tight mb-6 leading-tight">Still Deciding?<br/>Reach Out.</h2>
                <p className="text-muted mb-10 text-[15px] leading-relaxed">Tell us a little about your eatery. We'll review your menu, build a free preview of your storefront, and provide answers to anything you're still weighing up.</p>

                <div className="space-y-7 mt-auto border-t border-line/60 pt-8">
                  {contactBenefits.map((benefit) => (
                    <div key={benefit.title} className="flex gap-4">
                      <div className="w-[22px] h-[22px] rounded-full bg-tomato text-white flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5 shadow-sm" aria-hidden="true">✓</div>
                      <div>
                        <h3 className="font-bold text-ink mb-1 text-[15px]">{benefit.title}</h3>
                        <p className="text-[13px] text-muted leading-relaxed">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Form */}
              <div className="lg:w-7/12 p-8 md:p-12 bg-white flex flex-col justify-center">
                <div className="mb-10 pb-6 border-b border-line">
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-ink mb-3 leading-tight max-w-sm">Get Your Free Digital Storefront Preview</h2>
                  <p className="text-muted text-[13px]">No card info, no strings — see your storefront before you decide anything.</p>
                </div>

                {submitStatus === 'success' ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center animate-rise">
                    <div className="w-16 h-16 bg-cream rounded-full flex items-center justify-center mb-6">
                      <div className="w-8 h-8 rounded-full bg-tomato text-white flex items-center justify-center text-xl font-bold">✓</div>
                    </div>
                    <h3 className="text-2xl font-display font-bold text-ink mb-4" data-testid="status-preview-success">{successMessage}</h3>
                    {inlineErrorMessage && (
                      <p className="text-muted text-sm px-4 py-3 bg-paper rounded border border-line" data-testid="status-preview-code">{inlineErrorMessage}</p>
                    )}
                  </div>
                ) : (
                  <form className="space-y-6" onSubmit={handlePreviewSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Restaurant / Business Name <span className="text-tomato" aria-hidden="true">*</span></span>
                        <input type="text" name="restaurantName" placeholder="e.g. Bella Roma Kitchen" required data-testid="input-preview-business-name" className="w-full h-[52px] px-4 rounded-lg border border-line bg-paper/60 focus:bg-white focus:border-tomato focus:ring-2 focus:ring-tomato/20 outline-none transition-all text-[15px] placeholder:text-muted/50" />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Your Name <span className="text-tomato" aria-hidden="true">*</span></span>
                        <input type="text" name="name" placeholder="e.g. Marco Rossi" required data-testid="input-preview-owner-name" className="w-full h-[52px] px-4 rounded-lg border border-line bg-paper/60 focus:bg-white focus:border-tomato focus:ring-2 focus:ring-tomato/20 outline-none transition-all text-[15px] placeholder:text-muted/50" />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Email Address <span className="text-tomato" aria-hidden="true">*</span></span>
                        <input type="email" name="email" placeholder="marco@bellaromakitchen.com" required data-testid="input-preview-email" className="w-full h-[52px] px-4 rounded-lg border border-line bg-paper/60 focus:bg-white focus:border-tomato focus:ring-2 focus:ring-tomato/20 outline-none transition-all text-[15px] placeholder:text-muted/50" />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Phone Number <span className="text-tomato" aria-hidden="true">*</span></span>
                        <input type="tel" name="phone" placeholder="(555) 234-5678" required data-testid="input-preview-phone" className="w-full h-[52px] px-4 rounded-lg border border-line bg-paper/60 focus:bg-white focus:border-tomato focus:ring-2 focus:ring-tomato/20 outline-none transition-all text-[15px] placeholder:text-muted/50" />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Venue Type</span>
                        <select name="venueType" defaultValue="" className="w-full h-[52px] px-4 rounded-lg border border-line bg-paper/60 focus:bg-white focus:border-tomato focus:ring-2 focus:ring-tomato/20 outline-none transition-all text-[15px]">
                          <option value="" disabled>Select one</option>
                          <option>Restaurant full service</option>
                          <option>Restaurant fast casual/counter</option>
                          <option>Cafe or bakery</option>
                          <option>Food truck / pop up</option>
                          <option>Bar/ brewery</option>
                          <option>Other</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Est. Daily Order Volume</span>
                        <select name="dailyOrderVolume" defaultValue="" className="w-full h-[52px] px-4 rounded-lg border border-line bg-paper/60 focus:bg-white focus:border-tomato focus:ring-2 focus:ring-tomato/20 outline-none transition-all text-[15px]">
                          <option value="" disabled>Select one</option>
                          <option>Under 10 orders</option>
                          <option>10-50 orders</option>
                          <option>50-100 orders</option>
                          <option>100+ orders</option>
                        </select>
                      </label>
                    </div>

                    <fieldset className="block pt-3 border-0 m-0 p-0">
                      <legend className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-3 p-0">Which Services Are You Considering? <span className="text-tomato" aria-hidden="true">*</span></legend>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { id: 'bundle', label: 'The Bundle', tag: 'Most Popular' },
                          { id: 'food', label: 'Food Ordering' },
                          { id: 'merch', label: 'Merch Store' },
                          { id: 'landing', label: 'Custom Web Page Only' }
                        ].map(opt => {
                          const isSelected = selectedServices.includes(opt.id);
                          return (
                            <label key={opt.id} className={`relative flex items-center p-4 border rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-cream border-tomato shadow-[0_0_0_1px_#d94a26]' : 'bg-paper/40 border-line hover:bg-paper'}`}>
                              <input
                                type="checkbox"
                                name="services"
                                value={opt.id}
                                checked={isSelected}
                                onChange={() => toggleService(opt.id)}
                              className="service-checkbox order-last ml-3 w-[22px] h-[22px] shrink-0 accent-[#8b281c] cursor-pointer"
                              data-testid={`checkbox-preview-service-${opt.id}`}
                              />
                            <span className="text-[15px] font-bold text-ink select-none flex-1">{opt.label}</span>
                              {opt.tag && (
                                <span className="absolute -top-2.5 right-3 bg-red text-white text-[9px] font-bold uppercase tracking-wider py-1 px-2 rounded-full">{opt.tag}</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    <label className="block pt-2">
                      <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Anything else we should know?</span>
                      <textarea name="comments" rows={3} className="w-full p-4 rounded-lg border border-line bg-paper/60 focus:bg-white focus:border-tomato focus:ring-2 focus:ring-tomato/20 outline-none transition-all text-[15px] resize-none"></textarea>
                    </label>

                    <ReferenceCode value={referenceCode} onChange={setReferenceCode} />

                    {inlineErrorMessage && (
                      <div className="text-red text-sm font-bold bg-red/10 p-3 rounded" data-testid="status-preview-error">{inlineErrorMessage}</div>
                    )}

                    <div className="pt-4">
                      <CtaButton disabled={submitPreviewLead.isPending} className="w-full md:w-auto" testId="button-submit-preview">
                        {submitPreviewLead.isPending ? 'Sending...' : 'Request Free Preview'}
                      </CtaButton>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-cream py-16 text-center border-t border-line" aria-labelledby="final-title">
          <div className="max-w-2xl mx-auto px-5">
            <h2 id="final-title" className="text-[28px] md:text-3xl font-display font-bold text-red mb-6 tracking-tight">Get Your Online Storefront Today!</h2>
            <CtaLink href="/signup" testId="button-final-get-started" className="px-10">
              Get Started
            </CtaLink>
          </div>
        </section>
      </main>

      <footer className="bg-tomato border-t border-white/20 text-[#fff4e5] py-10 flex flex-col items-center justify-center gap-3">
        <a href="#top" onClick={(e) => { e.preventDefault(); scrollToId('top'); }} className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-white rounded mb-1" data-testid="link-footer-brand" aria-label="Sixth Front home">
          <img src={logoImage} alt="" className="w-10 h-[35px] object-contain brightness-0 invert opacity-95" aria-hidden="true" />
          <img src={wordmarkImage} alt="Sixth Front" className="w-[140px] h-[28px] object-contain brightness-0 invert opacity-95" />
        </a>
        <p className="text-[13px] font-medium text-white/90 tracking-wide">Digital support for independent restaurants.</p>
      </footer>
    </div>
  );
}

function PhoneIllustration() {
  return (
    <svg viewBox="0 0 52 40" role="presentation" aria-hidden="true" className="w-full h-full">
      <circle cx="26" cy="20" r="18" fill="#c74426" />
      <path d="M17.2 11.5c.7-.7 1.8-.7 2.5 0l2.7 2.7c.7.7.7 1.8 0 2.5l-1.8 1.8c1.2 1.8 2.7 3.3 4.5 4.5l1.8-1.8c.7-.7 1.8-.7 2.5 0l2.7 2.7c.7.7.7 1.8 0 2.5l-1.3 1.3c-.9.9-2.3 1.3-3.5.9-5.5-1.7-10.3-6.5-12-12-.4-1.3 0-2.6.9-3.5Z" fill="#fff4e3" />
    </svg>
  );
}
