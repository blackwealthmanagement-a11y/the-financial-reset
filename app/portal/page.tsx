import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

export const metadata = {
  title: 'Client Portal Coming Soon | The Financial Reset',
  description: 'Secure client portal access and progress tracking are being developed for launch.',
  robots: {
    index: false,
    follow: false
  }
};

export default function Portal() {
  return (
    <>
      <Nav />
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card">
            <div className="eyebrow">Client portal</div>
            <h1>Client portal coming soon.</h1>
            <p>Secure account access, private progress tracking, and document management are currently being developed. At this time, the portal is not open for login, account creation, or document uploads.</p>
            <div className="hero-actions">
              <Link className="button primary" href="/">
                Return Home <ArrowRight size={18} />
              </Link>
              <Link className="button secondary" href="/#services">
                Begin Intake
              </Link>
            </div>
            <div className="hero-badges">
              <span><ShieldCheck size={16} /> Secure access development underway</span>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
