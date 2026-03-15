import '@/styles/globals.css';

export const metadata = {
  title: 'Runway — Financial Model for Startups',
  description: 'Live financial modeling for startups — burn rate, runway, headcount, and actuals.',
  icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml' } },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
