'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/Card';
import { Badge } from '@/components/Badge';
import { SearchInput } from '@/components/SearchInput';
import { DataTable } from '@/components/DataTable';
import type { Sector } from '@/types';

export default function SectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSectors();
  }, []);

  const fetchSectors = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/sectors`,
        {
          headers: {
            'x-internal-token': process.env.API_INTERNAL_TOKEN || '',
          },
        }
      );
      const data = await response.json();
      setSectors(data.data || []);
    } catch (error) {
      console.error('Failed to fetch sectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSectors = sectors.filter((sector) =>
    sector.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (item: Sector) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-purple/10">
            <Users className="h-4 w-4 text-accent-purple" />
          </div>
          <span className="font-medium">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'managerSlackUserId',
      header: 'Gestor (Slack ID)',
      render: (item: Sector) => (
        <code className="rounded bg-background-secondary px-2 py-1 text-xs">
          {item.managerSlackUserId}
        </code>
      ),
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      render: (item: Sector) =>
        new Date(item.createdAt).toLocaleDateString('pt-BR'),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-24',
      render: (item: Sector) => (
        <div className="flex items-center gap-2">
          <button className="btn-ghost p-1.5">
            <Edit className="h-4 w-4" />
          </button>
          <button className="btn-ghost p-1.5 text-accent-red hover:text-accent-red">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Setores</h1>
          <p className="text-text-secondary">
            Gerencie os setores e seus gestores
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4" />
          Novo Setor
        </button>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Setores</CardTitle>
              <CardDescription>
                {sectors.length} setor(es) cadastrado(s)
              </CardDescription>
            </div>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar setor..."
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-text-tertiary">Carregando...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredSectors}
              keyExtractor={(item) => item.id}
              emptyMessage="Nenhum setor encontrado"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
