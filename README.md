# CRM Simples

CRM completo para pequenas equipes de vendas: clientes, contatos, funil de
oportunidades (Kanban), atividades e dashboard com indicadores em tempo real.
Multiempresa com isolamento por RLS no Supabase.

## Arquitetura

```text
frontend/   Next.js (App Router) + React + TypeScript + Tailwind + shadcn/ui
backend/    FastAPI + Pydantic (API REST em /api/v1)
supabase/   Scripts de auditoria e correção (somente leitura/grants)
scripts/    Automação de desenvolvimento local
```

- **Autenticação**: Supabase Auth (JWT). O frontend envia o `access_token` no
  header `Authorization: Bearer` e o backend valida o token no Supabase.
- **Isolamento por empresa**: o `empresa_id` vem sempre do perfil do usuário
  autenticado (tabela `perfis`), nunca do frontend. Todas as consultas filtram
  por `empresa_id` e as tabelas possuem políticas RLS no PostgreSQL.
- **Permissões**: `ADMIN`, `GERENTE` e `VENDEDOR`, validadas no backend
  (dependências `require_admin`/`require_gerente`) e refletidas na interface.

## Tecnologias

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui,
  TanStack Query, React Hook Form, Zod, dnd-kit, Recharts, Supabase Auth
- **Backend**: Python, FastAPI, Pydantic, Supabase, PostgreSQL, Pytest, Ruff
- **Infra**: Supabase (Auth + PostgreSQL), Docker, SMTP personalizado

## Requisitos

- Node.js 20.9 ou superior (Node.js 22 recomendado)
- npm
- Python 3.10 ou superior
- Docker (opcional, para execução em containers)

## Variáveis de ambiente

Nunca versione arquivos `.env`; use os `.env.example` como modelo.

`frontend/.env.local` (copie de `frontend/.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

`backend/.env` (copie de `backend/.env.example`):

```env
APP_ENV=development
APP_NAME=CRM Simples API
API_PREFIX=/api/v1
DEBUG=true
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_ISSUER=https://seu-projeto.supabase.co/auth/v1
CORS_ORIGINS=http://localhost:3000
```

- A chave `service_role` **nunca** é usada no frontend e pode permanecer vazia
  para o fluxo normal da aplicação.
- `DEBUG=false` (padrão quando ausente) desativa o Swagger e o OpenAPI.
- Em produção, ajuste `CORS_ORIGINS` para o domínio oficial.

`.env` na raiz (copie de `.env.example`): usado apenas pelo
`docker-compose.yml` para os build args do frontend.

## Supabase

O projeto Supabase `crm_simples` contém as tabelas `empresas`, `perfis`,
`clientes`, `contatos`, `funis`, `etapas_funil`, `oportunidades` e
`atividades`, todas com RLS e isolamento por empresa, além da função RPC
`criar_empresa_inicial(nome_empresa, nome_usuario)` usada no onboarding.

Configuração de autenticação (homologação):

```text
Site URL: http://localhost:3000
Redirect URLs:
  http://localhost:3000/**
  http://localhost:3000/auth/callback
  http://localhost:3000/redefinir-senha
```

Em produção, substitua pelo domínio oficial e mantenha apenas as URLs
necessárias.

Antes de criar migrações, execute a auditoria somente leitura
`supabase/audit_schema_rls.sql` no SQL Editor (instruções em
`supabase/README.md`). Se o login registrar
`permission denied for function empresa_atual_id`, execute
`supabase/fix_auth_function_grants.sql`.

## SMTP

Os e-mails transacionais (confirmação de cadastro, recuperação de senha,
alteração de e-mail, convites) são enviados pelo Supabase Auth. Configure o
SMTP personalizado em **Authentication → Emails → SMTP Settings** no painel do
Supabase. Nunca exponha ou versione a senha SMTP; os templates devem usar
`{{ .ConfirmationURL }}` nos links.

## Instalação

```bash
cd frontend
npm install

cd ../backend
python3 -m pip install -e ".[dev]"
```

## Execução local

Na raiz do projeto:

```bash
npm run dev
```

Esse comando inicia simultaneamente:

```text
Frontend:      http://localhost:3000
Backend:       http://localhost:8000
Documentação:  http://localhost:8000/api/v1/docs (somente com DEBUG=true)
Health check:  http://localhost:8000/health
```

Para executar separadamente, use `npm run dev:backend` e `npm run dev:frontend`
em dois terminais.

## Execução com Docker

Copie `.env.example` para `.env` na raiz (build args do frontend) e garanta que
`backend/.env` exista. Depois:

```bash
docker compose config   # valida a configuração
docker compose build
docker compose up
```

- Frontend na porta `3000`, backend na porta `8000`.
- As imagens executam com usuário não root e possuem health check.
- Nenhuma credencial é copiada para as imagens (`.dockerignore` exclui `.env`).

## Testes, lint e build

Backend:

```bash
cd backend
python3 -m ruff check .
python3 -m pytest tests -q
```

Frontend:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Ou tudo de uma vez na raiz: `npm test && npm run build`.

## Dados de demonstração

Com `DEBUG=true` e perfil `ADMIN`, o botão **Gerar clientes de teste** em
Configurações cria clientes fictícios identificados com origem `DADOS_TESTE` e
sufixo “(Teste)”. O endpoint é bloqueado quando `DEBUG=false`, portanto nunca
roda em produção. Os registros podem ser removidos pela própria listagem de
clientes e respeitam a empresa do usuário autenticado.

## Publicação

1. Configure os segredos na plataforma (EasyPanel, Vercel ou similar); nunca em
   Git, Dockerfile ou código.
2. Backend: `APP_ENV=production`, `DEBUG=false`, `CORS_ORIGINS` com o domínio
   oficial (HTTPS).
3. Frontend: `NEXT_PUBLIC_API_URL` apontando para a API pública (HTTPS).
4. Supabase: atualize Site URL e Redirect URLs para o domínio oficial e
   configure o SMTP transacional.
5. Ative reinicialização automática (`restart: unless-stopped`), monitore o
   `/health` e mantenha backups do banco no Supabase.

## Solução de problemas

- **Portas ocupadas**: `ss -tlnp | grep -E ':3000|:8000'`.
- **`permission denied for function empresa_atual_id`**: execute
  `supabase/fix_auth_function_grants.sql` no SQL Editor.
- **401 constante no frontend**: confira `NEXT_PUBLIC_SUPABASE_URL` e a chave
  publicável; a sessão é renovada automaticamente e, se falhar, o usuário é
  redirecionado ao login.
- **E-mails não chegam**: verifique o SMTP no Supabase e as Redirect URLs;
  confira a pasta de spam.
- **Docs 404**: comportamento esperado com `DEBUG=false`.
