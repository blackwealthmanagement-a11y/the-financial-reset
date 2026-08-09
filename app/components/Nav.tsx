import Link from 'next/link';

export default function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand">The Financial <span>Reset</span></Link>
        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#services">Services</a>
          <a href="#process">How it works</a>
          <Link href="/education">Education Hub</Link>
          <Link href="/book">Book a Consultation</Link>
          <Link href="/portal">Client Portal</Link>
          <Link className="button primary" href="/intake">Start Your Reset</Link>
        </nav>
      </div>
    </header>
  );
}
