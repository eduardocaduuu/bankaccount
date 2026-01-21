'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  AlertCircle,
  FileText,
  Settings,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Setores', href: '/sectors', icon: Building2 },
  { name: 'Colaboradores', href: '/employees', icon: Users },
  { name: 'Ocorrências', href: '/occurrences', icon: AlertCircle },
  { name: 'Relatórios', href: '/reports', icon: FileText },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-background-secondary">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-purple">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary">
              Controle Ponto
            </h1>
            <p className="text-xs text-text-tertiary">Sólides</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-surface text-text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="rounded-lg bg-surface p-3">
            <p className="text-xs text-text-tertiary">Versão 1.0.0</p>
            <p className="mt-1 text-xs text-text-tertiary">
              Ambiente: {process.env.NODE_ENV}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
