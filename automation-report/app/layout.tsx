import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Work Status Dashboard',
  description: 'Live dashboard for current work, automation activity, and Sentry issues'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
