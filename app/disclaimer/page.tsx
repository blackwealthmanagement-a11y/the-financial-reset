import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

export const metadata = {
  title: 'Disclaimer | The Financial Reset',
  description: 'Important disclaimer for educational and general wellness guidance provided by The Financial Reset.',
  robots: {
    index: false,
    follow: false
  }
};

export default function DisclaimerPage() {
  return (
    <>
      <Nav />
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card">
            <div className="eyebrow">Disclaimer</div>
            <h1>Disclaimer</h1>
            <p>The Financial Reset provides education and general financial wellness guidance. It is not a law firm, credit bureau, lender, financial adviser, or guaranteed credit-repair service.</p>
            <p>Results vary based on each person’s financial profile, actions, timing, and circumstances. No specific credit-score increase, funding approval, deletion, or timeline is guaranteed, and any outcomes depend on the individual’s unique situation.</p>
            <p>The Financial Reset is operated by Black Wealth Management LLC. This website is for informational and educational purposes only and should not be relied upon as a substitute for professional advice where appropriate.</p>
            <Link className="button primary" href="/">
              Return Home <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
