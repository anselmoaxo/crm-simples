-- READ-ONLY Supabase schema and RLS audit for the CRM.
-- Every executable statement in this file is a SELECT against metadata catalogs.
-- It does not read application rows or display function bodies.

-- 1. Columns, PostgreSQL types, nullability, identity/generated state, and defaults.
SELECT
    'columns' AS report,
    c.table_schema,
    c.table_name,
    c.ordinal_position,
    c.column_name,
    format_type(a.atttypid, a.atttypmod) AS postgres_type,
    c.is_nullable,
    c.is_identity,
    c.identity_generation,
    c.is_generated,
    c.column_default
FROM information_schema.columns AS c
JOIN pg_catalog.pg_namespace AS n
  ON n.nspname = c.table_schema
JOIN pg_catalog.pg_class AS t
  ON t.relnamespace = n.oid
 AND t.relname = c.table_name
JOIN pg_catalog.pg_attribute AS a
  ON a.attrelid = t.oid
 AND a.attname = c.column_name
 AND a.attnum > 0
 AND NOT a.attisdropped
WHERE c.table_schema = 'public'
  AND c.table_name IN (
      'empresas', 'perfis', 'clientes', 'contatos',
      'funis', 'etapas_funil', 'oportunidades', 'atividades'
  )
ORDER BY c.table_name, c.ordinal_position;

-- 2. Primary keys, unique/check constraints, and foreign keys with targets.
SELECT
    'constraints' AS report,
    src_ns.nspname AS table_schema,
    src.relname AS table_name,
    con.conname AS constraint_name,
    CASE con.contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'c' THEN 'CHECK'
        WHEN 'x' THEN 'EXCLUSION'
        ELSE con.contype::text
    END AS constraint_type,
    pg_get_constraintdef(con.oid, true) AS definition,
    target_ns.nspname AS referenced_schema,
    target.relname AS referenced_table,
    con.convalidated AS is_validated
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS src
  ON src.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS src_ns
  ON src_ns.oid = src.relnamespace
LEFT JOIN pg_catalog.pg_class AS target
  ON target.oid = con.confrelid
LEFT JOIN pg_catalog.pg_namespace AS target_ns
  ON target_ns.oid = target.relnamespace
WHERE src_ns.nspname = 'public'
  AND src.relname IN (
      'empresas', 'perfis', 'clientes', 'contatos',
      'funis', 'etapas_funil', 'oportunidades', 'atividades'
  )
ORDER BY src.relname, constraint_type, con.conname;

-- 3. Indexes, indexed columns/expressions, uniqueness, and validity.
SELECT
    'indexes' AS report,
    ns.nspname AS table_schema,
    tbl.relname AS table_name,
    idx.relname AS index_name,
    am.amname AS access_method,
    i.indisprimary AS is_primary,
    i.indisunique AS is_unique,
    i.indisvalid AS is_valid,
    i.indisready AS is_ready,
    pg_get_indexdef(i.indexrelid) AS definition
FROM pg_catalog.pg_index AS i
JOIN pg_catalog.pg_class AS tbl
  ON tbl.oid = i.indrelid
JOIN pg_catalog.pg_namespace AS ns
  ON ns.oid = tbl.relnamespace
JOIN pg_catalog.pg_class AS idx
  ON idx.oid = i.indexrelid
JOIN pg_catalog.pg_am AS am
  ON am.oid = idx.relam
WHERE ns.nspname = 'public'
  AND tbl.relname IN (
      'empresas', 'perfis', 'clientes', 'contatos',
      'funis', 'etapas_funil', 'oportunidades', 'atividades'
  )
ORDER BY tbl.relname, idx.relname;

-- 4. Non-internal triggers and the functions they execute.
SELECT
    'triggers' AS report,
    ns.nspname AS table_schema,
    tbl.relname AS table_name,
    trg.tgname AS trigger_name,
    trg.tgenabled AS enabled_mode,
    CASE
        WHEN (trg.tgtype::integer & 64) <> 0 THEN 'INSTEAD OF'
        WHEN (trg.tgtype::integer & 2) <> 0 THEN 'BEFORE'
        ELSE 'AFTER'
    END AS timing,
    CASE
        WHEN (trg.tgtype::integer & 1) <> 0 THEN 'ROW'
        ELSE 'STATEMENT'
    END AS trigger_level,
    (trg.tgtype::integer & 4) <> 0 AS fires_on_insert,
    (trg.tgtype::integer & 8) <> 0 AS fires_on_delete,
    (trg.tgtype::integer & 16) <> 0 AS fires_on_update,
    (trg.tgtype::integer & 32) <> 0 AS fires_on_truncate,
    fn_ns.nspname AS function_schema,
    fn.proname AS function_name,
    pg_get_function_identity_arguments(fn.oid) AS function_identity_arguments
FROM pg_catalog.pg_trigger AS trg
JOIN pg_catalog.pg_class AS tbl
  ON tbl.oid = trg.tgrelid
JOIN pg_catalog.pg_namespace AS ns
  ON ns.oid = tbl.relnamespace
JOIN pg_catalog.pg_proc AS fn
  ON fn.oid = trg.tgfoid
JOIN pg_catalog.pg_namespace AS fn_ns
  ON fn_ns.oid = fn.pronamespace
WHERE NOT trg.tgisinternal
  AND ns.nspname = 'public'
  AND tbl.relname IN (
      'empresas', 'perfis', 'clientes', 'contatos',
      'funis', 'etapas_funil', 'oportunidades', 'atividades'
  )
ORDER BY tbl.relname, trg.tgname;

-- 5. Public function metadata. Source code is intentionally excluded so this
-- audit cannot reveal values that may have been embedded in a function body.
SELECT
    'functions' AS report,
    ns.nspname AS function_schema,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    pg_get_function_result(p.oid) AS result_type,
    lang.lanname AS language,
    pg_get_userbyid(p.proowner) AS owner,
    p.prosecdef AS security_definer,
    p.proleakproof AS leakproof,
    p.provolatile AS volatility,
    p.proparallel AS parallel_safety
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS ns
  ON ns.oid = p.pronamespace
JOIN pg_catalog.pg_language AS lang
  ON lang.oid = p.prolang
WHERE ns.nspname = 'public'
ORDER BY (p.proname = 'criar_empresa_inicial') DESC,
         p.proname,
         pg_get_function_identity_arguments(p.oid);

-- 6. Explicit/default function EXECUTE privileges, including PUBLIC grants.
SELECT
    'function_privileges' AS report,
    ns.nspname AS function_schema,
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    CASE
        WHEN acl.grantee = 0 THEN 'PUBLIC'
        ELSE pg_get_userbyid(acl.grantee)
    END AS grantee,
    pg_get_userbyid(acl.grantor) AS grantor,
    acl.privilege_type,
    acl.is_grantable
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS ns
  ON ns.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(
    COALESCE(p.proacl, acldefault('f', p.proowner))
) AS acl
WHERE ns.nspname = 'public'
ORDER BY (p.proname = 'criar_empresa_inicial') DESC,
         p.proname,
         identity_arguments,
         grantee;

-- 7. RLS and forced-RLS flags for all eight CRM tables.
SELECT
    'rls_status' AS report,
    ns.nspname AS table_schema,
    cls.relname AS table_name,
    cls.relrowsecurity AS rls_enabled,
    cls.relforcerowsecurity AS rls_forced,
    pg_get_userbyid(cls.relowner) AS owner
FROM pg_catalog.pg_class AS cls
JOIN pg_catalog.pg_namespace AS ns
  ON ns.oid = cls.relnamespace
WHERE ns.nspname = 'public'
  AND cls.relkind IN ('r', 'p')
  AND cls.relname IN (
      'empresas', 'perfis', 'clientes', 'contatos',
      'funis', 'etapas_funil', 'oportunidades', 'atividades'
  )
ORDER BY cls.relname;

-- 8. RLS policies and their role, command, USING, and WITH CHECK expressions.
SELECT
    'rls_policies' AS report,
    schemaname AS table_schema,
    tablename AS table_name,
    policyname AS policy_name,
    permissive,
    roles,
    cmd AS command,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
      'empresas', 'perfis', 'clientes', 'contatos',
      'funis', 'etapas_funil', 'oportunidades', 'atividades'
  )
ORDER BY tablename, policyname;

-- 9. Table grants, including grants to PUBLIC and Supabase roles.
SELECT
    'table_grants' AS report,
    ns.nspname AS table_schema,
    cls.relname AS table_name,
    CASE
        WHEN acl.grantee = 0 THEN 'PUBLIC'
        ELSE pg_get_userbyid(acl.grantee)
    END AS grantee,
    pg_get_userbyid(acl.grantor) AS grantor,
    acl.privilege_type,
    acl.is_grantable
FROM pg_catalog.pg_class AS cls
JOIN pg_catalog.pg_namespace AS ns
  ON ns.oid = cls.relnamespace
CROSS JOIN LATERAL aclexplode(
    COALESCE(cls.relacl, acldefault('r', cls.relowner))
) AS acl
WHERE ns.nspname = 'public'
  AND cls.relkind IN ('r', 'p')
  AND cls.relname IN (
      'empresas', 'perfis', 'clientes', 'contatos',
      'funis', 'etapas_funil', 'oportunidades', 'atividades'
  )
ORDER BY cls.relname, grantee, acl.privilege_type;

-- Column-specific grants. No row means the column has no separate ACL.
SELECT
    'column_grants' AS report,
    ns.nspname AS table_schema,
    cls.relname AS table_name,
    attr.attname AS column_name,
    CASE
        WHEN acl.grantee = 0 THEN 'PUBLIC'
        ELSE pg_get_userbyid(acl.grantee)
    END AS grantee,
    pg_get_userbyid(acl.grantor) AS grantor,
    acl.privilege_type,
    acl.is_grantable
FROM pg_catalog.pg_attribute AS attr
JOIN pg_catalog.pg_class AS cls
  ON cls.oid = attr.attrelid
JOIN pg_catalog.pg_namespace AS ns
  ON ns.oid = cls.relnamespace
CROSS JOIN LATERAL aclexplode(attr.attacl) AS acl
WHERE ns.nspname = 'public'
  AND cls.relkind IN ('r', 'p')
  AND attr.attnum > 0
  AND NOT attr.attisdropped
  AND cls.relname IN (
      'empresas', 'perfis', 'clientes', 'contatos',
      'funis', 'etapas_funil', 'oportunidades', 'atividades'
  )
ORDER BY cls.relname, attr.attnum, grantee, acl.privilege_type;

-- 10. responsavel_id presence and exact FK target for every CRM table.
-- A NULL constraint/target identifies a missing column or missing FK.
SELECT
    'responsavel_id_fk_targets' AS report,
    crm.table_name,
    col.column_name,
    format_type(attr.atttypid, attr.atttypmod) AS column_type,
    con.conname AS fk_constraint_name,
    target_ns.nspname AS referenced_schema,
    target.relname AS referenced_table,
    target_attr.attname AS referenced_column,
    CASE con.confupdtype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS on_update,
    CASE con.confdeltype
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'd' THEN 'SET DEFAULT'
    END AS on_delete
FROM (
    SELECT 'empresas' AS table_name
    UNION ALL SELECT 'perfis'
    UNION ALL SELECT 'clientes'
    UNION ALL SELECT 'contatos'
    UNION ALL SELECT 'funis'
    UNION ALL SELECT 'etapas_funil'
    UNION ALL SELECT 'oportunidades'
    UNION ALL SELECT 'atividades'
) AS crm
LEFT JOIN information_schema.columns AS col
  ON col.table_schema = 'public'
 AND col.table_name = crm.table_name
 AND col.column_name = 'responsavel_id'
LEFT JOIN pg_catalog.pg_namespace AS src_ns
  ON src_ns.nspname = col.table_schema
LEFT JOIN pg_catalog.pg_class AS src
  ON src.relnamespace = src_ns.oid
 AND src.relname = col.table_name
LEFT JOIN pg_catalog.pg_attribute AS attr
  ON attr.attrelid = src.oid
 AND attr.attname = col.column_name
 AND attr.attnum > 0
 AND NOT attr.attisdropped
LEFT JOIN pg_catalog.pg_constraint AS con
  ON con.conrelid = src.oid
 AND con.contype = 'f'
 AND attr.attnum = ANY (con.conkey)
LEFT JOIN LATERAL generate_subscripts(con.conkey, 1) AS key_pos(position)
  ON con.conkey[key_pos.position] = attr.attnum
LEFT JOIN pg_catalog.pg_class AS target
  ON target.oid = con.confrelid
LEFT JOIN pg_catalog.pg_namespace AS target_ns
  ON target_ns.oid = target.relnamespace
LEFT JOIN pg_catalog.pg_attribute AS target_attr
  ON target_attr.attrelid = target.oid
 AND target_attr.attnum = con.confkey[key_pos.position]
ORDER BY crm.table_name, con.conname;
