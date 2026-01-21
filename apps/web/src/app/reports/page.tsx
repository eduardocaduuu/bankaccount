import { FileText, Download, Calendar } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/Card';

export default function ReportsPage() {
  const reports = [
    {
      id: 'daily',
      title: 'Relatório Diário',
      description: 'Resumo de marcações e ocorrências do dia',
      icon: FileText,
    },
    {
      id: 'weekly',
      title: 'Relatório Semanal',
      description: 'Consolidado semanal por setor',
      icon: Calendar,
    },
    {
      id: 'monthly',
      title: 'Relatório Mensal',
      description: 'Balanço mensal de banco de horas',
      icon: Calendar,
    },
    {
      id: 'employee',
      title: 'Por Colaborador',
      description: 'Histórico individual de ponto',
      icon: FileText,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Relatórios</h1>
        <p className="text-text-secondary">
          Gere relatórios de ponto e banco de horas
        </p>
      </div>

      {/* Report Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.id} className="card-hover">
            <CardContent className="flex items-start gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-purple/10">
                <report.icon className="h-6 w-6 text-accent-purple" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-primary">{report.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {report.description}
                </p>
                <button className="btn-ghost mt-3 text-accent-purple">
                  <Download className="h-4 w-4" />
                  Gerar Relatório
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>Exportação de Dados</CardTitle>
          <CardDescription>
            Os relatórios são gerados em formato CSV para fácil manipulação em
            planilhas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-background-secondary p-4">
            <p className="text-sm text-text-secondary">
              Selecione o período desejado e o tipo de relatório para exportar
              os dados. Os relatórios incluem informações de marcações,
              ocorrências e justificativas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
