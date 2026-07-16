export interface PaginatedResponse<T> {
  data: T[]
  total: number
  pagina: number
  por_pagina: number
  total_paginas: number
}

export async function fetchAllPages<T>(
  fetchPage: (pagina: number, porPagina: number) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  const porPagina = 100
  const firstPage = await fetchPage(1, porPagina)
  const data = [...firstPage.data]

  for (let pagina = 2; pagina <= firstPage.total_paginas; pagina += 1) {
    const response = await fetchPage(pagina, porPagina)
    data.push(...response.data)
  }

  return data
}
