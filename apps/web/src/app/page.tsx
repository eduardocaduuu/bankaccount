import {
  Users,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/Card';
import { Badge } from '@/components/Badge';
import { DataTable } from '@/components/DataTable';
import { getDashboardKPIs, getSectorStats, getRecentOccurrences } from '@/lib/api';
import {
  formatDateBR,
  getOccurrenceTypeLabel,
  getOccurrenceStatusLabel,
  getStatusColor,
  getTypeColor,
} from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let kpis;
  let sectorStats;
  let recentOccurrences;

  try {
    [kpis, sectorStats, recentOccurrences] = await Promise.all([
      getDashboardKPIs(),
      getSectorStats(),
      getRecentOccurrences(),
    ]);
  } catch (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary">Visão geral do sistema</p>
        </div>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 text-accent-red">
              <AlertCircle className="h-5 w-5" />
              <p>Erro ao carregar dados. Verifique se a API está rodando.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const occurrenceColumns = [
    {
      key: 'employee',
      header: 'Colaborador',
      render: (item: typeof recentOccurrences[0]) =>
        (item as any).employee?.name || '-',
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (item: typeof recentOccurrences[0]) => (
        <Badge variant={getTypeColor(item.type)}>
          {getOccurrenceTypeLabel(item.type)}
        </Badge>
      ),
    },
    {
      key: 'date',
      header: 'Data',
      render: (item: typeof recentOccurrences[0]) => formatDateBR(item.date),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: typeof recentOccurrences[0]) => (
        <Badge variant={getStatusColor(item.status)}>
          {getOccurrenceStatusLabel(item.status)}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary">
          Visão geral do controle de ponto
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Colaboradores"
          value={kpis.totalEmployees}
          description={`${kpis.activeEmployees} ativos`}
          icon={Users}
          color="purple"
        />
        <KPICard
          title="Setores"
          value={kpis.totalSectors}
          icon={Building2}
          color="blue"
        />
        <KPICard
          title="Ocorrências Hoje"
          value={kpis.todayOccurrences}
          description={`${kpis.openOccurrences} abertas no total`}
          icon={AlertCircle}
          color="yellow"
        />
        <KPICard
          title="Resolvidas Hoje"
          value={kpis.resolvedToday}
          icon={CheckCircle}
          color="green"
        />
      </div>

      {/* Second KPIs Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Atrasos"
          value={kpis.lateToday}
          icon={Clock}
          color="yellow"
        />
        <KPICard
          title="Horas Extra"
          value={kpis.overToday}
          icon={TrendingUp}
          color="blue"
        />
        <KPICard
          title="Falta de Horas"
          value={kpis.underToday}
          icon={TrendingDown}
          color="red"
        />
        <KPICard
          title="Incompletos"
          value={kpis.incompleteToday}
          icon={AlertTriangle}
          color="purple"
        />
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Occurrences */}
        <Card>
          <CardHeader>
            <CardTitle>Ocorrências Recentes</CardTitle>
            <CardDescription>
              Últimas ocorrências abertas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={occurrenceColumns}
              data={recentOccurrences}
              keyExtractor={(item) => item.id}
              emptyMessage="Nenhuma ocorrência pendente"
            />
          </CardContent>
        </Card>

        {/* Sector Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Setores</CardTitle>
            <CardDescription>
              Resumo por setor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sectorStats.length === 0 ? (
                <p className="text-sm text-text-tertiary">Nenhum setor cadastrado</p>
              ) : (
                sectorStats.map((sector) => (
                  <div
                    key={sector.sectorId}
                    className="flex items-center justify-between rounded-lg bg-background-secondary p-3"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {sector.sectorName}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {sector.employeeCount} colaborador(es)
                      </p>
                    </div>
                    {sector.openOccurrences > 0 && (
                      <Badge variant="red">
                        {sector.openOccurrences} pendente(s)
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
