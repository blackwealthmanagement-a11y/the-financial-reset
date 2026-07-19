import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

export const metadata = {
  title: 'Terms of Use | The Financial Reset',
  description: 'Terms for using The Financial Reset website and related public materials.',
  robots: {
    index: false,
    follow: false
  }
};

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card">
            <div className="eyebrow">Terms of use</div>
            <h1>Terms of Use</h1>
            <p>By accessing The Financial Reset website, you agree to use the site for informational purposes only. The information provided is not intended to constitute legal, tax, lending, investment, or individualized financial advice.</p>
            <p>You agree not to misuse the website, attempt to access unauthorized areas, or submit confidential information through unfinished forms or portal features.</p>
            <p>We reserve the right to update, remove, or change content at any time as the service evolves.</p>
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
