'use client'

import { useQuery } from '@tanstack/react-query'
import { Users, Target, DollarSign, Trophy, TrendingUp, AlertTriangle, ListTodo, UserPlus, FileBarChart, Plus } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/dashboard/stat-card'
import { FunilChart } from '@/components/dashboard/funil-chart'
import { VendasChart } from '@/components/dashboard/vendas-chart'
import { VendedoresChart } from '@/components/dashboard/vendedores-chart'
import { OrigemChart } from '@/components/dashboard/origem-chart'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters'
import {
  getResumo,
  getFunil,
  getVendasPorPeriodo,
  getAtividadesPendentes,
  getDesempenhoVendedores,
  getOrigemClientes,
} from '@/lib/api/dashboard'

const tipoAtividadeLabel: Record<string, string> = {
  TAREFA: 'Tarefa',
  LIGACAO: 'Ligação',
  REUNIAO: 'Reunião',
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
  ANOTACAO: 'Anotação',
}

const tipoAtividadeColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  TAREFA: 'default',
  LIGACAO: 'secondary',
  REUNIAO: 'secondary',
  EMAIL: 'outline',
  WHATSAPP: 'outline',
  ANOTACAO: 'secondary',
}

export default function DashboardPage() {
  const resumoQuery = useQuery({
    queryKey: ['dashboard', 'resumo'],
    queryFn: ({ signal }) => getResumo(signal),
  })

  const funilQuery = useQuery({
    queryKey: ['dashboard', 'funil'],
    queryFn: ({ signal }) => getFunil(signal),
  })

  const vendasQuery = useQuery({
    queryKey: ['dashboard', 'vendas-periodo'],
    queryFn: ({ signal }) => getVendasPorPeriodo(30, signal),
  })

  const atividadesQuery = useQuery({
    queryKey: ['dashboard', 'atividades-pendentes'],
    queryFn: ({ signal }) => getAtividadesPendentes(signal),
  })

  const vendedoresQuery = useQuery({
    queryKey: ['dashboard', 'desempenho-vendedores'],
    queryFn: ({ signal }) => getDesempenhoVendedores(signal),
  })

  const origemQuery = useQuery({
    queryKey: ['dashboard', 'origem-clientes'],
    queryFn: ({ signal }) => getOrigemClientes(signal),
  })

  const queries = [resumoQuery, funilQuery, vendasQuery, atividadesQuery, vendedoresQuery, origemQuery]
  const anyLoading = queries.some((q) => q.isLoading)
  const anyError = queries.some((q) => q.isError)
  const hasData = queries.every((q) => q.data !== undefined)

  function handleRetryAll() {
    queries.forEach((q) => q.refetch())
  }

  if (anyLoading) {
    return <DashboardSkeleton />
  }

  if (anyError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description="Visão geral do seu negócio"
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium mb-2">Erro ao carregar dados</p>
            <p className="text-sm text-muted-foreground mb-6">
              Não foi possível carregar as informações do dashboard.
            </p>
            <Button onClick={handleRetryAll} variant="default">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasData) return null

  const resumo = resumoQuery.data!

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu negócio"
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total de Clientes"
          value={String(resumo.total_clientes)}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Oportunidades Abertas"
          value={String(resumo.oportunidades_abertas)}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          title="Valor em Negociação"
          value={formatCurrency(resumo.valor_em_negociacao)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Vendas Ganhas"
          value={String(resumo.oportunidades_ganhas)}
          icon={<Trophy className="h-5 w-5" />}
        />
        <StatCard
          title="Taxa de Conversão"
          value={formatPercent(resumo.taxa_conversao)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Atividades Atrasadas"
          value={String(resumo.atividades_vencidas)}
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={resumo.atividades_vencidas > 0 ? { value: resumo.atividades_vencidas, positive: false } : undefined}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-1">
          <FunilChart data={funilQuery.data ?? []} />
        </div>
        <div className="xl:col-span-2">
          <VendasChart data={vendasQuery.data ?? []} />
        </div>
        <div className="xl:col-span-1">
          <OrigemChart data={origemQuery.data ?? []} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Atividades Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Atividades Pendentes</CardTitle>
            <Link
              href="/atividades"
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 px-3"
            >
              <ListTodo className="h-4 w-4" />
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            {atividadesQuery.data && atividadesQuery.data.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {atividadesQuery.data.slice(0, 10).map((atividade) => (
                    <div
                      key={atividade.id}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={tipoAtividadeColor[atividade.tipo] ?? 'default'}
                            className="shrink-0"
                          >
                            {tipoAtividadeLabel[atividade.tipo] ?? atividade.tipo}
                          </Badge>
                          <Badge variant={atividade.em_atraso ? 'destructive' : 'secondary'} className="shrink-0">
                            {atividade.em_atraso ? 'Atrasada' : 'Pendente'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium truncate">{atividade.titulo}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {atividade.cliente_nome && (
                            <span>{atividade.cliente_nome}</span>
                          )}
                          {atividade.data_prevista && (
                            <>
                              <span>•</span>
                              <span>
                                {formatDate(atividade.data_prevista)}
                                {atividade.hora_prevista ? ` às ${atividade.hora_prevista.slice(0, 5)}` : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Nenhuma atividade pendente
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + Vendedores */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  href="/clientes/novo"
                  className="flex items-center gap-3 rounded-lg border border-input bg-background p-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <UserPlus className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Novo Cliente</p>
                    <p className="text-xs text-muted-foreground">Adicionar cliente</p>
                  </div>
                </Link>
                <Link
                  href="/oportunidades/nova"
                  className="flex items-center gap-3 rounded-lg border border-input bg-background p-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Target className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Nova Oportunidade</p>
                    <p className="text-xs text-muted-foreground">Registrar oportunidade</p>
                  </div>
                </Link>
                <Link
                  href="/atividades/nova"
                  className="flex items-center gap-3 rounded-lg border border-input bg-background p-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Nova Atividade</p>
                    <p className="text-xs text-muted-foreground">Criar tarefa ou evento</p>
                  </div>
                </Link>
                <Link
                  href="/relatorios"
                  className="flex items-center gap-3 rounded-lg border border-input bg-background p-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <FileBarChart className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="text-left">
                    <p className="text-sm font-medium">Relatórios</p>
                    <p className="text-xs text-muted-foreground">Exportar dados</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          <VendedoresChart data={vendedoresQuery.data ?? []} />
        </div>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu negócio"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className={i === 1 ? 'xl:col-span-2' : ''}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[260px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[260px] w-full" />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[260px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
