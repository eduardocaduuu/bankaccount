'use client';

import { useState } from 'react';
import { Save, RefreshCw, CheckCircle, XCircle, Plug } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/Card';
import { Badge } from '@/components/Badge';

export default function SettingsPage() {
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    employeesSynced?: number;
    punchesSynced?: number;
  } | null>(null);

  const [settings, setSettings] = useState({
    toleranceMinutes: '10',
    expectedStartTime: '08:00',
    expectedEndTime: '18:00',
    lunchDurationMinutes: '120',
  });

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const response = await fetch('/api/integrations/solides/test', {
        method: 'POST',
      });

      if (response.ok) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      setConnectionStatus('error');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    const today = new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(
        `/api/integrations/solides/sync?start=${today}&end=${today}`,
        { method: 'POST' }
      );

      const data = await response.json();
      if (data.success) {
        setSyncResult(data.data);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>
        <p className="text-text-secondary">
          Configure o sistema de controle de ponto
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sólides Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Integração Sólides
            </CardTitle>
            <CardDescription>
              Configuração da conexão com a API do Sólides
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-background-secondary p-4">
              <div>
                <p className="font-medium text-text-primary">Status da Conexão</p>
                <p className="text-sm text-text-tertiary">
                  Teste a conectividade com a API
                </p>
              </div>
              <div className="flex items-center gap-3">
                {connectionStatus === 'success' && (
                  <Badge variant="green">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Conectado
                  </Badge>
                )}
                {connectionStatus === 'error' && (
                  <Badge variant="red">
                    <XCircle className="mr-1 h-3 w-3" />
                    Erro
                  </Badge>
                )}
                <button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="btn-secondary"
                >
                  {testingConnection ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'Testar'
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-background-secondary p-4">
              <div>
                <p className="font-medium text-text-primary">Sincronização</p>
                <p className="text-sm text-text-tertiary">
                  Sincronizar dados de hoje
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="btn-primary"
              >
                {syncing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sincronizar
                  </>
                )}
              </button>
            </div>

            {syncResult && (
              <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 p-4">
                <p className="text-sm text-accent-green">
                  Sincronização concluída!
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {syncResult.employeesSynced} colaborador(es),{' '}
                  {syncResult.punchesSynced} marcação(ões)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Jornada</CardTitle>
            <CardDescription>
              Defina os parâmetros de horário e tolerância
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">
                Tolerância (minutos)
              </label>
              <input
                type="number"
                value={settings.toleranceMinutes}
                onChange={(e) =>
                  setSettings({ ...settings, toleranceMinutes: e.target.value })
                }
                className="input"
              />
              <p className="mt-1 text-xs text-text-tertiary">
                Franquia total: até este valor = 0, após = total
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">
                  Horário Início
                </label>
                <input
                  type="time"
                  value={settings.expectedStartTime}
                  onChange={(e) =>
                    setSettings({ ...settings, expectedStartTime: e.target.value })
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">
                  Horário Fim
                </label>
                <input
                  type="time"
                  value={settings.expectedEndTime}
                  onChange={(e) =>
                    setSettings({ ...settings, expectedEndTime: e.target.value })
                  }
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-text-secondary">
                Almoço (minutos)
              </label>
              <input
                type="number"
                value={settings.lunchDurationMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lunchDurationMinutes: e.target.value,
                  })
                }
                className="input"
              />
            </div>

            <button className="btn-primary w-full">
              <Save className="h-4 w-4" />
              Salvar Configurações
            </button>
          </CardContent>
        </Card>

        {/* Slack Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Configurações do Slack</CardTitle>
            <CardDescription>
              Mapeamento de setores para gestores no Slack
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-background-secondary p-4">
              <p className="text-sm text-text-secondary">
                O mapeamento de gestores é feito através da tela de Setores.
                Cada setor deve ter um <code className="text-accent-purple">managerSlackUserId</code> configurado
                para receber as notificações de justificativas.
              </p>
              <p className="mt-2 text-sm text-text-tertiary">
                Para encontrar o Slack User ID, clique com o botão direito no perfil
                do usuário no Slack e selecione &quot;Copy member ID&quot;.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
