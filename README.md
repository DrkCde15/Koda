# Koda

<p align="center">
  <img src="frontend/public/logo.png" alt="Koda" />
</p>

Uma plataforma de produtividade moderna inspirada na experiência do Notion: workspaces, páginas, blocos, tarefas, arquivos e busca, com fundamentos 
prontos para recursos de Inteligência Artificial.

Desenvolvida incrementalmente, com foco em estabilidade, qualidade e
escalabilidade.

---

## Stack

| Camada        | Tecnologias                                                        |
| ------------- | ----------------------------------------------------------------- |
| Frontend      | React, TypeScript, Vite, TailwindCSS, React Router, Axios, TanStack Query, React Hook Form, Zustand |
| Backend       | Python, Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Migrate, Flask-CORS, Marshmallow, Gunicorn, Flask-Limiter, python-json-logger, flask-swagger-ui |
| Editor        | TipTap (rich-text + nós customizados: subpágina, tabela, imagem, arquivo, toggle, colunas, callout, link de página) + slash menu |
| Banco         | PostgreSQL (com fallback automático para SQLite em dev)          |
| Cache         | Redis                                                             |
| Autenticação  | JWT Access + Refresh Token (com revogação via Redis)             |
| Containerização | Docker, Docker Compose                                         |

## Funcionalidades de Segurança e Qualidade

### Rate Limiting
- Proteção contra abuso e ataques de força bruta com Flask-Limiter
- Limites configuráveis por endpoint (login, registro, recuperação de senha)
- Suporte a Redis para contadores distribuídos (fallback para memória)
- Configuração via variáveis de ambiente (`RATE_LIMIT_LOGIN`, `RATE_LIMIT_REGISTER`)

### Logging Estruturado
- Logs em formato JSON para produção (facilita integração com ELK, Datadog, etc.)
- Formato legível para desenvolvimento
- Configuração via `LOG_FORMAT` (`json` ou `text`)
- Inclusão automática de request ID para rastreamento

### Documentação da API
- Interface Swagger/OpenAPI disponível em `/api/docs`
- Especificação completa dos endpoints, parâmetros e respostas
- Acessível apenas em ambiente de desenvolvimento (`FLASK_ENV=development`)

### Variáveis de Ambiente
- Todas as configurações sensíveis via arquivo `.env` (não versionado)
- Arquivo `.env.example` fornecido como template
- Validação de variáveis obrigatórias no startup

### Testes e Cobertura
- Testes automatizados com pytest
- Cobertura de código configurada (mínimo 70%)
- Relatórios em terminal e HTML
- Execução: `cd backend && pytest --cov`

## Arquitetura

O backend segue arquitetura em camadas (separação de responsabilidades):

```
backend/
  app/<feature>/routes.py   -> camada de controlador (HTTP, validação, respostas)
  services/<feature>.py     -> regras de negócio
  repositories/<feature>.py -> acesso a dados (SQLAlchemy)
  schemas/<feature>.py      -> validação de entrada (Marshmallow)
  models/                   -> ORM (SQLAlchemy)
  extensions/               -> db, migrate, jwt, cors, redis
  config/                   -> configuração por ambiente
  middlewares/              -> respostas padronizadas, erros, permissões, JWT
  migrations/               -> migrações (Flask-Migrate / Alembic)

frontend/
  src/
    components/ layouts/ pages/  -> UI
    services/                    -> chamadas à API
    store/                       -> Zustand (auth, tema)
    contexts/                    -> Toast (feedback), Dialog (modais)
    components/editorNodes.tsx   -> nós customizados do TipTap (subpágina, tabela, imagem, arquivo, link de página)
    components/editorBlocks.tsx  -> blocos customizados (toggle, colunas, callout)
    components/SlashMenu.tsx     -> menu de inserção via "/" no editor
    components/KanbanBoard.tsx   -> visão Quadro dos bancos de dados
    components/RowDetailModal.tsx-> detalhes de um item do banco (modal)
    components/DatabaseCells.tsx -> células editáveis do grid
    components/CommandPalette.tsx-> busca global e ações (Ctrl+K)
    components/Sidebar.tsx       -> sidebar em árvore com seções colapsáveis
    store/                       -> Zustand (auth, tema, UI/sidebar)
    hooks/ types/ utils/ lib/    -> suporte
  public/
    logo.png                     -> logotipo da marca
```

A logotipo (`public/logo.png`) é exibida no `AuthLayout` (telas de
login/registro), no cabeçalho do `AppLayout` (sidebar) e como favicon na
aba do navegador (`index.html`).

Princípios aplicados: SOLID, DRY, KISS, Clean Code e Separation of Concerns.

### Backend serve o frontend (SPA)

O build do frontend (`frontend/dist`) é servido pelo próprio backend Flask
(rota catch-all com fallback para `index.html`; requisições a `/api/*`
inexistentes retornam 404 em JSON). Por isso não há um serviço `frontend`
separado no Docker — o `backend/Dockerfile` é multi-stage: builda o frontend e
copia o `dist` para dentro da imagem do backend. O caminho pode ser ajustado via
`FRONTEND_DIST` (padrão `../frontend/dist`).

### Banco: PostgreSQL com fallback SQLite

Em produção/Docker, defina `DATABASE_URL` para usar PostgreSQL. Em
desenvolvimento local, se `DATABASE_URL` não estiver definido, o backend usa
automaticamente um arquivo SQLite (`backend/koda.db`), permitindo rodar sem
um servidor de banco separado.

## Padrão de resposta da API

Sucesso:
```json
{ "success": true, "message": "...", "data": {} }
```

Erro:
```json
{ "success": false, "message": "...", "errors": [] }
```

## Como executar (Docker)

1. Copie o arquivo de exemplo de variáveis de ambiente:
```bash
cp .env.example .env
# Gere chaves seguras para produção:
openssl rand -hex 32  # use a saída para SECRET_KEY e JWT_SECRET_KEY
```

2. Suba os containers:
```bash
docker compose up --build   # builda e sobe tudo (modo foreground)
docker compose up -d        # sobe tudo em segundo plano
docker compose down         # para e remove os containers
docker compose logs -f backend   # acompanha os logs do backend
```

- Aplicação (frontend + API): http://localhost:5000 — o backend serve a SPA
- Documentação da API: http://localhost:5000/api/docs (apenas desenvolvimento)
- PostgreSQL: 5432 · Redis (Koda): 6381 (interno 6379)
- PostgreSQL e Redis sobem como serviços dependentes.
- Não há serviço `frontend` separado: o build é embutido na imagem do backend.
- **Nunca commite o arquivo `.env`** — ele está no `.gitignore`

As migrações do banco são aplicadas automaticamente no entrypoint do backend
(`flask db upgrade`) após o PostgreSQL ficar disponível.

## Desenvolvimento local (sem Docker)

Pré-requisitos: Python 3.11+, Node.js 18+, PostgreSQL e Redis instalados
na máquina (sem containers).

### 1. Suba PostgreSQL e Redis nativamente

Ubuntu/WSL:
```bash
sudo apt update
sudo apt install -y postgresql redis-server

# PostgreSQL
sudo service postgresql start
sudo -u postgres psql -c "CREATE USER koda WITH PASSWORD 'koda' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE koda OWNER koda;"

# Redis
sudo service redis-server start
```

macOS (Homebrew):
```bash
brew install postgresql redis
brew services start postgresql
brew services start redis
createdb koda  # ou: createuser -s koda; createdb koda
```

> Observação: o Redis do Koda usa a porta `6379` localmente. Se essa porta já
> estiver ocupada por outro processo, ajuste `REDIS_URL` abaixo.

### Redis é opcional (modo degradado)

O Redis é usado para revogação de token (logout) e recuperação de senha.
Se ele não estiver disponível no startup, o backend sobe normalmente em
**modo degradado**:

- `revogação de token / logout` fica desabilitada (tokens permanecem válidos
  até expirar);
- `recuperação de senha` fica desabilitada;
- todo o resto (auth, workspaces, páginas, blocos, busca, arquivos) funciona
  normalmente.

Basta não informar/iniciar o Redis ou apontar `REDIS_URL` para um serviço
inexistente. Um aviso é logado no startup indicando o modo degradado.

### 2. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# DATABASE_URL é opcional: sem ele, usa SQLite (backend/koda.db) automaticamente
export DATABASE_URL=postgresql://koda:koda@localhost:5432/koda
export REDIS_URL=redis://localhost:6379/0
export SECRET_KEY=dev-secret
export JWT_SECRET_KEY=dev-jwt-secret
export FLASK_ENV=development
export LOG_FORMAT=text
export RATE_LIMIT_LOGIN=5 per minute
export RATE_LIMIT_REGISTER=3 per hour
flask db upgrade
flask --app app:app run
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

- Backend: http://localhost:5000
- Frontend (Vite): http://localhost:5173

## Testes

```bash
cd backend && pytest
# Com relatório de cobertura:
cd backend && pytest --cov
# Gerar relatório HTML:
cd backend && pytest --cov --cov-report=html
```

## Funcionalidades

### Autenticação
- Cadastro, Login, Logout (revogação de token)
- Refresh Token (renovação automática no frontend)
- Alteração e recuperação de senha
- Perfil do usuário
- Proteção de rotas (frontend e backend)
- **E-mail transacional real** para convites e recuperação de senha (via Google Apps Script)

### Workspaces
- Criar / editar / excluir (via modais estilizados)
- Convites por email (token): criar, listar pendentes e revogar
- Papéis: `owner`, `admin`, `editor`, `viewer`
- Gestão de membros na UI: nomes reais, troca de papel e remoção
- Permissões por papel (visualização, edição, gerência)

### Páginas
- Título, ícone e capa (definidos na criação)
- Subpáginas (auto-relacionamento) com botão "Voltar" para a página pai
- Favoritos
- Lixeira (soft delete) e restauração
- Histórico de revisões (com registro de quem editou)

### Editor de conteúdo (TipTap)
- Editor rich-text que consome/gera os blocos da API
- **Slash menu** (`/` no início de um bloco): inserção rápida de 19 tipos de
  bloco, emojis (grade de 48), tabelas, subpáginas, imagens e arquivos, tudo
  no ponto do cursor
- Blocos tipados: parágrafo, títulos, listas, citação, código, divisor
- **Blocos extras** (inspirados no AppFlowy):
  - **Toggle** — bloco recolhível (detalhes/sumário) com aninhamento
  - **Colunas** — 2 ou 3 colunas para layouts de página
  - **Callout** — destaque com ícone configurável
- **Conteúdo embutido no texto** (nós customizados):
  - **Subpáginas** — cria página filha e insere link navegável
  - **Link de página** — atalho para qualquer página existente do workspace
  - **Tabelas** — embute um banco de dados do workspace (novo ou existente)
  - **Imagens** — upload pelo botão ou colando com **Ctrl+V** (exibidas inline)
  - **Arquivos** — anexo com download; o botão detecta imagens automaticamente

### Bancos de dados e Tarefas
- Bancos de dados relacionais por workspace (propriedades tipadas)
- Itens (linhas) com valores por propriedade; CRUD completo na UI
- Preset de Tarefas (título, status, data, responsável)
- **Visão Tabela (Grid)** com filtros e ordenação por propriedade
  (backend: `GET /databases/:id?filter=...&sort=...`; operadores: contains,
  equals, not equals, vazio/não vazio, maior/menor, antes/depois)
- **Visão Quadro (Kanban)** com drag & drop entre colunas, cores por rótulo
  e agrupamento por qualquer propriedade select/status
- **Detalhes da linha** em modal com edição de todos os campos

### Arquivos
- Upload com validação de tipo/tamanho e metadados persistidos
- Listagem, download autenticado (blob) e exclusão na UI
- Serviço de download protegido por workspace

### Busca
- Busca de páginas por título/conteúdo dentro de um workspace
- **Command palette** (`Ctrl+K` ou `Ctrl+P`): busca global entre workspaces
  e ações rápidas (nova página, novo banco, tema, perfil)

### Interface
- Tema claro/escuro
- Modais estilizados para prompts/confirmações (sem diálogos nativos do navegador)
- Campo de senha com botão de exibir/ocultar
- Code splitting das rotas (lazy loading) para carregamento mais rápido
- **Sidebar em árvore** com seções colapsáveis (Favoritos, Páginas, Workspaces),
  subpáginas aninhadas com expandir/recolher e atalho ＋ para criar (estado
  persistido no navegador)

### Atalhos de teclado
| Atalho | Ação |
| ------ | ---- |
| `Ctrl+K` / `Ctrl+P` | Abrir command palette |
| `Ctrl+N` | Nova página |
| `Ctrl+Shift+L` | Alternar tema claro/escuro |
| `Ctrl+\` | Recolher/expandir sidebar |

## Notificações em tempo real (SSE)

Notificações são entregues em tempo real via **Server-Sent Events**, sem
precisar de polling:

- **Menções** (`@Nome` no editor de páginas — digite `@` para autocompletar
  com os membros do workspace) — notificação `mention`, criadas via
  `POST /api/pages/<id>/mentions`
- **Convites de workspace** — notificação `invite` para o usuário convidado
  (quando ele já tem conta) e `invite_accepted` para o dono do workspace
  quando o convite é aceito

Endpoint: `GET /api/notifications/stream` (JWT obrigatório no header
`Authorization` — por isso o cliente usa `fetch` + `ReadableStream` em vez de
`EventSource`). Eventos emitidos: `connected` ao abrir a conexão,
`notification` (payload JSON da notificação) a cada nova notificação e
heartbeats `: ping` a cada `SSE_HEARTBEAT_SECONDS` (padrão 15s).

No frontend, `useRealtimeNotifications` (hook) mantém a conexão com
reconexão exponencial (1s → 30s), atualiza o contador do sino e exibe um
toast a cada notificação.

> **Limitação (multi-worker):** o broker de notificações é em memória
> (`services/notification_broker.py`), ou seja, cada processo Gunicorn só
> entrega eventos publicados nele próprio. Para rodar com vários workers,
> substitua o broker por pub/sub do Redis. Em dev (1 processo) funciona
> integralmente.

## E-mail transacional (Google Apps Script)

O backend envia e-mails reais de convite e recuperação de senha via um Google
Apps Script publicado como web app (usa `MailApp`/`GmailApp`). Configure no `.env`:

```bash
EMAIL_PROVIDER=google_script
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/SEU_ID/exec
GOOGLE_SCRIPT_SECRET=seu_segredo
EMAIL_REMETENTE=no-reply@koda.app
EMAIL_FROM_NAME=Koda
FRONTEND_URL=http://localhost   # base dos links de reset/convite
```

O payload POSTado é JSON: `{ secret, to, subject, html, text, fromEmail, fromName }`.
Se `GOOGLE_SCRIPT_URL` estiver vazio, o app roda em **modo degradado** (o e-mail é
ignorado com um aviso no log, sem quebrar o fluxo).

## Próximos passos (roadmap)

### Em andamento
- Recursos de Inteligência Artificial (geração de conteúdo, resumo, busca semântica)

### Melhorias sugeridas (pós-implementação)
- **CI/CD**: Pipeline de testes automatizados (GitHub Actions/GitLab CI)
- **Monitoramento**: Integração com Prometheus/Grafana para métricas de performance
- **Colaboração em tempo real**: WebSockets para edição simultânea de páginas
- **Backup automático**: Snapshots periódicos do banco de dados
- **Mobile app**: Aplicativo nativo para iOS/Android
- **Internacionalização**: Suporte a múltiplos idiomas (i18n)
