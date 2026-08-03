'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Building2, GraduationCap, LineChart, ShieldCheck, Sparkles } from 'lucide-react';
import Nav from './components/Nav';
import Footer from './components/Footer';

const services = [
  {
    icon: GraduationCap,
    title: 'Personal Credit Education',
    description: 'Decode credit reports, improve utilization, and turn confusing scoring factors into a practical plan.'
  },
  {
    icon: Building2,
    title: 'Business Credit Guidance',
    description: 'Learn how lenders review business credit and how to position your company for stronger readiness.'
  },
  {
    icon: LineChart,
    title: 'Financial Wellness Coaching',
    description: 'Create realistic habits, savings goals, and debt strategies that fit your daily life and long-term vision.'
  }
];

const roadmap = [
  {
    step: '01',
    title: 'Clarify your position',
    description: 'Complete a guided intake so we can understand your goals, challenges, and current financial profile.'
  },
  {
    step: '02',
    title: 'Choose a tailored path',
    description: 'Select the education or coaching experience that fits your stage, priorities, and comfort level.'
  },
  {
    step: '03',
    title: 'Move forward with confidence',
    description: 'Receive a clear roadmap, next steps, and the support needed to stay accountable and informed.'
  }
];

const testimonials = [
  {
    name: 'Alicia M.',
    role: 'Small business owner',
    quote: 'The process finally made sense. I felt supported, informed, and equipped to make better decisions.'
  },
  {
    name: 'Daniel R.',
    role: 'First-time credit builder',
    quote: 'Every step felt calm and deliberate. I left with clarity, structure, and a genuine plan to rebuild.'
  },
  {
    name: 'Nina T.',
    role: 'Entrepreneur',
    quote: 'It felt premium and practical at the same time. The guidance gave me confidence before I made any big moves.'
  }
];

const faqs = [
  {
    question: 'Who is The Financial Reset designed for?',
    answer: 'It is for individuals and entrepreneurs who want clear education, practical next steps, and a more informed approach to credit and financial wellness.'
  },
  {
    question: 'Do you offer personalized support?',
    answer: 'Yes. Every experience begins with a guided intake and is structured around your goals, timeline, and current situation.'
  },
  {
    question: 'Is this a replacement for financial advice?',
    answer: 'This service is educational and guidance-based. It is designed to support your planning while encouraging you to seek professional counsel when needed.'
  }
];

export default function Home() {
  const [showMobileCta, setShowMobileCta] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('hero');
    const heroHeight = hero?.offsetHeight ?? 0;
    const revealItems = document.querySelectorAll<HTMLElement>('[data-reveal]');

    const handleScroll = () => {
      setShowMobileCta(window.scrollY > heroHeight * 0.75);
    };

    handleScroll();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -60px 0px' }
    );

    revealItems.forEach((item) => observer.observe(item));
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      <Nav />
      <main>
        <section className="hero" id="hero" data-reveal>
          <div className="container hero-grid">
            <div className="hero-copy" data-reveal>
              <div className="eyebrow">Credit education • financial clarity • real strategy</div>
              <h1>
                Reset your credit.
                <span>Rebuild your confidence.</span>
              </h1>
              <p>The Financial Reset helps individuals and entrepreneurs understand their credit, create practical financial goals, and take informed steps toward stronger personal and business finances.</p>
              <div className="hero-actions">
                <Link className="button primary" href="/intake">
                  Start Your Reset <ArrowRight size={18} />
                </Link>
                <a className="button secondary" href="#services">
                  Explore Services
                </a>
              </div>
              <div className="hero-badges">
                <span><ShieldCheck size={16} /> Personalized guidance</span>
                <span><Sparkles size={16} /> Education-first approach</span>
              </div>
            </div>
            <div className="hero-card" data-reveal>
              <div className="dashboard-preview">
                <div className="dashboard-preview-header">
                  <div className="dashboard-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span className="preview-label">Client view</span>
                </div>
                <div className="dashboard-preview-body">
                  <div className="dashboard-panel dashboard-panel--accent">
                    <div className="dashboard-row">
                      <span>Wellness score</span>
                      <strong>82%</strong>
                    </div>
                    <div className="dashboard-bar">
                      <span />
                    </div>
                  </div>
                  <div className="dashboard-grid">
                    <div className="dashboard-panel">
                      <span>Plan</span>
                      <strong>Reset + 90</strong>
                    </div>
                    <div className="dashboard-panel">
                      <span>Focus</span>
                      <strong>Utilization</strong>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hero-card-top">
                <span className="card-pill">Your reset roadmap</span>
                <span className="card-number">3 steps</span>
              </div>
              <h3>Understand. Plan. Progress.</h3>
              <p>A guided experience designed to help you understand what is affecting your financial profile and what to do next.</p>
              <div className="hero-metrics">
                <div className="metric">
                  <strong>1:1</strong>
                  <span>Guidance</span>
                </div>
                <div className="metric">
                  <strong>Clear</strong>
                  <span>Action plans</span>
                </div>
                <div className="metric">
                  <strong>Built</strong>
                  <span>For you</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-soft" id="services" data-reveal>
          <div className="container">
            <div className="section-head" data-reveal>
              <div className="eyebrow">What we help with</div>
              <h2>Financial wellness built around your next chapter.</h2>
              <p>Every service is designed to feel clear, strategic, and calm—whether you are rebuilding your profile or preparing for a new milestone.</p>
            </div>
            <div className="cards">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <article className="card" key={service.title} data-reveal>
                    <div className="icon"><Icon size={22} /></div>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section" id="process" data-reveal>
          <div className="container">
            <div className="section-head" data-reveal>
              <div className="eyebrow">The reset process</div>
              <h2>A clear path forward.</h2>
              <p>Three deliberate steps to help you move from uncertainty to momentum.</p>
            </div>
            <div className="steps">
              {roadmap.map((item) => (
                <div className="step" key={item.step} data-reveal>
                  <span>{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-soft" id="testimonials" data-reveal>
          <div className="container">
            <div className="section-head" data-reveal>
              <div className="eyebrow">Client perspectives</div>
              <h2>Trusted guidance that feels grounded and encouraging.</h2>
            </div>
            <div className="testimonial-grid">
              {testimonials.map((testimonial) => (
                <article className="testimonial-card" key={testimonial.name} data-reveal>
                  <p>“{testimonial.quote}”</p>
                  <div className="testimonial-meta">
                    <strong>{testimonial.name}</strong>
                    <span>{testimonial.role}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="faq" data-reveal>
          <div className="container faq-shell">
            <div className="section-head" data-reveal>
              <div className="eyebrow">Frequently asked questions</div>
              <h2>Questions you may have before getting started.</h2>
            </div>
            <div className="faq-list">
              {faqs.map((faq) => (
                <details className="faq-item" key={faq.question} data-reveal>
                  <summary>{faq.question}<span>+</span></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="section" data-reveal>
          <div className="container">
            <div className="cta" data-reveal>
              <div>
                <div className="eyebrow">Begin with intention</div>
                <h2>Ready for your financial reset?</h2>
                <p>Start with a short intake so we can understand your goals and guide you toward the best next step.</p>
              </div>
              <div className="cta-actions">
                <Link className="button cta-button" href="/intake">
                  Begin Intake <ArrowRight size={18} />
                </Link>
                <Link className="button secondary" href="/book">
                  Book a Consultation <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <div className="mobile-cta-group">
        <Link className={`mobile-cta button primary ${showMobileCta ? 'is-visible' : ''}`} href="/intake">
          Start Your Reset <ArrowRight size={18} />
        </Link>
        <Link className={`mobile-cta button secondary ${showMobileCta ? 'is-visible' : ''}`} href="/book">
          Book a Consultation <ArrowRight size={18} />
        </Link>
      </div>
    </>
  );
}
