import { type ChangeEvent, type FormEvent, type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrowDownRight, ArrowRight, Check, ChevronDown, Coffee, Menu, MonitorSmartphone, QrCode, ShoppingBag, Store, Truck, X } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

const navItems = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Services', href: '#services' },
  { label: 'Who it is for', href: '#who-its-for' },
  { label: 'FAQ', href: '#faq' },
];

const faqs = [
  {
    question: 'Do I need to be technical to use Sixth Front?',
    answer: 'No. We handle the build, launch, and day-to-day technology management. You provide the menu, brand details, and the food. We take care of the online ordering experience.',
  },
  {
    question: 'What do I need to get started?',
    answer: 'Your menu, a few details about your business, and access to the devices you already use. There is no special hardware to buy for our service.',
  },
  {
    question: 'How does the commission plan work?',
    answer: 'On the QR code / online food ordering plan, Sixth Front keeps 8% of each order and there is no setup fee. We only make money when you make money.',
  },
  {
    question: 'Can my online ordering look like my business?',
    answer: 'Yes. Your brand is front and center, rather than being presented alongside a marketplace full of other businesses. We build the experience around your menu and identity.',
  },
  {
    question: 'What happens when I need help?',
    answer: 'We handle support requests and coordinate with our technology partners on your behalf, so you have one clear place to bring questions about your ordering service.',
  },
  {
    question: 'Can I eventually own everything outright?',
    answer: 'A buyout option is available for merchants who want to own everything outright later. Ask us about it when we talk through your setup.',
  },
];

function BrandMark() {
  return (
    <span className="flex items-center gap-3" data-testid="brand-sixth-front">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--accent))]">
        <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" />
        <span className="absolute h-6 w-6 rounded-full border border-[hsl(var(--accent))] opacity-50" />
      </span>
      <span className="text-[15px] font-bold tracking-[-.03em] text-[#faf6ee]">Sixth Front</span>
    </span>
  );
}

function Header({ onNavigate }: { onNavigate: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const navigate = () => {
    closeMenu();
    onNavigate();
  };

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="#top" onClick={navigate} data-testid="link-brand-home"><BrandMark /></a>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a className="nav-link text-sm" href={item.href} onClick={navigate} key={item.href} data-testid={`link-nav-${item.label.toLowerCase().replaceAll(' ', '-')}`}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="outline-button hidden rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-[#faf6ee] md:inline-flex" href="#contact" onClick={navigate} data-testid="link-header-get-started">
          Get Started <ArrowRight className="ml-2 h-4 w-4" />
        </a>
        <button className="rounded-full border border-white/25 p-2 text-[#faf6ee] md:hidden" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)} data-testid="button-mobile-menu">
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menuOpen && (
        <div className="mobile-menu mx-4 rounded-2xl border border-white/15 bg-[#173536] p-5 shadow-2xl md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a className="rounded-xl px-3 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-[hsl(var(--accent))]" href={item.href} onClick={navigate} key={item.href} data-testid={`link-mobile-${item.label.toLowerCase().replaceAll(' ', '-')}`}>
                {item.label}
              </a>
            ))}
            <a className="mt-3 inline-flex items-center justify-center rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-semibold text-[#faf6ee]" href="#contact" onClick={navigate} data-testid="link-mobile-get-started">
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="hero-grid relative overflow-hidden bg-[#173536] text-[#faf6ee]">
      <div className="hero-glow" />
      <Header onNavigate={() => undefined} />
      <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-5 pb-20 pt-36 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-8 lg:px-12 lg:pb-24 lg:pt-40">
        <div className="relative z-10 max-w-2xl">
          <div className="reveal eyebrow mb-7 text-[hsl(var(--accent))]">Online ordering, with a steady hand</div>
          <h1 className="reveal delay-1 max-w-[720px] text-[clamp(3.4rem,10vw,7.5rem)] leading-[.87] tracking-[-.065em]">
            More orders.<br /><span className="serif font-normal italic text-[hsl(var(--accent))]">Less tech.</span>
          </h1>
          <p className="reveal delay-2 mt-8 max-w-lg text-lg leading-8 text-white/70 sm:text-xl">
            Sixth Front builds and runs your branded online ordering, so you can focus on the food and the people who come back for it.
          </p>
          <div className="reveal delay-3 mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <a className="solid-button inline-flex items-center rounded-full bg-[hsl(var(--primary))] px-6 py-3.5 font-semibold text-[#faf6ee]" href="#contact" data-testid="link-hero-get-started">
              Get Started <ArrowRight className="ml-3 h-4 w-4" />
            </a>
            <a className="inline-flex items-center px-2 py-3 text-sm font-semibold text-white/70 transition-colors hover:text-[hsl(var(--accent))]" href="#how-it-works" data-testid="link-hero-how-it-works">
              See how it works <ArrowDownRight className="ml-2 h-4 w-4" />
            </a>
          </div>
          <div className="reveal delay-3 mt-12 flex items-center gap-3 text-xs text-white/50">
            <Check className="h-4 w-4 text-[hsl(var(--accent))]" /> Free setup and build on commission plans
          </div>
        </div>

        <div className="relative mx-auto mt-3 w-full max-w-[500px] lg:mt-10 lg:justify-self-end">
          <div className="absolute -left-5 top-10 hidden rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur sm:block">
            <div className="mono text-[10px] uppercase tracking-[.16em] text-[hsl(var(--accent))]">Your storefront</div>
            <div className="mt-1 text-sm font-semibold">Your name. Your menu.</div>
          </div>
          <div className="phone-shadow mx-auto w-[260px] rotate-[4deg] rounded-[2.25rem] border-[7px] border-[#102627] bg-[#f8f2e8] p-2 sm:w-[294px]">
            <div className="overflow-hidden rounded-[1.65rem] bg-[#f8f2e8]">
              <div className="flex items-center justify-between bg-[#db6045] px-5 py-4 text-[#faf6ee]">
                <div className="text-[13px] font-bold">Marlow Kitchen</div>
                <QrCode className="h-4 w-4" />
              </div>
              <div className="p-4">
                <div className="mono text-[9px] uppercase tracking-[.12em] text-[#a19a8d]">Good food, direct</div>
                <div className="serif mt-1 text-[28px] leading-none text-[#173536]">Choose your table.</div>
                <div className="mt-4 flex gap-2 text-[10px] font-semibold text-[#173536]">
                  <span className="rounded-full bg-[#f0d69a] px-3 py-1.5">Popular</span>
                  <span className="rounded-full bg-[#e8e1d5] px-3 py-1.5">Mains</span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {['Crispy chicken sandwich', 'Charred corn bowl', 'House lemonade'].map((dish, index) => (
                    <div className="flex items-center justify-between rounded-xl border border-[#ded5c7] bg-white/50 p-3" key={dish}>
                      <div>
                        <div className="text-[11px] font-bold text-[#173536]">{dish}</div>
                        <div className="mt-1 text-[10px] text-[#91897d]">{index === 0 ? 'pickles · chili mayo' : index === 1 ? 'lime · herbs · feta' : 'fresh squeezed'}</div>
                      </div>
                      <div className="text-[11px] font-bold text-[#db6045]">{index === 0 ? '$14' : index === 1 ? '$12' : '$4'}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-xl bg-[#173536] px-4 py-3 text-center text-[11px] font-bold text-[#faf6ee]">Start an order <ArrowRight className="ml-1 inline h-3 w-3" /></div>
              </div>
            </div>
          </div>
          <div className="order-card absolute -bottom-5 -right-1 rounded-2xl border border-[#e1d7c8] bg-[#faf6ee] p-4 text-[#173536] card-shadow sm:-right-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dce8db] text-[#286153]"><Check className="h-4 w-4" /></span>
              <div>
                <div className="mono text-[9px] uppercase tracking-[.11em] text-[#8d8a7e]">New order</div>
                <div className="text-xs font-bold">Ready for your kitchen</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="relative mx-auto flex max-w-7xl items-center justify-between border-t border-white/10 px-5 py-5 text-xs text-white/45 sm:px-8 lg:px-12">
        <span className="mono uppercase tracking-[.12em]">Built for independent food businesses</span>
        <span className="hidden sm:block">The merchant handles the food. We handle the tech.</span>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { number: '01', title: 'Tell us about your business', body: 'Share your menu, your style, and how you want guests to order. We start with what already makes your place yours.' },
    { number: '02', title: 'We build the front', body: 'Sixth Front creates your branded ordering experience, organizes the details, and gets everything ready to launch.' },
    { number: '03', title: 'You start getting orders', body: 'Put your link or QR code where guests can find it. You run the kitchen; we manage the technology behind the order.' },
  ];
  return (
    <section id="how-it-works" className="bg-[hsl(var(--background))] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-24">
          <div>
            <div className="eyebrow">A simple handoff</div>
            <h2 className="mt-5 max-w-md text-5xl leading-[.95] tracking-[-.055em] text-[hsl(var(--foreground))] sm:text-6xl">
              You bring the <span className="serif italic text-[hsl(var(--primary))]">good stuff.</span>
            </h2>
            <p className="mt-6 max-w-sm leading-7 text-[hsl(var(--muted-foreground))]">
              We turn it into an ordering experience that feels like a natural extension of your counter.
            </p>
          </div>
          <div className="section-rule">
            {steps.map((step) => (
              <div className="grid gap-4 border-b border-[hsl(var(--border))] py-7 sm:grid-cols-[80px_1fr] sm:gap-5" key={step.number}>
                <div className="step-number pt-1">{step.number}</div>
                <div>
                  <h3 className="text-xl font-semibold tracking-[-.025em]">{step.title}</h3>
                  <p className="mt-2 max-w-lg leading-7 text-[hsl(var(--muted-foreground))]">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-20 grid gap-5 md:grid-cols-3">
          <div className="soft-card rounded-2xl border border-[hsl(var(--border))] bg-[#edf0e7] p-6">
            <MonitorSmartphone className="h-6 w-6 text-[#286153]" />
            <h3 className="mt-12 text-lg font-semibold">Use what you have</h3>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Works on the devices you already use. No special hardware to buy.</p>
          </div>
          <div className="soft-card rounded-2xl border border-[hsl(var(--border))] bg-[#f0d69a] p-6">
            <Store className="h-6 w-6 text-[#173536]" />
            <h3 className="mt-12 text-lg font-semibold">Your brand, front and center</h3>
            <p className="mt-2 text-sm leading-6 text-[#5e574b]">A direct path to your menu, without putting your business in a marketplace lineup.</p>
          </div>
          <div className="soft-card rounded-2xl border border-[hsl(var(--border))] bg-[#f7e4dc] p-6">
            <QrCode className="h-6 w-6 text-[hsl(var(--primary))]" />
            <h3 className="mt-12 text-lg font-semibold">Ready for the counter</h3>
            <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">A simple QR code or link makes the next order easy to find.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Services() {
  const services = [
    { icon: QrCode, label: 'Most popular', title: 'QR code / online food ordering', price: '8%', suffix: 'commission per order', description: 'A branded ordering experience for your menu, built and launched for you.', featured: true, details: 'No setup fee. We only make money when you make money.' },
    { icon: ShoppingBag, label: 'Add a new lane', title: 'Online merch storefront', price: '12%', suffix: 'commission per sale', description: 'A simple storefront for the goods people want to take home with them.', details: 'Keep your menu and your merch in one considered place.' },
    { icon: MonitorSmartphone, label: 'A clear front door', title: 'Standalone landing page', price: '$39', suffix: 'per month', description: 'A focused home for your business, your story, and the next step for guests.', details: 'A strong starting point when you need a polished online presence.' },
    { icon: Store, label: 'Keep it in sync', title: 'POS sync add-on', price: '$39', suffix: 'per month', description: 'A managed service that keeps your online menu in sync with your in-store point of sale.', details: 'We help keep the details aligned without asking you to become a technologist.' },
  ];
  return (
    <section id="services" className="bg-[#e7e1d5] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="eyebrow">Services & pricing</div>
            <h2 className="mt-5 max-w-2xl text-5xl leading-[.95] tracking-[-.055em] sm:text-6xl">A better order of <span className="serif italic text-[hsl(var(--primary))]">operations.</span></h2>
          </div>
          <p className="max-w-xs leading-7 text-[hsl(var(--muted-foreground))]">Choose the pieces that fit the way your business works today. We can talk through what comes next.</p>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article className={`pricing-card relative rounded-2xl border p-6 sm:p-8 ${service.featured ? 'pricing-featured border-[#286153] bg-[#286153] text-[#faf6ee]' : 'border-[hsl(var(--border))] bg-[hsl(var(--background))]'}`} key={service.title} data-testid={`card-service-${service.title.toLowerCase().replaceAll(' ', '-')}`}>
                {service.featured && <div className="absolute right-6 top-6 rounded-full bg-[hsl(var(--accent))] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[.1em] text-[#173536]">Start here</div>}
                <Icon className={`h-6 w-6 ${service.featured ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--primary))]'}`} />
                <div className={`eyebrow mt-12 ${service.featured ? 'text-[hsl(var(--accent))]' : ''}`}>{service.label}</div>
                <h3 className="mt-2 max-w-sm text-2xl font-semibold tracking-[-.04em]">{service.title}</h3>
                <div className="mt-6 flex items-baseline gap-2">
                  <span className="serif text-6xl leading-none">{service.price}</span>
                  <span className={`text-sm ${service.featured ? 'text-white/65' : 'text-[hsl(var(--muted-foreground))]'}`}>{service.suffix}</span>
                </div>
                <p className={`mt-5 max-w-md leading-7 ${service.featured ? 'text-white/75' : 'text-[hsl(var(--muted-foreground))]'}`}>{service.description}</p>
                <div className={`mt-7 flex items-start gap-2 border-t pt-5 text-sm ${service.featured ? 'border-white/15 text-white/75' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}>
                  <Check className={`mt-0.5 h-4 w-4 shrink-0 ${service.featured ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--primary))]'}`} /> {service.details}
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Interested in owning everything outright later? <a href="#contact" className="font-semibold text-[hsl(var(--primary))] underline decoration-[hsl(var(--accent))] underline-offset-4" data-testid="link-buyout-question">Ask us about a buyout option.</a></p>
      </div>
    </section>
  );
}

function WhoItsFor() {
  const audiences = [
    { icon: Store, title: 'Restaurants', body: 'For the places with a full menu, a loyal regular crowd, and a lot to keep moving.' },
    { icon: Coffee, title: 'Cafes', body: 'For morning rituals, quick pickups, and the details that make a small menu memorable.' },
    { icon: Truck, title: 'Food trucks', body: 'For businesses that move around but need one dependable place for the next order.' },
  ];
  return (
    <section id="who-its-for" className="bg-[hsl(var(--background))] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_.8fr]">
          <div>
            <div className="eyebrow">Made for your kind of busy</div>
            <h2 className="mt-5 max-w-3xl text-5xl leading-[.93] tracking-[-.06em] sm:text-7xl">Good businesses deserve a <span className="serif italic text-[hsl(var(--secondary))]">good front door.</span></h2>
          </div>
          <p className="max-w-sm leading-7 text-[hsl(var(--muted-foreground))]">Sixth Front is for independent food businesses that want to be easier to order from without adding another job to the list.</p>
        </div>
        <div className="mt-16 grid gap-4 border-t border-[hsl(var(--border))] pt-4 md:grid-cols-3">
          {audiences.map((audience) => {
            const Icon = audience.icon;
            return (
              <div className="group border-b border-[hsl(var(--border))] py-7 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0" key={audience.title}>
                <div className="flex items-center justify-between">
                  <Icon className="h-7 w-7 text-[hsl(var(--primary))] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" />
                  <ArrowDownRight className="h-5 w-5 text-[hsl(var(--muted-foreground))] transition-transform duration-300 group-hover:translate-x-1 group-hover:translate-y-1" />
                </div>
                <h3 className="mt-14 text-2xl font-semibold tracking-[-.04em]">{audience.title}</h3>
                <p className="mt-3 max-w-xs leading-7 text-[hsl(var(--muted-foreground))]">{audience.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-[#f2ece2] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.7fr_1.3fr] lg:gap-24">
        <div>
          <div className="eyebrow">Questions, answered</div>
          <h2 className="mt-5 max-w-md text-5xl leading-[.95] tracking-[-.055em] sm:text-6xl">No fine print <span className="serif italic text-[hsl(var(--primary))]">fog.</span></h2>
          <p className="mt-6 max-w-sm leading-7 text-[hsl(var(--muted-foreground))]">A few practical answers before we talk about your menu.</p>
        </div>
        <div className="divide-y divide-[hsl(var(--border))] border-y border-[hsl(var(--border))]">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div className="faq-row" key={faq.question}>
                <button className="flex w-full items-center justify-between gap-6 py-5 text-left" type="button" onClick={() => setOpenFaq(isOpen ? null : index)} aria-expanded={isOpen} data-testid={`button-faq-${index}`}>
                  <span className="text-base font-semibold tracking-[-.02em] sm:text-lg">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[hsl(var(--primary))] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <div className="faq-answer max-w-2xl pb-6 pr-8 leading-7 text-[hsl(var(--muted-foreground))]" data-testid={`text-faq-answer-${index}`}>{faq.answer}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', business: '', message: '' });
  const update = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };
  return (
    <section id="contact" className="relative overflow-hidden bg-[#173536] px-5 py-24 text-[#faf6ee] sm:px-8 lg:px-12 lg:py-32">
      <div className="hero-glow bottom-[-280px] left-[-220px] right-auto top-auto opacity-60" />
      <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.9fr_1.1fr] lg:gap-24">
        <div>
          <div className="eyebrow text-[hsl(var(--accent))]">Let’s make ordering easier</div>
          <h2 className="mt-5 max-w-lg text-5xl leading-[.92] tracking-[-.06em] sm:text-7xl">Your next good <span className="serif italic text-[hsl(var(--accent))]">move.</span></h2>
          <p className="mt-7 max-w-md text-lg leading-8 text-white/65">Tell us a little about your business. We’ll come back with a clear view of what your online ordering could look like.</p>
          <div className="mt-12 space-y-5 text-sm text-white/70">
            <div className="flex items-center gap-3"><Check className="h-4 w-4 text-[hsl(var(--accent))]" /> No setup fee on commission plans</div>
            <div className="flex items-center gap-3"><Check className="h-4 w-4 text-[hsl(var(--accent))]" /> Built and managed for you</div>
            <div className="flex items-center gap-3"><Check className="h-4 w-4 text-[hsl(var(--accent))]" /> A conversation, not a sales maze</div>
          </div>
        </div>
        {submitted ? (
          <div className="flex min-h-[410px] flex-col justify-center rounded-3xl bg-[#f2ece2] p-7 text-[#173536] sm:p-12" data-testid="status-form-success">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dce8db] text-[#286153]"><Check className="h-6 w-6" /></div>
            <h3 className="mt-7 text-3xl font-semibold tracking-[-.04em]">We’ve got it.</h3>
            <p className="mt-3 max-w-sm leading-7 text-[#6a675f]">Thanks for reaching out{form.name ? `, ${form.name}` : ''}. We’ll review the details and follow up about your ordering setup.</p>
            <button type="button" className="mt-8 inline-flex w-fit items-center rounded-full border border-[#173536]/20 px-5 py-3 text-sm font-semibold transition-colors hover:border-[#db6045] hover:text-[#db6045]" onClick={() => setSubmitted(false)} data-testid="button-send-another">
              Send another note <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        ) : (
          <form className="rounded-3xl bg-[#f2ece2] p-6 text-[#173536] sm:p-10" onSubmit={submit} data-testid="form-get-started">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-semibold">Your name
                <input className="form-input mt-2 w-full rounded-xl border border-[#d8cfbf] bg-[#faf6ee] px-4 py-3.5 text-sm font-normal" type="text" value={form.name} onChange={update('name')} placeholder="Your name" required data-testid="input-name" />
              </label>
              <label className="text-sm font-semibold">Email
                <input className="form-input mt-2 w-full rounded-xl border border-[#d8cfbf] bg-[#faf6ee] px-4 py-3.5 text-sm font-normal" type="email" value={form.email} onChange={update('email')} placeholder="you@yourbusiness.com" required data-testid="input-email" />
              </label>
            </div>
            <label className="mt-5 block text-sm font-semibold">Business name
              <input className="form-input mt-2 w-full rounded-xl border border-[#d8cfbf] bg-[#faf6ee] px-4 py-3.5 text-sm font-normal" type="text" value={form.business} onChange={update('business')} placeholder="The name guests know you by" required data-testid="input-business" />
            </label>
            <label className="mt-5 block text-sm font-semibold">What are you working on?
              <textarea className="form-input mt-2 min-h-32 w-full resize-y rounded-xl border border-[#d8cfbf] bg-[#faf6ee] px-4 py-3.5 text-sm font-normal" value={form.message} onChange={update('message')} placeholder="Tell us about your menu, your setup, or what you want to make easier." required data-testid="input-message" />
            </label>
            <button className="solid-button mt-6 inline-flex w-full items-center justify-center rounded-full bg-[hsl(var(--primary))] px-6 py-3.5 font-semibold text-[#faf6ee]" type="submit" data-testid="button-submit-contact">
              Get Started <ArrowRight className="ml-3 h-4 w-4" />
            </button>
            <p className="mt-4 text-center text-xs leading-5 text-[#898277]">This is a placeholder contact form for now. We’ll use your note to start the conversation.</p>
          </form>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[#173536] px-5 pb-8 text-[#faf6ee] sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 border-t border-white/15 pt-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <BrandMark />
          <p className="mt-4 max-w-xs text-sm leading-6 text-white/50">The calm, capable operating partner for independent food businesses.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {navItems.map((item) => <a className="footer-link text-white/55" href={item.href} key={item.href} data-testid={`link-footer-${item.label.toLowerCase().replaceAll(' ', '-')}`}>{item.label}</a>)}
          <a className="footer-link text-white/55" href="#contact" data-testid="link-footer-contact">Contact</a>
        </div>
        <div className="mono text-[10px] uppercase tracking-[.12em] text-white/35">© {new Date().getFullYear()} Sixth Front</div>
      </div>
    </footer>
  );
}

function Home() {
  return (
    <div className="site-shell">
      <Hero />
      <HowItWorks />
      <Services />
      <WhoItsFor />
      <Faq />
      <Contact />
      <Footer />
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;