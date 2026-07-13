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
| Backend       | Python, Flask, Flask-SQLAlchemy, Flask-JWT-Extended, Flask-Migrate, Flask-CORS, Marshmallow, Gunicorn |
| Banco         | PostgreSQL                                                        |
| Cache         | Redis                                                             |
| Autenticação  | JWT Access + Refresh Token (com revogação via Redis)             |
| Containerização | Docker, Docker Compose                                         |

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
    store/                       -> Zustand (auth)
    contexts/                    -> Toast (feedback)
    hooks/ types/ utils/ lib/    -> suporte
  public/
    logo.png                     -> logotipo da marca
```

A logotipo (`public/logo.png`) é exibida no `AuthLayout` (telas de
login/registro), no cabeçalho do `AppLayout` (sidebar) e como favicon na
aba do navegador (`index.html`).

Princípios aplicados: SOLID, DRY, KISS, Clean Code e Separation of Concerns.

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

```bash
docker compose up --build   # builda e sobe tudo (modo foreground)
docker compose up -d        # sobe tudo em segundo plano
docker compose down         # para e remove os containers
docker compose logs -f backend   # acompanha os logs do backend
```

- Frontend: http://localhost
- Backend (API): http://localhost:5000
- PostgreSQL: 5432 · Redis (Koda): 6381 (interno 6379)
- PostgreSQL e Redis sobem como serviços dependentes.

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
export DATABASE_URL=postgresql://koda:koda@localhost:5432/koda
export REDIS_URL=redis://localhost:6379/0
export SECRET_KEY=dev-secret
export JWT_SECRET_KEY=dev-jwt-secret
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
```

## Funcionalidades

### Autenticação
- Cadastro, Login, Logout (revogação de token)
- Refresh Token (renovação automática no frontend)
- Alteração e recuperação de senha
- Perfil do usuário
- Proteção de rotas (frontend e backend)

### Workspaces
- Criar / editar / excluir
- Convites por email (token)
- Papéis: `owner`, `admin`, `editor`, `viewer`
- Permissões por papel (visualização, edição, gerência)

### Páginas
- Título, ícone, conteúdo (estrutura pronta para o editor)
- Subpáginas (auto-relacionamento)
- Favoritos
- Lixeira (soft delete) e restauração
- Histórico de revisões

### Blocos (estrutura do editor)
- Blocos tipados (parágrafo, títulos, listas, citação, código, etc.)
- Aninháveis, prontos para o editor rico futuro

### Arquivos
- Upload com validação de tipo/tamanho e metadados persistidos
- Serviço de download protegido por workspace

### Busca
- Busca de páginas por título/conteúdo dentro de um workspace

## Próximos passos (roadmap)
- Editor rich-text completo consumindo a estrutura de blocos
- Tarefas e bancos de dados relacionais
- Recursos de Inteligência Artificial (geração de conteúdo, resumo, busca semântica)
- E-mail transacional real para convites/recuperação de senha
