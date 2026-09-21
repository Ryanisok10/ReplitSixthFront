import { useState } from "react";
import { ArrowUpRight, ChevronDown, MapPin, PhoneOff, ShoppingBag } from "lucide-react";
import "./SixthFrontPolished.css";

const faqs = [
  ["How long does it take to get set up?", "Most restaurants are ready to accept their first online order within a few days."],
  ["Do I need any technical skills?", "Not at all. We build everything and stay close whenever you need a hand."],
  ["What areas do you serve?", "We partner with independent restaurants wherever great food deserves to be found."],
];

export function SixthFrontPolished() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [notice, setNotice] = useState(false);
  const jump = () => document.getElementById("sfp-pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="sfp-shell">
      <aside className="sfp-rail">
        <div className="sfp-logo">Sixth<br />Front<span>.</span></div>
        <div className="sfp-rail-note">Digital support<br />for independent<br />restaurants.</div>
        <div className="sfp-rail-meta"><span>SF / 01—06</span><i /></div>
      </aside>
      <main className="sfp-main">
        <header className="sfp-header">
          <span className="sfp-kicker">Restaurant systems <b>/</b> 2024</span>
          <button className="sfp-quiet-button" onClick={jump}>Get started <ArrowUpRight size={13} /></button>
        </header>

        <section className="sfp-hero">
          <div className="sfp-hero-copy">
            <p className="sfp-eyebrow">01 <span>/</span> A better front door</p>
            <h1>Your restaurant.<br /><em>Online.</em><br />Finally.</h1>
            <p className="sfp-lede">We build and run your online ordering —<br />you just cook.</p>
            <button className="sfp-primary" onClick={jump}>Build my storefront <ArrowUpRight size={15} /></button>
          </div>
          <div className="sfp-hero-art" aria-label="A phone showing a restaurant ordering page">
            <div className="sfp-orbit" /><div className="sfp-scribble">always<br />open</div>
            <div className="sfp-phone"><div className="sfp-notch" /><div className="sfp-screen"><small>GOOD FOOD</small><strong>ON THE<br />WAY</strong><i /></div></div>
            <div className="sfp-plate"><b>+</b></div>
            <span className="sfp-art-label">Your table<br />is always open.</span>
          </div>
        </section>

        <section className="sfp-intro">
          <span className="sfp-index">02</span>
          <div><h2>Keep the craft.<br /><em>Lose the friction.</em></h2><p>More people are looking for your food than ever. Make it easy for them to find you, order, and come back.</p></div>
        </section>

        <section className="sfp-benefits" aria-label="Benefits">
          <article><MapPin /><span>01</span><h3>Get found online</h3><p>Attract more customers.</p></article>
          <article className="sfp-benefit-hot"><ShoppingBag /><span>02</span><h3>Take orders 24/7</h3><p>Beyond just walk-ins.</p><b>02</b></article>
          <article><PhoneOff /><span>03</span><h3>Ditch the phone</h3><p>No more constant calls.</p></article>
        </section>

        <section className="sfp-process">
          <span className="sfp-index">03</span>
          <div><p className="sfp-eyebrow">A short route to more orders</p><div className="sfp-steps"><div><b>01</b><span>Sign up</span></div><div><b>02</b><span>We build everything</span></div><div><b>03</b><span>You start getting orders.</span></div></div></div>
        </section>

        <section className="sfp-order">
          <div className="sfp-order-art"><div className="sfp-table" /><div className="sfp-dish" /><span>ORDER<br /><b>FROM<br />THE<br />TABLE</b></span></div>
          <div className="sfp-order-copy"><p className="sfp-eyebrow">04 <span>/</span> The new service window</p><h2>Order and pay<br /><em>right from</em><br />the table.</h2><p>Less waiting. More hospitality. A storefront that feels like you.</p></div>
        </section>

        <section className="sfp-pricing" id="sfp-pricing"><span className="sfp-index">05</span><div><p className="sfp-eyebrow">Simple by design</p><h2>Pick your<br /><em>next move.</em></h2><div className="sfp-price-list"><div><span>Food ordering</span><strong>8% <small>per order</small></strong><p>FREE branded landing page included.</p></div><div><span>Merch storefront</span><strong>12% <small>per sale</small></strong><p>FREE branded landing page included.</p></div><div><span>Branded landing page</span><strong>$39 <small>/month</small></strong><p>A home for your restaurant online.</p></div></div></div></section>

        <section className="sfp-faq"><span className="sfp-index">06</span><div><p className="sfp-eyebrow">Questions, answered</p><h2>Good to know.</h2>{faqs.map(([question, answer], index) => <div className="sfp-faq-item" key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown size={15} /></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></section>
        <footer className="sfp-footer"><strong>Sixth Front<span>.</span></strong><p>Digital support for independent restaurants.</p><button onClick={() => setNotice(true)}>Get started <ArrowUpRight size={13} /></button>{notice && <small>We’ll be in touch soon.</small>}</footer>
      </main>
    </div>
  );
}

export default SixthFrontPolished;