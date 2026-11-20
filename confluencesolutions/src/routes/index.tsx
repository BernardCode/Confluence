import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useRef } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfluenceMark } from "@/components/leaklens/ConfluenceMark";
import { SensorArt, PressureArt, ResponseArt, JunctionShowcaseArt } from "@/components/leaklens/FeatureArt";

const FlowScene = lazy(() => import("@/components/leaklens/FlowScene"));

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Confluence | Water network monitoring" },
    { name: "description", content: "Confluence helps teams identify vulnerable pipes, monitor pressure changes, and plan a response with human oversight." },
    { property: "og:title", content: "Confluence | Water network monitoring" },
    { property: "og:description", content: "Explore a simulated water network connecting pipe risk, pressure monitoring, and team-approved response." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Home,
});

const capabilities = [
  { number: "01", Art: SensorArt, title: "Identify vulnerable pipes", text: "Compare leak history, pipe age, and nearby environmental conditions to prioritize the parts of your network that need attention." },
  { number: "02", Art: PressureArt, title: "Monitor pressure changes", text: "Connect sustained pressure drops with vulnerable pipes to flag possible contamination risks." },
  { number: "03", Art: ResponseArt, title: "Coordinate a response", text: "Review AI-drafted advisories and sampling plans, then assign field work. Your team approves every operational decision." },
];

function Home() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const page = root.current;
    const logo = page?.querySelector<HTMLElement>(".confluence-header .brand-lockup");
    if (!page || !logo) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let intro: Animation | undefined;
    const finish = () => { page.dataset['intro'] = "complete"; intro?.cancel(); };
    if (reduced || window.scrollY > 0) finish();
    else {
      const rect = logo.getBoundingClientRect();
      const scale = Math.min(window.innerWidth * .82 / rect.width, window.innerHeight * .55 / rect.height, 9);
      const x = (window.innerWidth - rect.width * scale) / 2 - rect.left;
      const y = (window.innerHeight - rect.height * scale) / 2 - rect.top;
      page.dataset['intro'] = "playing";
      intro = logo.animate([
        { transform: `translate(${x}px, ${y}px) scale(${scale})`, offset: 0 },
        { transform: `translate(${x}px, ${y}px) scale(${scale})`, offset: .32 },
        { transform: "translate(0, 0) scale(1)", offset: 1 },
      ], { duration: 2100, easing: "cubic-bezier(.65,0,.2,1)", fill: "both" });
      intro.onfinish = finish;
    }
    window.addEventListener("resize", finish, { once: true });
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    root.current?.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    return () => { observer.disconnect(); intro?.cancel(); window.removeEventListener("resize", finish); };
  }, []);
  return (
    <div ref={root} className="confluence-page" data-intro="pending">
      <section className="confluence-hero">
        <header className="confluence-header">
          <Link to="/" aria-label="Confluence home" className="brand-lockup"><ConfluenceMark className="size-8" /><span>confluence<span className="brand-period">.</span></span></Link>
          <div className="header-right"><Button asChild variant="outline" className="nav-cta"><Link to="/ops">Explore demo <ArrowUpRight /></Link></Button></div>
        </header>
        <main className="hero-composition">
          <div className="hero-copy">
            <h1>Confluence<span className="headline-period">.</span></h1>
            <p className="hero-statement">Water intelligence,<br className="mobile-break" /> in motion.</p>
          </div>
          <div className="network-stage">
            <ClientOnly fallback={<div className="flow-scene" />}><Suspense fallback={<div className="flow-scene" />}><FlowScene /></Suspense></ClientOnly>
          </div>
          <div className="hero-bottom"><Button asChild size="lg" className="confluence-cta"><Link to="/ops">Explore the network <ArrowUpRight /></Link></Button></div>
        </main>
        <a className="hero-footnote" href="#water-monitoring" aria-label="More about Confluence"><ChevronDown size={22} /></a>
      </section>
      <section id="water-monitoring" className="value-section section-container reveal">
        <div className="value-layout"><h2>Understand what happens<br /><span>between treatment and the tap.</span></h2><p>A leaking pipe can let outside water enter when pressure falls. Confluence brings pipe condition and pressure readings together so water teams can identify potential risks and plan their response.</p></div>
      </section>
      <section className="capabilities-section section-container">
        <div className="capabilities-grid">{capabilities.map(({number, Art, title, text}) => <article key={number} className="capability reveal"><div className="capability-art"><Art /></div><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <section className="showcase-section"><div className="section-container showcase-inner reveal"><div className="showcase-art-wrap"><JunctionShowcaseArt /></div><div className="showcase-copy"><h2>From a pressure change to a reviewed plan.</h2><p>When a sensor registers a sustained drop near a vulnerable pipe, Confluence links the reading to that pipe's condition and prepares a draft advisory and sampling plan. Your team reviews and edits the draft before anything is shared or assigned.</p></div></div></section>
      <section className="closing-section reveal"><div className="section-container closing-inner"><ConfluenceMark className="closing-mark" /><h2>Explore Confluence.</h2><p>Follow a simulated pressure event from detection through field sampling and team-approved clearance.</p><Button asChild size="lg" className="confluence-cta"><Link to="/ops">Open the demo <ArrowUpRight /></Link></Button></div></section>
      <footer className="confluence-footer section-container"><div className="footer-top"><Link to="/" className="brand-lockup"><ConfluenceMark className="size-7" /><span>confluence.</span></Link></div><div className="footer-bottom"><p>Competition prototype · All data simulated. Not validated for operational use.</p><details><summary>Evidence & limitations</summary><div className="limitations-copy">Low pressure at a leaking pipe can allow outside water to enter. This prototype illustrates that risk; it is not a validated hydraulic model or compliance certification. Risk weights and the two-clear-sample clearance rule require utility and regulator review. No real notices are sent and no equipment is controlled. A pilot would begin with historical records and read-only shadow monitoring.</div></details></div></footer>
    </div>
  );
}
