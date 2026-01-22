# Integração Tangerino/Sólides - READ-ONLY

## Aviso Importante

**Esta integração é SOMENTE LEITURA (READ-ONLY).**

- O sistema **NÃO altera** o ponto oficial dos colaboradores
- O sistema **NÃO envia** dados para o Tangerino/Sólides
- O ponto oficial **continua sendo** o do Tangerino/Sólides
- Este sistema é **apenas para análise interna** de banco de horas

---

## Arquitetura de Segurança

### Proteções Implementadas

1. **Apenas método GET permitido**
   - Todas as requisições para o Tangerino usam exclusivamente GET
   - Tentativas de usar POST/PUT/PATCH/DELETE são bloqueadas automaticamente

2. **Endpoints proibidos**
   - URLs contendo palavras-chave como `adjustment`, `record`, `insert`, `update`, `delete`, `justify`, `manual`, `correction` são bloqueadas

3. **Sem body nas requisições**
   - Requisições nunca incluem body, garantindo que nenhum dado seja enviado

4. **Logs claros**
   - Todos os logs indicam `[READ-ONLY]` para auditoria

---

## Configuração

### Variáveis de Ambiente

```env
# Base URL da API Tangerino
SOLIDES_BASE_URL=https://apis.tangerino.com.br

# API Key (somente leitura)
SOLIDES_API_KEY=sua-api-key-aqui

# Header de autenticação (sem Bearer)
SOLIDES_API_KEY_HEADER_NAME=Authorization

# Endpoints de consulta
SOLIDES_EMPLOYEES_PATH=/v1/employees
SOLIDES_PUNCHES_PATH=/v1/punches
```

---

## Endpoints Disponíveis

### POST /integrations/solides/test
Testa a conexão com o Tangerino (executa um GET simples).

**Resposta:**
```json
{
  "success": true,
  "message": "Conexão com Tangerino estabelecida com sucesso (somente leitura)",
  "mode": "READ-ONLY",
  "warning": "Esta integração apenas consulta dados. Nenhuma alteração é enviada para o Tangerino."
}
```

### POST /integrations/solides/sync?start=YYYY-MM-DD&end=YYYY-MM-DD
Sincroniza dados DO Tangerino PARA o banco local.

**Parâmetros:**
- `start`: Data inicial (formato YYYY-MM-DD)
- `end`: Data final (formato YYYY-MM-DD)

**Resposta:**
```json
{
  "success": true,
  "data": {
    "employeesSynced": 80,
    "punchesSynced": 1500,
    "worklogsGenerated": 400,
    "occurrencesGenerated": 25
  },
  "message": "Sincronização concluída (somente leitura)",
  "mode": "READ-ONLY",
  "warning": "Dados foram apenas consultados e salvos localmente. Nenhuma alteração foi enviada para o Tangerino."
}
```

### GET /integrations/solides/config
Retorna a configuração atual (sem expor API key).

### GET /integrations/solides/status
Retorna o status e capacidades da integração.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "mode": "READ-ONLY",
    "description": "Integração somente leitura com Tangerino/Sólides",
    "capabilities": {
      "readEmployees": true,
      "readPunches": true,
      "writeEmployees": false,
      "writePunches": false,
      "adjustPunches": false,
      "deletePunches": false
    },
    "allowedHttpMethods": ["GET"],
    "blockedHttpMethods": ["POST", "PUT", "PATCH", "DELETE"]
  }
}
```

---

## Fluxo de Dados

```
┌─────────────────┐     GET only      ┌──────────────────┐
│   Tangerino     │ ───────────────→  │  Sistema Local   │
│   (Oficial)     │                   │  (Análise)       │
│                 │                   │                  │
│  - Funcionários │  Consulta         │  - Funcionários  │
│  - Marcações    │  (read-only)      │  - Marcações     │
│  - Ponto        │                   │  - Worklogs      │
│                 │                   │  - Ocorrências   │
│                 │   ✗ BLOQUEADO ✗   │  - Banco horas   │
│                 │ ←───────────────  │                  │
└─────────────────┘   Nunca envia     └──────────────────┘
```

---

## O que este sistema FAZ:

- Consulta lista de funcionários do Tangerino
- Consulta marcações de ponto do Tangerino
- Salva dados em banco de dados local (PostgreSQL)
- Calcula horas trabalhadas, atrasos, horas extras
- Gera ocorrências para análise
- Permite justificativas internas
- Notifica via Slack

---

## O que este sistema NÃO FAZ:

- **NÃO** cria marcações de ponto no Tangerino
- **NÃO** edita marcações de ponto no Tangerino
- **NÃO** exclui marcações de ponto no Tangerino
- **NÃO** ajusta ponto no Tangerino
- **NÃO** justifica ponto no Tangerino
- **NÃO** envia qualquer dado para o Tangerino
- **NÃO** substitui o ponto oficial

---

## Auditoria e Logs

Todos os logs da integração incluem o prefixo `[READ-ONLY]` para facilitar auditoria:

```
[READ-ONLY] Iniciando sincronização - Dados serão APENAS consultados do Tangerino
[READ-ONLY] Funcionários consultados do Tangerino - Salvando localmente
[READ-ONLY] Marcações sincronizadas - Dados salvos apenas localmente
[READ-ONLY] CONFIRMAÇÃO: Nenhuma alteração foi enviada para o Tangerino
```

---

## Segurança - Proteções no Código

### Validação de Método HTTP
```typescript
private validateMethod(method: string): asserts method is AllowedMethod {
  if (!ALLOWED_HTTP_METHODS.includes(method as AllowedMethod)) {
    throw new Error(`Método HTTP "${method}" BLOQUEADO. Esta integração é READ-ONLY.`);
  }
}
```

### Validação de Endpoint
```typescript
const FORBIDDEN_ENDPOINT_KEYWORDS = [
  'adjustment', 'record', 'insert', 'update', 'delete',
  'justify', 'manual', 'correction', 'edit', 'create'
];
```

### Métodos de Escrita Bloqueados
```typescript
async createPunch(): Promise<never> {
  throw new Error('Método createPunch BLOQUEADO. Esta integração é READ-ONLY.');
}
```

---

## Contato

Em caso de dúvidas sobre a integração, entre em contato com a equipe de desenvolvimento.
