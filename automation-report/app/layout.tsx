import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Work Status Dashboard',
  description: 'Live dashboard for agent work status, sessions, and automation activity'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
