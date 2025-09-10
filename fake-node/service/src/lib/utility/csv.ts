type RowData = Record<string, any>

export function arrayToCsv(data: RowData[]): string {
  if (data.length === 0) return ''

  // 열 헤더 생성 (키 값 추출)
  const headers = Object.keys(data[0])

  // 데이터 변환
  const csvRows = data.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(','))

  // CSV 문자열 생성
  return [headers.join(','), ...csvRows].join('\n')
}
