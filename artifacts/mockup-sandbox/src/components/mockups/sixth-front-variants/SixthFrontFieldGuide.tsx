import { useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, CircleHelp, MapPin, Phone, ShoppingBag, Sparkles, Utensils } from "lucide-react";
import "./SixthFrontFieldGuide.css";

const plans = [
  { name: "The front door", detail: "A branded home for your restaurant online.", price: "$39", suffix: "/month", key: "site" },
  { name: "The order window", detail: "Direct ordering that stays open after hours.", price: "8%", suffix: " per order", key: "orders" },
  { name: "The side hustle", detail: "A simple storefront for the things you make.", price: "12%", suffix: " per sale", key: "merch" },
];

const faqs = [
  ["Will this look like my restaurant?", "Yes. We start with your menu, your voice, and the details regulars already love."],
  ["How much work is left for my team?", "Very little. We build the storefront, connect the ordering, and stay close after launch."],
  ["Can I start with one service?", "Absolutely. Pick one useful piece today and add the others when the time is right."],
];

export function SixthFrontFieldGuide() {
  const [selected, setSelected] = useState("orders");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const active = useMemo(() => plans.find((plan) => plan.key === selected) ?? plans[1], [selected]);

  const jumpToGuide = () => document.getElementById("sf-guide")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="sfg-shell">
      <header className="sfg-topbar">
        <a className="sfg-wordmark" href="#top">Sixth <i>Front</i></a>
        <div className="sfg-status"><span /> Independent restaurant systems <b>EST. 2024</b></div>
        <button className="sfg-contact" onClick={() => setSent(true)}>Talk to a human <ArrowRight size={14} /></button>
      </header>

      <main id="top">
        <section className="sfg-hero">
          <div className="sfg-hero-main">
            <p className="sfg-label">A field guide for going online</p>
            <h1>Make room<br /><em>for more</em><br />good food.</h1>
            <p className="sfg-hero-copy">Your dining room has an address. Your online presence should feel just as real.</p>
            <button className="sfg-primary" onClick={jumpToGuide}>Find your next move <ArrowRight size={16} /></button>
          </div>
          <div className="sfg-hero-stamp">
            <div className="sfg-stamp-ring">SIXTH FRONT <span>•</span> RESTAURANT SYSTEMS <span>•</span></div>
            <div className="sfg-stamp-mark"><Utensils size={25} /><b>OPEN<br />LATE</b></div>
            <small>BUILT FOR<br />THE PEOPLE<br />BEHIND THE PASS</small>
          </div>
          <div className="sfg-hero-note"><span>01</span><b>THE BRIEF</b><p>Keep the craft.<br />Lose the friction.</p></div>
        </section>

        <section className="sfg-guide" id="sf-guide">
          <aside className="sfg-sidebar">
            <p className="sfg-label">Choose a chapter</p>
            <button className={selected === "site" ? "active" : ""} onClick={() => setSelected("site")}><span>01</span><MapPin size={16} /> Be findable</button>
            <button className={selected === "orders" ? "active" : ""} onClick={() => setSelected("orders")}><span>02</span><Phone size={16} /> Be open</button>
            <button className={selected === "merch" ? "active" : ""} onClick={() => setSelected("merch")}><span>03</span><ShoppingBag size={16} /> Make more</button>
            <div className="sfg-sidebar-foot"><Sparkles size={14} /><span>One good move<br />at a time.</span></div>
          </aside>
          <div className="sfg-guide-content">
            <div className="sfg-guide-head"><div><p className="sfg-label">Chapter {active.key === "site" ? "01" : active.key === "orders" ? "02" : "03"} / Your next move</p><h2>{active.name}</h2></div><span className="sfg-tally">0{plans.findIndex((p) => p.key === selected) + 1} / 03</span></div>
            <div className="sfg-feature">
              <div className="sfg-feature-art">
                {selected === "site" && <><div className="sfg-window"><div /><div /><div /></div><MapPin size={37} /></>}
                {selected === "orders" && <><div className="sfg-phone-art"><div className="sfg-phone-bar" /><b>ORDER<br /><i>UP.</i></b><span>12:42 PM</span></div><Phone size={35} /></>}
                {selected === "merch" && <><div className="sfg-bag-art"><ShoppingBag size={64} /></div><span className="sfg-badge">NEW</span></>}
              </div>
              <div className="sfg-feature-copy"><p className="sfg-label">What it unlocks</p><h3>{active.detail}</h3><p>We handle the digital bits, so your team can stay focused on the food, the room, and the people in it.</p><button className="sfg-link" onClick={() => setSent(true)}>Start with this <ArrowRight size={14} /></button></div>
            </div>
            <div className="sfg-benefit-row"><div><b>01</b><span>More people find you.</span></div><div><b>02</b><span>Fewer calls to answer.</span></div><div><b>03</b><span>More room to grow.</span></div></div>
          </div>
        </section>

        <section className="sfg-pricing">
          <div className="sfg-price-intro"><p className="sfg-label">The fine print</p><h2>Simple enough<br /><em>to explain.</em></h2><p>Choose a starting point. No mystery bundles, no long contracts.</p></div>
          <div className="sfg-price-list">{plans.map((plan) => <button key={plan.key} className={selected === plan.key ? "selected" : ""} onClick={() => setSelected(plan.key)}><span className="sfg-plan-index">0{plans.indexOf(plan) + 1}</span><span className="sfg-plan-name">{plan.name}<small>{plan.detail}</small></span><strong>{plan.price}<small>{plan.suffix}</small></strong><ArrowRight size={16} /></button>)}</div>
        </section>

        <section className="sfg-faq">
          <div className="sfg-faq-title"><CircleHelp size={22} /><p className="sfg-label">Before you decide</p><h2>Good questions<br /><em>deserve answers.</em></h2></div>
          <div>{faqs.map(([question, answer], index) => <div className="sfg-faq-item" key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown size={15} /></button>{openFaq === index && <p>{answer}</p>}</div>)}</div>
        </section>
      </main>

      <footer className="sfg-footer"><div><span className="sfg-wordmark">Sixth <i>Front</i></span><p>Digital support for independent restaurants.</p></div><div className="sfg-footer-cta"><span>{sent ? "We'll be in touch soon." : "Have a question?"}</span><button onClick={() => setSent(true)}>Talk to us <ArrowRight size={14} /></button></div></footer>
    </div>
  );
}

export default SixthFrontFieldGuide;