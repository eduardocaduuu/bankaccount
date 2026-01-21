'use client';

import { useState, useEffect } from 'react';
import { Filter, RefreshCw, Calendar } from 'lucide-react';
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
import type { Occurrence, Employee } from '@/types';
import {
  formatDateBR,
  formatMinutes,
  getOccurrenceTypeLabel,
  getOccurrenceStatusLabel,
  getStatusColor,
  getTypeColor,
} from '@/lib/utils';

interface OccurrenceWithEmployee extends Occurrence {
  employee?: Employee & { sector?: { name: string } };
}

export default function OccurrencesPage() {
  const [occurrences, setOccurrences] = useState<OccurrenceWithEmployee[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOccurrences();
  }, [statusFilter, typeFilter, dateFilter]);

  const fetchOccurrences = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      if (dateFilter) params.set('date', dateFilter);

      const queryString = params.toString();
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/occurrences${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'x-internal-token': process.env.API_INTERNAL_TOKEN || '',
        },
      });
      const data = await response.json();
      setOccurrences(data.data || []);
    } catch (error) {
      console.error('Failed to fetch occurrences:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOccurrences = occurrences.filter((occ) =>
    (occ.employee?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'employee',
      header: 'Colaborador',
      render: (item: OccurrenceWithEmployee) => (
        <div>
          <span className="font-medium">{item.employee?.name || '-'}</span>
          <p className="text-xs text-text-tertiary">
            {item.employee?.sector?.name || '-'}
          </p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Data',
      render: (item: OccurrenceWithEmployee) => formatDateBR(item.date),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (item: OccurrenceWithEmployee) => (
        <Badge variant={getTypeColor(item.type)}>
          {getOccurrenceTypeLabel(item.type)}
        </Badge>
      ),
    },
    {
      key: 'minutes',
      header: 'Tempo',
      render: (item: OccurrenceWithEmployee) =>
        item.minutes > 0 ? formatMinutes(item.minutes) : '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: OccurrenceWithEmployee) => (
        <Badge variant={getStatusColor(item.status)}>
          {getOccurrenceStatusLabel(item.status)}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      render: (item: OccurrenceWithEmployee) =>
        new Date(item.createdAt).toLocaleDateString('pt-BR'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Ocorrências</h1>
          <p className="text-text-secondary">
            Acompanhe atrasos, horas extras e faltas
          </p>
        </div>
        <button
          onClick={fetchOccurrences}
          className="btn-secondary"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-text-tertiary" />
              <span className="text-sm text-text-secondary">Filtros:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-40"
            >
              <option value="">Todos status</option>
              <option value="OPEN">Aberta</option>
              <option value="ACK">Confirmada</option>
              <option value="RESOLVED">Resolvida</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input w-40"
            >
              <option value="">Todos tipos</option>
              <option value="LATE">Atraso</option>
              <option value="OVER">Hora Extra</option>
              <option value="UNDER">Falta de Horas</option>
              <option value="INCOMPLETE">Incompleto</option>
            </select>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-tertiary" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input w-40"
              />
            </div>

            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome..."
              className="ml-auto w-64"
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Ocorrências</CardTitle>
          <CardDescription>
            {filteredOccurrences.length} ocorrência(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-text-tertiary">Carregando...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredOccurrences}
              keyExtractor={(item) => item.id}
              emptyMessage="Nenhuma ocorrência encontrada"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
