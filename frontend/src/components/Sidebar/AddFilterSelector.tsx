interface FilterOption {
  key: string
  label: string
}

interface AddFilterSelectorProps {
  availableFilters: FilterOption[]
  onAddFilter: (filterKey: string) => void
}

export function AddFilterSelector({ availableFilters, onAddFilter }: AddFilterSelectorProps) {
  if (availableFilters.length === 0) {
    return null
  }

  return (
    <div style={{ marginTop: '10px', marginBottom: '20px' }}>
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) {
            onAddFilter(e.target.value)
            e.target.value = ''
          }
        }}
        style={{
          width: '100%',
          padding: '6px 8px',
          backgroundColor: 'transparent',
          color: '#bdc3c7',
          border: 'none',
          fontSize: '13px',
          outline: 'none',
          cursor: 'pointer'
        }}
      >
        <option value="">Add Filter...</option>
        {availableFilters.map(filter => (
          <option key={filter.key} value={filter.key}>
            {filter.label}
          </option>
        ))}
      </select>
    </div>
  )
}