import "./globals.css";

export const metadata = {
  title: "Bitbucket Review Handoff",
  description: "Next.js report UI for the 15-minute Bitbucket review automation"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
