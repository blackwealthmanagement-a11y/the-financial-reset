import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Nav from '../components/Nav';
import Footer from '../components/Footer';

export const metadata = {
  title: 'Privacy Policy | The Financial Reset',
  description: 'Privacy practices for The Financial Reset website and public communications.',
  robots: {
    index: false,
    follow: false
  }
};

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="page-shell">
        <section className="container page-section">
          <div className="page-card">
            <div className="eyebrow">Privacy policy</div>
            <h1>Privacy Policy</h1>
            <p>We respect your privacy. Information collected through our website may be used to respond to inquiries, improve our services, and support public communications. We do not sell personal data to third parties for marketing purposes.</p>
            <p>If you contact us through our website, we may collect your name, email address, phone number, and any details you choose to share in your message. We use this information to respond to your inquiry and coordinate our services.</p>
            <p>For public launch purposes, secure portal functionality and account storage are still being developed. Please do not submit sensitive documents through the website at this stage.</p>
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
