'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import type { DesempenhoVendedor } from '@/lib/api/dashboard'

interface VendedoresChartProps {
  data: DesempenhoVendedor[]
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899']

export function VendedoresChart({ data }: VendedoresChartProps) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desempenho de Vendedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">Desempenho de Vendedores</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 12, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis
              type="category"
              dataKey="usuario_nome"
              tick={{ fontSize: 12 }}
              width={80}
            />
            <Tooltip
              formatter={(value, name) => {
                const num = Number(value)
                if (name === 'valor_ganho') return [formatCurrency(num), 'Valor ganho']
                return [num, name === 'oportunidades_ganhas' ? 'Ganhas' : 'Oportunidades']
              }}
            />
            <Bar dataKey="oportunidades_ganhas" name="Ganhas" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
