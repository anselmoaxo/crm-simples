'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Select } from '@/components/ui/select'
import { PageHeader } from '@/components/layout/page-header'
import { ChartCard } from '@/components/dashboard/chart-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import {
  getResumo,
  getVendasPorPeriodo,
  getDesempenhoVendedores,
  getOrigemClientes,
  getFunil,
} from '@/lib/api/dashboard'
const periodOptions = [
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '365', label: 'Últimos 365 dias' },
]

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function RelatoriosPage() {
  const [period, setPeriod] = useState('30')
  const dias = Number(period)

  const resumoQuery = useQuery({
    queryKey: ['relatorios', 'resumo'],
    queryFn: ({ signal }) => getResumo(signal),
  })

  const vendasQuery = useQuery({
    queryKey: ['relatorios', 'vendas', dias],
    queryFn: ({ signal }) => getVendasPorPeriodo(dias, signal),
  })

  const vendedoresQuery = useQuery({
    queryKey: ['relatorios', 'vendedores'],
    queryFn: ({ signal }) => getDesempenhoVendedores(signal),
  })

  const origensQuery = useQuery({
    queryKey: ['relatorios', 'origens'],
    queryFn: ({ signal }) => getOrigemClientes(signal),
  })

  const funilQuery = useQuery({
    queryKey: ['relatorios', 'funil'],
    queryFn: ({ signal }) => getFunil(signal),
  })

  const queries = [resumoQuery, vendasQuery, vendedoresQuery, origensQuery, funilQuery]
  const resumo = resumoQuery.data
  const vendas = vendasQuery.data
  const vendedores = vendedoresQuery.data
  const origens = origensQuery.data
  const etapas = funilQuery.data ?? []

  const ganhasPerdidas = useMemo(() => {
    if (!resumo) return []
    return [
      { name: 'Ganhas', value: resumo.oportunidades_ganhas },
      { name: 'Perdidas', value: resumo.oportunidades_perdidas },
    ]
  }, [resumo])

  const statsCards = [
    { label: 'Total Clientes', value: resumo?.total_clientes ?? 0, format: false },
    { label: 'Oportunidades Abertas', value: resumo?.oportunidades_abertas ?? 0, format: false },
    { label: 'Valor em Negociação', value: resumo?.valor_em_negociacao ?? 0, format: true },
    { label: 'Valor Ganho Total', value: resumo?.valor_ganho_periodo ?? 0, format: true },
    { label: 'Taxa de Conversão', value: resumo?.taxa_conversao ?? 0, suffix: '%' },
    { label: 'Atividades Vencidas', value: resumo?.atividades_vencidas ?? 0, format: false },
  ]

  if (queries.some((query) => query.isError)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Relatórios" description="Métricas e indicadores do seu negócio" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="mb-4 h-10 w-10 text-destructive" />
            <p className="mb-2 font-medium">Erro ao carregar os relatórios</p>
            <p className="mb-6 text-sm text-muted-foreground">Não foi possível consultar os dados atuais.</p>
            <Button onClick={() => queries.forEach((query) => query.refetch())}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Métricas e indicadores do seu negócio" />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Período das vendas:</span>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} options={periodOptions} className="w-full sm:w-40" />
      </div>

      {queries.some((query) => query.isLoading) ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {statsCards.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stat.format
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(stat.value))
                    : stat.suffix
                      ? `${stat.value}${stat.suffix}`
                      : stat.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <ChartCard title="Vendas por Período" description="Faturamento ao longo do tempo">
          {vendas && vendas.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendas}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="periodo" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="valor_total" fill="#2563eb" radius={[4, 4, 0, 0]} name="Valor" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
          )}
        </ChartCard>

        <ChartCard title="Conversão por Etapa" description="Quantidade por etapa do funil">
          {etapas.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={etapas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="etapa_nome" type="category" className="text-xs" width={100} />
                <Tooltip />
                <Bar dataKey="quantidade" radius={[0, 4, 4, 0]} name="Quantidade">
                  {etapas.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Sem dados</div>
          )}
        </ChartCard>

        <ChartCard title="Desempenho por Vendedor" description="Vendas por membro da equipe">
          {vendedores && vendedores.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendedores}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="usuario_nome" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="valor_ganho" fill="#16a34a" radius={[4, 4, 0, 0]} name="Valor Ganho" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Sem dados</div>
          )}
        </ChartCard>

        <ChartCard title="Oportunidades Ganhas vs Perdidas">
          {ganhasPerdidas.some((g) => g.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={ganhasPerdidas} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                  {ganhasPerdidas.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Sem dados</div>
          )}
        </ChartCard>

        <ChartCard title="Origem dos Clientes">
          {origens && origens.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={origens} cx="50%" cy="50%" outerRadius={100} dataKey="quantidade" nameKey="origem" label>
                  {origens.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Sem dados</div>
          )}
        </ChartCard>

        <ChartCard title="Funil de Vendas" description="Distribuição por etapa">
          {etapas.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={etapas}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="etapa_nome" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="valor_total" radius={[4, 4, 0, 0]} name="Valor Total">
                  {etapas.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">Sem dados</div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
