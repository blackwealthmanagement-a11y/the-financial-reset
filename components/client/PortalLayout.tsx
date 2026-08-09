'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, PanelLeft } from 'lucide-react';
import { browserSupabase } from '../../lib/supabase/browser';

interface PortalLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const links = [
  { href: '/portal/dashboard', label: 'Dashboard' },
  { href: '/portal/scheduling', label: 'Scheduling' },
  { href: '/portal/documents', label: 'Documents' },
  { href: '/portal/resources', label: 'Resources' }
];

export function PortalLayout({ title, subtitle, children }: PortalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    if (!browserSupabase) {
      router.push('/portal/login');
      return;
    }

    await browserSupabase.auth.signOut();
    router.push('/portal/login');
  }

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div>
          <div className="portal-brand">The Financial Reset</div>
          <p className="portal-sidebar-copy">Client portal</p>
        </div>
        <nav className="portal-nav" aria-label="Client portal navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={`portal-nav-link ${pathname === link.href ? 'is-active' : ''}`}>
              {link.label}
            </Link>
          ))}
        </nav>
        <button type="button" className="portal-logout" onClick={handleLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </aside>
      <main className="portal-main">
        <header className="portal-header">
          <div>
            <p className="eyebrow">Client portal</p>
            <h1>{title}</h1>
            {subtitle ? <p className="portal-header-copy">{subtitle}</p> : null}
          </div>
          <div className="portal-mobile-toggle" aria-hidden="true">
            <PanelLeft size={18} />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
