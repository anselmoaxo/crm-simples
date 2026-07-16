# Auditoria Supabase

## Correção de permissão para login/onboarding

Se a API registrar `permission denied for function empresa_atual_id`, execute
primeiro `fix_auth_function_grants.sql` no SQL Editor. O script concede somente
`EXECUTE` ao papel `authenticated` nas funções `empresa_atual_id` e
`criar_empresa_inicial`; ele não altera tabelas ou dados.

O arquivo `audit_schema_rls.sql` coleta somente metadados do PostgreSQL para
confirmar o schema, relacionamentos, funções, permissões e configuração de RLS
das oito tabelas do CRM. Ele não consulta linhas das tabelas da aplicação, não
exibe o corpo das funções e não contém instruções destrutivas ou de alteração.

## Como executar

1. Abra o projeto correto no painel do Supabase.
2. Acesse **SQL Editor** e crie uma nova consulta.
3. Cole o conteúdo completo de `supabase/audit_schema_rls.sql`.
4. Confirme antes de executar que o conteúdo possui apenas consultas `SELECT`.
5. Clique em **Run**. O editor mostrará um conjunto de resultados para cada
   consulta do arquivo.

Não adicione nem execute `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `TRUNCATE`,
`ALTER`, `DROP`, `CREATE`, `GRANT`, `REVOKE` ou qualquer outra instrução que
possa modificar o banco. A auditoria deve permanecer estritamente somente para
leitura.

## Salvar e compartilhar os resultados

No painel de resultados de cada consulta, use a opção de exportação do SQL
Editor para baixar o resultado, preferencialmente em CSV. Nomeie os arquivos
com o número e o nome do relatório, por exemplo `01_columns.csv` e
`10_responsavel_id_fk_targets.csv`.

Se a interface exibir apenas o resultado da última consulta, execute os blocos
`SELECT` individualmente e exporte cada conjunto antes de seguir para o próximo.
Também é possível salvar a consulta no SQL Editor para repetir a auditoria,
desde que ela continue contendo somente os `SELECT` originais.

Antes de compartilhar, revise os arquivos. O script não lê dados de clientes,
credenciais, tokens, chaves ou corpos de funções; compartilhe apenas os
resultados de metadados gerados por esta auditoria. Não inclua capturas de tela
ou exportações de outras áreas do painel que possam mostrar segredos.

Os resultados serão usados para desenhar as migrações necessárias. Nenhuma
migração deve ser aplicada até que os relatórios tenham sido analisados.
