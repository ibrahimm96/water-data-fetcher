import type { Key } from 'react'
import type { ChartTabContentProps } from './ChartTab'

type DataTableProps = {
  data: NonNullable<ChartTabContentProps['chartData']>['data']
  unit: string | null
}

export function DataTable({ data, unit }: DataTableProps) {
  return (
    <div style={{ maxHeight: '100%', overflowY: 'auto' }}>
      <div style={{
        fontWeight: '600',
        fontSize: '13.5px',
        marginBottom: '8px',
        borderBottom: '1px solid #ddd',
        paddingBottom: '4px'
      }}>
        Measurement Table
      </div>
      <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th style={{ padding: '4px 8px' }}>Date</th>
            <th style={{ padding: '4px 8px' }}>Value {unit ? `(${unit})` : ''}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row: { date: string | number | Date; value: number }, idx: Key | null | undefined) => (
            <tr key={idx}>
              <td style={{ padding: '4px 8px', color: '#2c3e50' }}>{new Date(row.date).toLocaleDateString()}</td>
              <td style={{ padding: '4px 8px', color: '#2c3e50' }}>{row.value.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
