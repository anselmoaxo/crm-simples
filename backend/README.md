# CRM Simples API

Backend do CRM Simples utilizando FastAPI e Supabase.

## Requisitos

- Python 3.12+
- Conta no Supabase

## Instalação

```bash
pip install -e .
```

## Configuração

Copie `.env.example` para `.env` e preencha as variáveis:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
SUPABASE_JWT_ISSUER=https://seu-projeto.supabase.co/auth/v1
```

## Execução local

```bash
uvicorn app.main:app --reload
```

## Execução com Docker

```bash
docker compose up --build
```

## Testes

```bash
pytest
```

## Lint

```bash
ruff check .
```

## Estrutura do projeto

```
backend/
├── app/
│   ├── main.py
│   ├── core/          # Configurações, segurança, exceções, logs
│   ├── api/
│   │   ├── dependencies.py
│   │   └── routes/    # Endpoints HTTP
│   ├── schemas/       # Validação Pydantic
│   ├── repositories/  # Acesso a dados
│   ├── services/      # Regras de negócio
│   └── utils/         # Utilitários
├── tests/
├── Dockerfile
├── docker-compose.yml
└── pyproject.toml
```

## Autenticação

O frontend envia o token JWT no header:

```
Authorization: Bearer <access_token>
```

## Endpoints principais

- `GET /health` - Health check
- `POST /api/v1/auth/onboarding` - Criar empresa inicial
- `GET /api/v1/auth/me` - Dados do usuário logado
- CRUD completo para clientes, contatos, funis, oportunidades e atividades
- `GET /api/v1/dashboard/*` - Relatórios e indicadores
