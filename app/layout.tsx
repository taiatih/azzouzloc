import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SWRegister from '@/components/SWRegister';
import AppHeader from '@/components/AppHeader';
import MobileNav from '@/components/MobileNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Azzouz Location',
  description: "Application de gestion de location d'équipements",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e40af" />
      </head>
      <body className={`${inter.className} min-h-screen bg-white text-gray-900`}>
        <SWRegister />
        <AppHeader />
        <main className="mx-auto max-w-3xl p-4 pb-24">
          {children}
        </main>
        <MobileNav />
      </body>
    </html>
  );
}

