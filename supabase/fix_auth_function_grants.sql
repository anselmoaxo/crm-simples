-- Correção específica para o erro PostgreSQL 42501:
-- "permission denied for function empresa_atual_id".
--
-- Execute no Supabase SQL Editor como administrador do projeto.
-- O bloco não altera tabelas nem dados. Ele localiza as funções em qualquer
-- schema de aplicação e concede ao papel `authenticated` somente USAGE no
-- schema e EXECUTE nas funções auxiliares de autenticação já existentes.

do $$
declare
  function_record record;
begin
  for function_record in
    select
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as identity_arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname not in ('pg_catalog', 'information_schema')
      and n.nspname not like 'pg_toast%'
      and p.proname in ('empresa_atual_id', 'criar_empresa_inicial')
  loop
    execute format(
      'grant usage on schema %I to authenticated',
      function_record.schema_name
    );
    execute format(
      'grant execute on function %I.%I(%s) to authenticated',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );
  end loop;
end
$$;

-- Confirma as funções encontradas e as permissões após a execução.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  has_schema_privilege('authenticated', n.nspname, 'USAGE') as schema_usage,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not in ('pg_catalog', 'information_schema')
  and p.proname in ('empresa_atual_id', 'criar_empresa_inicial')
order by schema_name, function_name;
