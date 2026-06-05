import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Automation Report',
  description: 'API-first automation reporting with live WebSocket updates'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
