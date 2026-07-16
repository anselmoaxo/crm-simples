---
title: "CRM Simples"
subtitle: "Manual Técnico e Operacional"
author: "Anselmotech"
date: "16 de julho de 2026"
lang: pt-BR
fontsize: 10pt
documentclass: article
papersize: a4
header-includes:
  - |
    ```{=latex}
    \usepackage{float}
    \floatplacement{figure}{H}
    ```
---

# Controle do documento

| Item | Valor |
|---|---|
| Sistema | CRM Simples |
| Tipo | Manual técnico, operacional e de testes |
| Versão do documento | 1.0 |
| Data da validação | 16/07/2026 |
| Ambiente validado | Desenvolvimento integrado à homologação |
| Frontend | Next.js 16.2.10 e React 19.2.4 |
| Backend | FastAPI e Python 3.10.12 |

Este manual orienta instalação, execução, uso, teste e diagnóstico do CRM. Use sempre uma base de homologação para treinamento e testes. Nunca use clientes reais, senhas ou tokens em evidências e capturas.

# Visão geral

O CRM Simples centraliza:

- clientes e contatos;
- oportunidades em funil de vendas;
- atividades comerciais;
- indicadores e relatórios;
- equipe e perfis de acesso;
- configuração das etapas do funil.

O sistema é multiempresa. A API obtém a empresa pelo perfil autenticado e as tabelas devem possuir políticas RLS no Supabase.

## Arquitetura

```text
Navegador
   |
   v
Next.js :3000 ---- Supabase Auth
   |
   | Authorization: Bearer <token>
   v
FastAPI :8000 ---- Supabase/PostgreSQL com RLS
```

## Perfis

| Função | ADMIN | GERENTE | VENDEDOR |
|---|:---:|:---:|:---:|
| Dashboard | Sim | Sim | Sim |
| Clientes | Sim | Sim | Sim |
| Oportunidades | Sim | Sim | Sim |
| Atividades | Sim | Sim | Sim |
| Equipe | Sim | Sim | Não |
| Relatórios | Sim | Sim | Não |
| Configurar etapas do funil | Sim | Não | Não |
| Configurações | Sim | Não | Não |

Importante: no contrato atual, os perfis operacionais conseguem trabalhar com os registros comerciais da empresa, sem filtro automático pelo responsável. Confirme se essa é a regra desejada antes da produção.

# Preparação técnica

## Requisitos

- Node.js 20.9 ou superior; Node.js 22 é recomendado.
- npm.
- Python 3.10 ou superior.
- Docker para containers e geração deste PDF.
- Projeto Supabase de homologação configurado.

Verifique as versões:

```bash
python3 --version
node --version
npm --version
docker --version
```

## Variáveis de ambiente

Crie os arquivos a partir dos modelos:

```bash
cd /home/anselmo/crm_anselmotech
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
cp .env.example .env
```

Arquivos e finalidade:

| Arquivo | Finalidade |
|---|---|
| `frontend/.env.local` | Supabase público e URL da API para execução local |
| `backend/.env` | Configuração da API, Supabase, JWT e CORS |
| `.env` | Argumentos públicos usados pelo Compose no build do frontend |

Valores mínimos do frontend:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Valores mínimos do backend:

```env
APP_ENV=development
API_PREFIX=/api/v1
DEBUG=true
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
SUPABASE_JWT_ISSUER=https://seu-projeto.supabase.co/auth/v1
CORS_ORIGINS=http://localhost:3000
```

Nunca coloque `SUPABASE_SERVICE_ROLE_KEY` no frontend. Não versione arquivos `.env`.

## Supabase Auth

No projeto de homologação, configure:

```text
Site URL: http://localhost:3000
Redirect URLs:
  http://localhost:3000/**
  http://localhost:3000/auth/callback
  http://localhost:3000/redefinir-senha
```

Configure também um SMTP de teste para confirmação de conta e recuperação de senha.

# Instalação

## Backend

```bash
cd /home/anselmo/crm_anselmotech/backend
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install -e ".[dev]"
```

## Frontend

```bash
cd /home/anselmo/crm_anselmotech/frontend
npm ci
```

Use `npm ci` para uma instalação reproduzível baseada no lockfile.

# Execução

## Execução local recomendada

Na raiz:

```bash
cd /home/anselmo/crm_anselmotech
npm run dev
```

Serviços esperados:

| Serviço | Endereço |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:8000` |
| Health check | `http://localhost:8000/health` |
| Swagger, com `DEBUG=true` | `http://localhost:8000/api/v1/docs` |

Para executar em terminais separados:

```bash
npm run dev:backend
npm run dev:frontend
```

Interrompa com `Ctrl+C` no terminal que iniciou os serviços.

## Execução com Docker

Confirme antes que `.env` na raiz e `backend/.env` existem.

Com Compose v2:

```bash
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

Em hosts antigos com Compose v1, substitua `docker compose` por `docker-compose`.

Encerramento:

```bash
docker compose down
```

# Operação do sistema

## Acesso

1. Abra `http://localhost:3000/login`.
2. Informe e-mail e senha.
3. Clique em **Entrar**.
4. No primeiro acesso, conclua o onboarding da empresa.

![Tela de login](docs/assets/01-login.png){ width=55% }

Para recuperar acesso, clique em **Esqueci minha senha**, informe o e-mail e use o link recebido. Links expirados devem ser solicitados novamente.

## Cadastro e onboarding

1. Na tela de login, clique em **Criar conta**.
2. Informe nome, e-mail e uma senha com maiúscula, minúscula e número.
3. Aceite os termos e envie o cadastro.
4. Confirme o e-mail quando o Supabase exigir.
5. No onboarding, informe nome do usuário e nome da empresa.
6. Confirme a criação e aguarde o dashboard.

![Tela de cadastro](docs/assets/00-cadastro.png){ width=55% }

O primeiro perfil e o funil inicial são criados pela função `criar_empresa_inicial`. O onboarding deve ser idempotente.

## Dashboard

O dashboard exibe clientes, oportunidades abertas, valor em negociação, vendas ganhas, conversão e atividades atrasadas. Também apresenta funil, vendas, origem de clientes, atividades pendentes e desempenho de vendedores.

Se aparecer **Erro ao carregar dados**, confirme primeiro o health check e clique em **Tentar novamente**.

Observação: as ações rápidas para novo cliente, nova oportunidade e nova atividade apontam atualmente para rotas que precisam de correção. Até isso ser resolvido, use o menu lateral e o botão **Novo** da página correspondente.

## Clientes

### Criar cliente

1. Abra **Clientes**.
2. Clique em **Novo Cliente**.
3. Escolha pessoa física ou jurídica.
4. Preencha nome e dados comerciais.
5. Para pessoa jurídica, informe nome fantasia e CNPJ quando disponíveis.
6. Clique em **Salvar**.

CPF e CNPJ podem ser digitados com máscara. E-mail, telefone, WhatsApp, cidade, UF, origem e observações são opcionais conforme o formulário.

### Consultar e atualizar

1. Use a busca por nome ou os filtros de situação, origem e UF.
2. Clique em uma linha para abrir os detalhes.
3. Use o ícone de edição para alterar os dados.
4. Confirme a gravação.

### Contatos do cliente

1. Abra o cliente.
2. Selecione a aba **Contatos**.
3. Clique em **Novo Contato**.
4. Informe nome, cargo e canais de contato.
5. Salve.

As abas seguintes mostram oportunidades e atividades associadas ao cliente.

### Excluir

Use o ícone de lixeira e confirme. Antes de excluir um cliente com registros associados, confirme em homologação o comportamento das chaves estrangeiras e preserve os dados necessários.

## Oportunidades

### Criar

1. Abra **Oportunidades**.
2. Selecione o funil.
3. Clique em **Nova Oportunidade**.
4. Informe título, cliente, contato, etapa, valor e previsão.
5. Salve.

### Movimentar no Kanban

1. Arraste o cartão para a etapa desejada.
2. Ao mover para **Ganha**, o sistema registra a conclusão.
3. Ao mover para **Perdida**, informe obrigatoriamente o motivo.
4. Para reabrir, mova para uma etapa aberta.

Prefira o Kanban para marcar uma perda. O formulário direto não possui campo para o motivo exigido pelo backend.

Use o botão de visualização para alternar entre Kanban e lista. A edição está disponível na visão em lista.

## Atividades

Tipos disponíveis: tarefa, ligação, reunião, e-mail, WhatsApp e anotação.

### Criar

1. Abra **Atividades**.
2. Clique em **Nova Atividade**.
3. Escolha o tipo e informe o título.
4. Vincule cliente e oportunidade quando necessário.
5. Defina data e horário.
6. Salve.

### Acompanhar

- Use os filtros de tipo, situação e data.
- Clique em concluir para finalizar uma atividade.
- Use reabrir quando precisar retomá-la.
- Use editar ou excluir conforme necessário.

O atalho de nova atividade a partir do detalhe do cliente ainda não preenche automaticamente o cliente. Selecione-o manualmente no formulário.

## Relatórios

Disponível para `ADMIN` e `GERENTE`.

1. Abra **Relatórios**.
2. Selecione 30, 90 ou 365 dias.
3. Analise vendas, conversão por etapa, vendedores, ganhos e perdas, origens e funil.

Somente o gráfico de vendas responde atualmente ao seletor de período. Não há exportação de arquivo implementada.

## Equipe

Disponível para `ADMIN` e `GERENTE`.

- Pesquise por nome.
- Filtre por perfil e situação.
- O gerente consulta a equipe.
- O administrador pode editar o nome pela interface atual.

Não existe fluxo de convite ou inclusão de novo membro na interface. Defina um procedimento administrativo antes da entrada em produção.

## Configuração do funil

Disponível para `ADMIN`.

1. Abra **Funil de Vendas**.
2. Adicione uma etapa ou edite nome, cor, probabilidade e tipo.
3. Arraste etapas para alterar a ordem.
4. Salve as alterações.

Uma etapa com oportunidades vinculadas não pode ser excluída. Mova as oportunidades antes. A interface configura etapas do funil existente, mas não cria novos funis.

## Configurações gerais

A tela mostra empresa, plano, usuário, e-mail e perfil. Com `DEBUG=true`, o administrador pode gerar clientes fictícios para homologação. Esse recurso deve retornar `403` em produção e nunca deve ser usado com dados reais.

# Testes e critérios de aprovação

## Backend

```bash
cd /home/anselmo/crm_anselmotech/backend
python3 -m ruff check .
python3 -m pytest tests -q
```

## Frontend

```bash
cd /home/anselmo/crm_anselmotech/frontend
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

## Smoke tests

```bash
curl --fail --silent --show-error http://localhost:8000/health
curl --fail --silent --show-error http://localhost:3000/login
curl --fail --silent --show-error http://localhost:8000/api/v1/openapi.json
```

## Roteiro integrado obrigatório

Execute em homologação:

1. Cadastro, confirmação de e-mail, login, logout e recuperação de senha.
2. Onboarding e repetição segura da chamada.
3. CRUD de clientes e contatos.
4. CRUD de oportunidades e transições aberta, ganha e perdida.
5. CRUD, conclusão e reabertura dos seis tipos de atividade.
6. Reconciliação dos totais do dashboard com dados conhecidos.
7. Acesso de `ADMIN`, `GERENTE`, `VENDEDOR` e usuário inativo.
8. Tentativas diretas à API para confirmar permissões.
9. Isolamento entre duas empresas usando IDs conhecidos.
10. Uso em 320, 768, 1024 e 1440 pixels e navegação por teclado.

## Isolamento multiempresa

Este é um teste bloqueador:

1. Crie registros na empresa A.
2. Autentique um usuário da empresa B.
3. Tente consultar, alterar e excluir os IDs da empresa A.
4. Espere `403` ou `404`, sem revelar dados.
5. Confirme que listagens e indicadores não misturam empresas.

Execute `supabase/audit_schema_rls.sql` no SQL Editor e confirme que ele contém apenas `SELECT`. O arquivo `fix_auth_function_grants.sql` altera permissões e só deve ser executado quando o erro documentado ocorrer e houver autorização operacional.

# Resultado da validação de 16/07/2026

| Verificação | Resultado |
|---|---|
| Ruff backend | Aprovado, sem violações |
| Pytest backend | Aprovado, 64 testes |
| ESLint frontend | Aprovado |
| TypeScript `tsc --noEmit` | Aprovado |
| Vitest frontend | Aprovado, 26 testes em 7 arquivos |
| Build Next.js | Aprovado, 20 páginas geradas |
| Health check API | Aprovado, HTTP 200 |
| Página de login | Aprovado, HTTP 200 |
| Swagger/OpenAPI em desenvolvimento | Aprovado, HTTP 200 |
| `docker-compose config` | Parcial: arquivo `.env` da raiz ausente |
| Imagem Docker backend | Aprovada |
| Imagem Docker frontend | Reprovada: variáveis públicas vazias no build |
| Auditoria npm de produção | Duas vulnerabilidades moderadas no PostCSS do Next.js |
| Auditoria RLS no painel Supabase | Exige execução manual no SQL Editor |

Avisos observados:

- seis avisos de depreciação do cliente Supabase durante os testes backend;
- Node.js 20 será descontinuado por versões futuras de `supabase-js`; atualizar para Node.js 22;
- o host possui `docker-compose` 1.29.2, mas não possui o subcomando Compose v2;
- a correção automática sugerida pelo npm faria uma alteração incompatível do Next.js e não foi aplicada.

# Limitações conhecidas

- Ações rápidas do dashboard usam rotas inconsistentes.
- Atividade iniciada pelo cliente não preserva o cliente selecionado.
- Pesquisa global e sino de notificações são apenas visuais.
- Não existe convite de membros pela interface.
- A interface não administra integralmente perfil e status da equipe.
- Não existe exportação de relatórios.
- A configuração administra etapas, mas não o objeto funil completo.
- Os testes automatizados não exercitam RLS e schema reais.
- Não existe suíte E2E permanente no projeto.
- O health check não verifica conectividade com o Supabase.

Essas limitações devem ser tratadas ou formalmente aceitas antes da produção.

# Solução de problemas

## Sistema não inicia

- Confirme `frontend/.env.local` e `backend/.env`.
- Verifique se as portas estão livres com `ss -tlnp`.
- Confirme as versões de Node.js e Python.

## Login retorna erro de permissão

Se a API registrar `permission denied for function empresa_atual_id`, revise e execute `supabase/fix_auth_function_grants.sql` no projeto correto. O script concede `EXECUTE` e modifica permissões.

## Respostas 401

- Confirme URL e chave publicável do Supabase.
- Faça logout e login novamente.
- Verifique expiração e renovação da sessão.

## E-mail não chega

- Confira SMTP e logs do Supabase Auth.
- Confira Site URL e Redirect URLs.
- Verifique spam e bloqueios do provedor.

## Swagger retorna 404

É esperado com `DEBUG=false`. Use Swagger somente em ambiente controlado.

## Docker sem variáveis públicas

Crie `.env` na raiz a partir de `.env.example`. O arquivo `backend/.env` não alimenta os argumentos de build do frontend.

# Operação em produção

1. Defina `APP_ENV=production` e `DEBUG=false`.
2. Use HTTPS no frontend, API e Supabase.
3. Restrinja `CORS_ORIGINS` ao domínio oficial.
4. Configure URLs oficiais no Supabase Auth.
5. Mantenha SMTP transacional e backups.
6. Monitore `/health`, erros da aplicação e disponibilidade do Supabase.
7. Use reinicialização automática dos containers.
8. Revogue acessos de usuários desligados.
9. Execute testes de restauração de backup periodicamente.
10. Nunca registre tokens, senhas ou dados pessoais em tickets e logs.

# Geração deste PDF

A fonte editável está em `docs/manual-operacional.md`. Gere o PDF com:

```bash
cd /home/anselmo/crm_anselmotech
bash scripts/build-manual.sh
```

Valide:

```bash
file docs/manual-operacional.pdf
sha256sum -c docs/manual-operacional.pdf.sha256
```

Ao alterar telas, processos ou requisitos, atualize o Markdown, refaça as capturas, gere novamente o PDF e incremente a versão do documento.
