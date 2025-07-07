import { Slider } from './Slider'
import { getCountiesSortedByName } from '../../lib/groundwater/californiaCounties'

interface FilterOption {
  key: string
  label: string
}

interface FilterValues {
  measurementFilter: { min: number; max: number | null }
  dateFilter: { startYear: number; endYear: number }
  minMaxValueFilter: { min: number | null; max: number | null }
  averageValueFilter: { min: number | null; max: number | null }
  countyFilter: { selectedCounties: string[] }
  localDateFilter: [number, number]
}

interface FilterChangeHandlers {
  onMeasurementFilterChange: (filter: { min: number; max: number | null }) => void
  onDateFilterChange: (filter: { startYear: number; endYear: number }) => void
  onMinMaxValueFilterChange: (filter: { min: number | null; max: number | null }) => void
  onAverageValueFilterChange: (filter: { min: number | null; max: number | null }) => void
  onCountyFilterChange: (filter: { selectedCounties: string[] }) => void
  setLocalDateFilter: (filter: [number, number]) => void
}

interface ActiveFiltersListProps {
  activeFilters: string[]
  availableFilters: FilterOption[]
  filterValues: FilterValues
  filterHandlers: FilterChangeHandlers
  onRemoveFilter: (filterKey: string) => void
  constants: {
    MIN: number
    MAX: number
    DATE_MIN: number
    DATE_MAX: number
    VALUE_MIN: number
    VALUE_MAX: number
    STEP: number
  }
}

export function ActiveFiltersList({
  activeFilters,
  availableFilters,
  filterValues,
  filterHandlers,
  onRemoveFilter,
  constants
}: ActiveFiltersListProps) {
  const { MIN, MAX, DATE_MIN, DATE_MAX, VALUE_MIN, VALUE_MAX, STEP } = constants
  const {
    measurementFilter,
    dateFilter,
    minMaxValueFilter,
    averageValueFilter,
    countyFilter,
    localDateFilter
  } = filterValues
  const {
    onMeasurementFilterChange,
    onDateFilterChange,
    onMinMaxValueFilterChange,
    onAverageValueFilterChange,
    onCountyFilterChange,
    setLocalDateFilter
  } = filterHandlers

  const sliderValues = [
    measurementFilter.min,
    measurementFilter.max === null ? MAX : measurementFilter.max
  ]

  return (
    <>
      {activeFilters.map(filterKey => {
        const filter = availableFilters.find(f => f.key === filterKey)
        if (!filter) return null

        return (
          <div key={filterKey} style={{
            borderBottom: '1px solid #34495e',
            marginBottom: '16px',
            paddingBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h4 style={{
                color: '#ecf0f1',
                fontSize: '13px',
                fontWeight: '600',
                margin: 0
              }}>
                {filter.label}
              </h4>
              <button
                onClick={() => onRemoveFilter(filterKey)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#bdc3c7',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '0 2px'
                }}
                title="Remove filter"
              >
                ✕
              </button>
            </div>

            {/* Filter Content */}
            {filterKey === 'measurement' && (
              <Slider
                values={sliderValues as [number, number]}
                min={MIN}
                max={MAX}
                step={STEP}
                infinitySymbol={true}
                onChange={(values) => {
                  const [min, max] = values
                  onMeasurementFilterChange({
                    min,
                    max: max === MAX ? null : max
                  })
                }}
              />
            )}

            {filterKey === 'date' && (
              <Slider
                values={localDateFilter}
                min={DATE_MIN}
                max={DATE_MAX}
                step={1}
                onChange={(values) => {
                  setLocalDateFilter(values)
                  onDateFilterChange({ startYear: values[0], endYear: values[1] })
                }}
              />
            )}

            {filterKey === 'minMaxValue' && (
              <Slider
                values={[
                  minMaxValueFilter.min ?? VALUE_MIN,
                  minMaxValueFilter.max ?? VALUE_MAX
                ]}
                min={VALUE_MIN}
                max={VALUE_MAX}
                step={1}
                unit="feet"
                onChange={(values) => {
                  const [min, max] = values
                  onMinMaxValueFilterChange({
                    min: min === VALUE_MIN ? null : min,
                    max: max === VALUE_MAX ? null : max
                  })
                }}
              />
            )}

            {filterKey === 'averageValue' && (
              <Slider
                values={[
                  averageValueFilter.min ?? VALUE_MIN,
                  averageValueFilter.max ?? VALUE_MAX
                ]}
                min={VALUE_MIN}
                max={VALUE_MAX}
                step={1}
                unit="feet"
                onChange={(values) => {
                  const [min, max] = values
                  onAverageValueFilterChange({
                    min: min === VALUE_MIN ? null : min,
                    max: max === VALUE_MAX ? null : max
                  })
                }}
              />
            )}

            {filterKey === 'county' && (
              <div>
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #2c3e50',
                  borderRadius: '4px',
                  backgroundColor: '#2c3e50'
                }}>
                  {getCountiesSortedByName().map(county => (
                    <label
                      key={county.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #34495e',
                        fontSize: '13px',
                        color: '#ecf0f1'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#34495e'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={countyFilter.selectedCounties.includes(county.code)}
                        onChange={(e) => {
                          const isChecked = e.target.checked
                          const newSelection = isChecked
                            ? [...countyFilter.selectedCounties, county.code]
                            : countyFilter.selectedCounties.filter(c => c !== county.code)
                          onCountyFilterChange({ selectedCounties: newSelection })
                        }}
                        style={{
                          marginRight: '8px',
                          transform: 'scale(1.1)'
                        }}
                      />
                      <span>{county.name}</span>
                      <span style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        color: '#bdc3c7'
                      }}>
                        {county.code}
                      </span>
                    </label>
                  ))}
                </div>
                {countyFilter.selectedCounties.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <button
                      onClick={() => onCountyFilterChange({ selectedCounties: [] })}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Clear All Counties
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}