import { useState } from "react";
import { ArrowUpRight, ChevronDown, MapPin, PhoneOff, ShoppingBag } from "lucide-react";
import "./SixthFrontIndex.css";

const faqs = [
  ["How long does it take to get set up?", "Most restaurants are ready to accept their first online order within a few days."],
  ["Do I need any technical skills?", "Not at all. We build everything and stay close whenever you need a hand."],
  ["What areas do you serve?", "We partner with independent restaurants wherever great food deserves to be found."],
];
const benefits = [["01", "Get found online", "Your own address on the internet.", MapPin], ["02", "Take orders 24/7", "The counter stays open.", ShoppingBag], ["03", "Ditch the phone", "More time for the room.", PhoneOff]] as const;

export function SixthFrontIndex() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selected, setSelected] = useState(1);
  const [notice, setNotice] = useState(false);
  const jump = () => document.getElementById("sfi-pricing")?.scrollIntoView({ behavior: "smooth" });
  return <div className="sfi-shell">
    <aside className="sfi-rail"><div className="sfi-stamp">SIXTH<br /><span>FRONT</span><b>FIELD GUIDE</b></div><div className="sfi-rail-meta"><span>VOL. 01</span><span>2024</span></div></aside>
    <main className="sfi-main">
      <header className="sfi-header"><span><i /> A practical guide for independent restaurants</span><button onClick={jump}>Start here <ArrowUpRight size={14} /></button></header>
      <section className="sfi-hero"><div className="sfi-hero-copy"><p className="sfi-overline">Chapter one / The front door</p><h1>Make room<br /><em>online.</em></h1><p className="sfi-lede">Your food already has a following.<br />Give it somewhere to go.</p><button className="sfi-primary" onClick={jump}>Open your front door <ArrowUpRight size={15} /></button></div><div className="sfi-hero-art" aria-label="Abstract illustration of an open restaurant door"><div className="sfi-sun" /><div className="sfi-door"><span>OPEN</span><b>24<br />HR</b></div><div className="sfi-shadow" /><span className="sfi-art-note">good things<br /><em>come through.</em></span></div></section>
      <section className="sfi-intro"><span className="sfi-chapter">02</span><div><p className="sfi-overline">The short version</p><h2>Keep the craft.<br /><em>Lose the friction.</em></h2><p>We build and run your online ordering. You keep making the thing people came for.</p></div></section>
      <section className="sfi-benefits"><div className="sfi-benefit-heading"><span>Three useful shifts</span><b>↓</b></div><div className="sfi-benefit-list">{benefits.map(([number, title, copy, Icon], index) => <button key={title} className={`sfi-benefit ${selected === index ? "is-selected" : ""}`} onClick={() => setSelected(index)}><span>{number}</span><Icon size={21} /><div><strong>{title}</strong><small>{copy}</small></div><ArrowUpRight size={16} /></button>)}</div><div className="sfi-benefit-detail"><span>0{selected + 1}</span><p>{benefits[selected][2]}<br /><em>That’s the whole point.</em></p></div></section>
      <section className="sfi-process"><span className="sfi-chapter">03</span><div><p className="sfi-overline">A short route to more orders</p><div className="sfi-steps"><div><b>01</b><span>Sign up</span></div><div><b>02</b><span>We build everything</span></div><div><b>03</b><span>You start getting orders.</span></div></div></div></section>
      <section className="sfi-order"><div className="sfi-order-art"><div className="sfi-plate" /><div className="sfi-cutlery" /><span>THE<br /><b>TABLE<br />IS OPEN</b></span></div><div className="sfi-order-copy"><p className="sfi-overline">04 / The new service window</p><h2>Good food<br /><em>should travel.</em></h2><p>Order and pay right from the table. Less waiting, more hospitality.</p></div></section>
      <section className="sfi-pricing" id="sfi-pricing"><span className="sfi-chapter">05</span><div><p className="sfi-overline">Choose your next move</p><h2>Simple<br /><em>by design.</em></h2><div className="sfi-price-list"><div><span>Food ordering</span><strong>8% <small>per order</small></strong><p>FREE branded landing page included.</p></div><div><span>Merch storefront</span><strong>12% <small>per sale</small></strong><p>FREE branded landing page included.</p></div><div><span>Branded landing page</span><strong>$39 <small>/month</small></strong><p>A home for your restaurant online.</p></div></div></div></section>
      <section className="sfi-faq"><span className="sfi-chapter">06</span><div><p className="sfi-overline">Questions, answered</p><h2>Good to know.</h2>{faqs.map(([q, a], index) => <div className="sfi-faq-item" key={q}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{q}</span><ChevronDown size={15} /></button>{openFaq === index && <p>{a}</p>}</div>)}</div></section>
      <footer className="sfi-footer"><span>Sixth Front</span><p>Digital support for independent restaurants.</p><button onClick={() => setNotice(true)}>Get started <ArrowUpRight size={14} /></button>{notice && <small>We’ll be in touch soon.</small>}</footer>
    </main>
  </div>;
}
export default SixthFrontIndex;