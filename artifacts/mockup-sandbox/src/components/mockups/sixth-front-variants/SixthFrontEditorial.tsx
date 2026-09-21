import { useState } from "react";
import { ArrowUpRight, ChevronDown, MapPin, ShoppingBag, UtensilsCrossed } from "lucide-react";
import "./SixthFrontEditorial.css";

const faqs = [
  ["How long does it take to get set up?", "Most restaurants are ready to accept their first online order within a few days."],
  ["Do I need any technical skills?", "Not at all. We build everything and stay close whenever you need a hand."],
  ["What areas do you serve?", "We partner with independent restaurants wherever great food deserves to be found."],
];

export function SixthFrontEditorial() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [notice, setNotice] = useState(false);
  const jump = () => document.getElementById("sf-pricing")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="sfv-shell">
      <aside className="sfv-rail">
        <div className="sfv-brand">Sixth<br />Front<span>.</span></div>
        <div className="sfv-rail-copy">Digital support<br />for independent<br />restaurants.</div>
        <div className="sfv-rail-bottom"><span>01—06</span><span className="sfv-line" /></div>
      </aside>
      <main className="sfv-main">
        <header className="sfv-header">
          <span className="sfv-kicker">Restaurant systems / 2024</span>
          <button className="sfv-top-button" onClick={jump}>Get started <ArrowUpRight size={14} /></button>
        </header>

        <section className="sfv-hero">
          <div className="sfv-hero-copy">
            <p className="sfv-eyebrow">01 / A better front door</p>
            <h1>Your restaurant.<br /><em>Online.</em><br />Finally.</h1>
            <p className="sfv-lede">We build and run your online ordering —<br />you just cook.</p>
            <button className="sfv-button" onClick={jump}>Build my storefront <ArrowUpRight size={16} /></button>
          </div>
          <div className="sfv-hero-art" aria-label="Illustrated restaurant phone ordering scene">
            <div className="sfv-sun" />
            <div className="sfv-phone"><div className="sfv-phone-notch" /><div className="sfv-phone-screen"><span>GOOD FOOD<br /><b>ON THE WAY</b></span><i /></div></div>
            <div className="sfv-plate" />
            <div className="sfv-art-caption">The table is<br />always open.</div>
          </div>
        </section>

        <section className="sfv-intro">
          <div className="sfv-section-num">02</div>
          <div><h2>Keep the craft.<br /><span>Lose the friction.</span></h2><p>More people are looking for your food than ever. Make it easy for them to find you, order, and come back.</p></div>
        </section>

        <section className="sfv-benefits">
          <div className="sfv-benefit"><MapPin /><div><span>01</span><h3>Get found online</h3><p>Attract more customers.</p></div></div>
          <div className="sfv-benefit sfv-benefit-feature"><ShoppingBag /><div><span>02</span><h3>Take orders 24/7</h3><p>Beyond just walk-ins.</p></div><b>01</b></div>
          <div className="sfv-benefit"><UtensilsCrossed /><div><span>03</span><h3>Ditch the phone</h3><p>No more constant calls.</p></div></div>
        </section>

        <section className="sfv-process">
          <div className="sfv-section-num">03</div><div className="sfv-process-content"><p className="sfv-eyebrow">A short route to more orders</p><div className="sfv-steps"><div><strong>01</strong><span>Sign up</span></div><div><strong>02</strong><span>We build everything</span></div><div><strong>03</strong><span>You start getting orders.</span></div></div></div>
        </section>

        <section className="sfv-order"><div className="sfv-order-art"><div className="sfv-table" /><div className="sfv-dish" /><span>ORDER<br /><b>FROM<br />THE<br />TABLE</b></span></div><div className="sfv-order-copy"><p className="sfv-eyebrow">04 / The new service window</p><h2>Order and pay<br /><em>right from</em><br />the table.</h2><p>Less waiting. More hospitality. A storefront that feels like you.</p></div></section>

        <section className="sfv-pricing" id="sf-pricing"><div className="sfv-section-num">05</div><div className="sfv-price-content"><p className="sfv-eyebrow">Simple by design</p><h2>Pick your<br /><em>next move.</em></h2><div className="sfv-price-list"><div><span>Food ordering</span><strong>8% <small>per order</small></strong><p>FREE branded landing page included.</p></div><div><span>Merch storefront</span><strong>12% <small>per sale</small></strong><p>FREE branded landing page included.</p></div><div><span>Branded landing page</span><strong>$39<small>/month</small></strong><p>A home for your restaurant online.</p></div></div></div></section>

        <section className="sfv-faq"><div className="sfv-section-num">06</div><div className="sfv-faq-content"><p className="sfv-eyebrow">Questions, answered</p><h2>Good to know.</h2>{faqs.map(([q, a], i) => <div className="sfv-faq-item" key={q}><button onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}><span>{q}</span><ChevronDown size={16} /></button>{openFaq === i && <p>{a}</p>}</div>)}</div></section>
        <footer className="sfv-footer"><span>Sixth Front.</span><p>Ready to get started?</p><button onClick={() => setNotice(true)}>Get started <ArrowUpRight size={14} /></button>{notice && <small>We’ll be in touch soon.</small>}</footer>
      </main>
    </div>
  );
}

export default SixthFrontEditorial;