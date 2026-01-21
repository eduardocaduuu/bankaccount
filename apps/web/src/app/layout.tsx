import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Controle de Ponto - Dashboard',
  description: 'Sistema de controle de ponto e banco de horas integrado com Sólides',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <main className="flex-1 pl-64">
            <div className="p-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
