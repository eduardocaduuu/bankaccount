# Controle de Ponto Sólides

Sistema de controle de ponto e banco de horas integrado com a plataforma Sólides, com notificações via Slack e dashboard web.

## Estrutura do Projeto (Monorepo)

```
controle-ponto-solides/
├── apps/
│   ├── api/           # API Fastify (endpoints, integração Sólides, jobs)
│   ├── slack-bot/     # Bot Slack (Bolt, Socket Mode, notificações)
│   └── web/           # Dashboard Next.js + Tailwind
├── packages/
│   ├── core/          # Regras de cálculo (funções puras, testes)
│   ├── db/            # Prisma schema e cliente
│   └── types/         # Tipos TypeScript compartilhados
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Stack

- **Runtime**: Node.js 20+
- **Package Manager**: pnpm (workspace)
- **Backend**: Fastify
- **Bot Slack**: Bolt (Socket Mode)
- **Frontend**: Next.js 14 + Tailwind CSS
- **Banco de Dados**: PostgreSQL + Prisma
- **Validação**: Zod
- **Jobs**: node-cron
- **Logs**: pino

## Pré-requisitos

- Node.js 20+
- pnpm 8+
- PostgreSQL 14+
- Conta Slack com app configurado (Socket Mode)
- Conta Sólides com API Key

## Instalação

### 1. Clone o repositório

```bash
git clone <repo-url>
cd controle-ponto-solides
```

### 2. Instale as dependências

```bash
pnpm install
```

### 3. Configure as variáveis de ambiente

Copie os arquivos `.env.example` para `.env`:

```bash
# Raiz
cp .env.example .env

# Apps
cp apps/api/.env.example apps/api/.env
cp apps/slack-bot/.env.example apps/slack-bot/.env
cp apps/web/.env.example apps/web/.env
```

### 4. Configure o banco de dados

```bash
# Gere o cliente Prisma
pnpm db:generate

# Execute as migrations
pnpm db:migrate
```

### 5. Inicie o desenvolvimento

```bash
pnpm dev
```

Isso inicia todos os serviços em paralelo:
- API: http://localhost:3001
- Web: http://localhost:3000
- Slack Bot: Socket Mode

## Configuração

### Sólides (apps/api/.env)

```env
SOLIDES_BASE_URL=https://api.solides.com.br
SOLIDES_API_KEY=sua-api-key-solides
SOLIDES_API_KEY_HEADER_NAME=Authorization
SOLIDES_EMPLOYEES_PATH=/v1/employees
SOLIDES_PUNCHES_PATH=/v1/punches
```

Os paths são totalmente configuráveis. Adapte conforme a documentação da API Sólides.

### Slack Bot (apps/slack-bot/.env)

1. Crie um app no [Slack API](https://api.slack.com/apps)
2. Habilite **Socket Mode** nas configurações do app
3. Adicione as seguintes permissões (OAuth & Permissions > Scopes):
   - `chat:write`
   - `im:write`
   - `users:read`
   - `commands` (para slash commands)
4. Instale o app no workspace
5. Copie os tokens:

```env
SLACK_BOT_TOKEN=xoxb-xxx          # OAuth & Permissions > Bot User OAuth Token
SLACK_SIGNING_SECRET=xxx          # Basic Information > Signing Secret
SLACK_APP_TOKEN=xapp-xxx          # Basic Information > App-Level Tokens (connections:write)
```

### Setor → Gestor

1. Acesse o Dashboard Web > Setores
2. Crie ou edite um setor
3. Informe o `managerSlackUserId`:
   - No Slack, clique com botão direito no perfil do gestor
   - Selecione "Copy member ID" (formato: U123ABC456)

### Configuração de Jornada

No arquivo `packages/core/src/calculations.ts`:

```typescript
export const DEFAULT_WORKDAY_CONFIG: WorkdayConfig = {
  expectedStartHour: 8,      // Início esperado: 08:00
  expectedStartMinute: 0,
  expectedEndHour: 18,       // Fim esperado: 18:00
  expectedEndMinute: 0,
  expectedWorkMinutes: 480,  // 8 horas líquidas
  toleranceMinutes: 10,      // Franquia total
  lunchPolicy: {
    startHour: 12,
    startMinute: 0,
    durationMinutes: 120,    // 2 horas de almoço
  },
};
```

## Regra de Tolerância (Franquia Total)

O sistema usa a regra de **franquia total** para tolerância:

- **Atraso**: Entrada até 08:10 = 0 minutos de atraso. Entrada 08:11 = 11 minutos de atraso (não 1).
- **Hora Extra**: Até 8h10 trabalhadas = 0 minutos extra. 8h11 trabalhadas = 11 minutos extra (não 1).

Ou seja, a tolerância é uma "franquia": se estiver dentro dela, o valor é zero. Se ultrapassar, conta o total desde o início.

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/health` | Health check |
| GET | `/sectors` | Listar setores |
| POST | `/sectors` | Criar setor |
| GET | `/employees` | Listar colaboradores |
| POST | `/employees` | Criar colaborador |
| GET | `/occurrences` | Listar ocorrências |
| POST | `/occurrences/:id/ack` | Colaborador confirma |
| POST | `/occurrences/:id/resolve` | Gestor resolve |
| POST | `/justifications` | Criar justificativa |
| POST | `/integrations/solides/test` | Testar conexão Sólides |
| POST | `/integrations/solides/sync` | Sincronizar dados |
| GET | `/dashboard/kpis` | KPIs do dashboard |

Todas as rotas (exceto `/health`) requerem header `x-internal-token`.

## Jobs Automáticos

### API
- **18:30** (dias úteis): Fecha o dia, gera DailyWorklog e Occurrences

### Slack Bot
- **08:20** (dias úteis): Verifica atrasos e envia DM
- **18:05** (dias úteis): Envia resumo do dia com ocorrências pendentes

## Deploy no Render

### 1. Crie um banco PostgreSQL

No Render, crie um novo PostgreSQL e copie a connection string.

### 2. Crie 3 Web Services

#### API Service
- **Name**: controle-ponto-api
- **Root Directory**: apps/api
- **Build Command**: `cd ../.. && pnpm install && pnpm db:generate && cd apps/api && pnpm build`
- **Start Command**: `pnpm start`
- **Environment Variables**:
  ```
  DATABASE_URL=postgresql://...
  API_PORT=3001
  API_INTERNAL_TOKEN=...
  SOLIDES_BASE_URL=...
  SOLIDES_API_KEY=...
  ...
  ```

#### Slack Bot Service
- **Name**: controle-ponto-slack
- **Root Directory**: apps/slack-bot
- **Build Command**: `cd ../.. && pnpm install && cd apps/slack-bot && pnpm build`
- **Start Command**: `pnpm start`
- **Environment Variables**:
  ```
  SLACK_BOT_TOKEN=...
  SLACK_SIGNING_SECRET=...
  SLACK_APP_TOKEN=...
  API_BASE_URL=https://controle-ponto-api.onrender.com
  API_INTERNAL_TOKEN=...
  ```

#### Web Service
- **Name**: controle-ponto-web
- **Root Directory**: apps/web
- **Build Command**: `cd ../.. && pnpm install && cd apps/web && pnpm build`
- **Start Command**: `pnpm start`
- **Environment Variables**:
  ```
  NEXT_PUBLIC_API_URL=https://controle-ponto-api.onrender.com
  API_INTERNAL_TOKEN=...
  ```

## Testes

```bash
# Rodar todos os testes
pnpm test

# Rodar com watch
pnpm test:watch
```

Os testes cobrem as regras de cálculo em `packages/core`:
- Entrada 08:10 → atraso 0
- Entrada 08:11 → atraso 11
- 8h10 trabalhadas → extra 0
- 8h11 trabalhadas → extra 11
- 7h59 trabalhadas → falta 1
- Marcações incompletas → INCOMPLETE
- worked=480 → OK
- worked=500 → OVER

## Scripts Disponíveis

```bash
pnpm dev          # Inicia API + Slack Bot + Web em paralelo
pnpm build        # Build de todos os projetos
pnpm lint         # Lint de todos os projetos
pnpm test         # Testes do packages/core
pnpm db:generate  # Gera cliente Prisma
pnpm db:migrate   # Executa migrations
pnpm db:push      # Push schema para banco
pnpm db:studio    # Abre Prisma Studio
```

## Fluxo de Trabalho

1. **Sincronização**: A API busca marcações do Sólides via `POST /integrations/solides/sync`
2. **Processamento**: Job às 18:30 calcula worklogs e gera ocorrências
3. **Notificação**: Slack bot envia DMs para colaboradores com ocorrências
4. **Justificativa**: Colaborador clica "Explicar" → abre modal → submete
5. **Gestor**: Recebe DM com justificativa → aprova/solicita ajuste
6. **Dashboard**: Visualize KPIs, ocorrências e relatórios

## Licença

MIT
