'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, User, Building2 } from 'lucide-react';
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
import type { Employee } from '@/types';

interface EmployeeWithSector extends Employee {
  sector?: { name: string };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeWithSector[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/employees`,
        {
          headers: {
            'x-internal-token': process.env.API_INTERNAL_TOKEN || '',
          },
        }
      );
      const data = await response.json();
      setEmployees(data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      header: 'Nome',
      render: (item: EmployeeWithSector) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-blue/10">
            <User className="h-4 w-4 text-accent-blue" />
          </div>
          <div>
            <span className="font-medium">{item.name}</span>
            {item.slackUserId && (
              <p className="text-xs text-text-tertiary">
                Slack: {item.slackUserId}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'sector',
      header: 'Setor',
      render: (item: EmployeeWithSector) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-text-tertiary" />
          <span>{item.sector?.name || '-'}</span>
        </div>
      ),
    },
    {
      key: 'solidesEmployeeId',
      header: 'ID Sólides',
      render: (item: EmployeeWithSector) => (
        <code className="rounded bg-background-secondary px-2 py-1 text-xs">
          {item.solidesEmployeeId}
        </code>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (item: EmployeeWithSector) => (
        <Badge variant={item.active ? 'green' : 'red'}>
          {item.active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-16',
      render: (item: EmployeeWithSector) => (
        <button className="btn-ghost p-1.5">
          <Edit className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Colaboradores</h1>
          <p className="text-text-secondary">
            Gerencie os colaboradores e mapeamento Slack
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4" />
          Novo Colaborador
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-secondary">Total</p>
            <p className="text-2xl font-bold text-text-primary">
              {employees.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-secondary">Ativos</p>
            <p className="text-2xl font-bold text-accent-green">
              {employees.filter((e) => e.active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-text-secondary">Com Slack</p>
            <p className="text-2xl font-bold text-accent-blue">
              {employees.filter((e) => e.slackUserId).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Colaboradores</CardTitle>
              <CardDescription>
                {filteredEmployees.length} colaborador(es)
              </CardDescription>
            </div>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar colaborador..."
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
              data={filteredEmployees}
              keyExtractor={(item) => item.id}
              emptyMessage="Nenhum colaborador encontrado"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
