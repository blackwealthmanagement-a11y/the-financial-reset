import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Financial Reset | Credit Education & Financial Wellness',
  description: 'Personal and business credit education, financial wellness coaching, and guided action plans.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
