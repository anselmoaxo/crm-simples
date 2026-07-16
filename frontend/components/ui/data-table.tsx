'use client'

import { useState, useMemo, useCallback } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { Button } from '@/components/ui/button'

export interface Column<T> {
  key: string
  header: string
  accessor: (item: T) => React.ReactNode
  sortable?: boolean
  sortKey?: string
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  initialSortKey?: string
  initialSortDirection?: 'asc' | 'desc'
  emptyMessage?: string
  onRowClick?: (item: T) => void
  rowKey: (item: T) => string | number
}

function DataTable<T extends object>({
  columns,
  data,
  pageSize = 10,
  initialSortKey,
  initialSortDirection = 'asc',
  emptyMessage = 'No results found.',
  onRowClick,
  rowKey,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(initialSortKey)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection)
  const [currentPage, setCurrentPage] = useState(1)

  const handleSort = useCallback(
    (column: Column<T>) => {
      const key = column.sortKey ?? column.key
      if (sortKey === key) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortKey(key)
        setSortDirection('asc')
      }
      setCurrentPage(1)
    },
    [sortKey],
  )

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey]
      const bVal = (b as Record<string, unknown>)[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal)
      const bStr = String(bVal)
      return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }, [data, sortKey, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, safeCurrentPage, pageSize])

  return (
    <div className="space-y-4">
      <div className="min-w-0 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                const sortKey_ = col.sortKey ?? col.key
                const isSorted = sortKey === sortKey_
                const SortIcon = isSorted
                  ? sortDirection === 'asc'
                    ? ArrowUp
                    : ArrowDown
                  : ArrowUpDown

                return (
                  <TableHead
                    key={col.key}
                    className={cn(col.headerClassName)}
                  >
                    {col.sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          '-ml-3 h-8 data-[state=open]:bg-accent',
                          isSorted && 'text-foreground',
                        )}
                        onClick={() => handleSort(col)}
                      >
                        {col.header}
                        <SortIcon className={cn('ml-2 h-4 w-4', isSorted ? 'opacity-100' : 'opacity-30')} />
                      </Button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  key={rowKey(item)}
                  className={cn(onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.accessor(item)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  )
}

export { DataTable }
export type { DataTableProps }
