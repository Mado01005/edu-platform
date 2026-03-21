import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'EduPortal — Your Learning Hub',
  description: 'A modern education platform for students. Access courses in Dynamics, Physics, Chemistry, Communication Skills, Academic Writing, Calculus, and Programming.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
