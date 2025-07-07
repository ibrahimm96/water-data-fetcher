import { Range } from 'react-range'

interface SliderProps {
  values: [number, number]
  min: number
  max: number
  step?: number
  unit?: string
  infinitySymbol?: boolean
  onChange: (values: [number, number]) => void
}

export function Slider({
  values,
  min,
  max,
  step = 1,
  unit = '',
  infinitySymbol = false,
  onChange
}: SliderProps) {
  const displayMax = infinitySymbol && values[1] === max ? '∞' : values[1]

  return (
    <div>
      <Range
        step={step}
        min={min}
        max={max}
        values={values}
        onChange={(values) => onChange(values as [number, number])}
        renderTrack={({ props, children }) => (
          <div
            {...props}
            style={{
              ...props.style,
              height: '6px',
              background: '#2c3e50',
              borderRadius: '3px',
              marginBottom: '12px'
            }}
          >
            <div
              style={{
                height: '100%',
                background: '#3498db',
                marginLeft: `${((values[0] - min) / (max - min)) * 100}%`,
                width: `${((values[1] - values[0]) / (max - min)) * 100}%`
              }}
            />
            {children}
          </div>
        )}
        renderThumb={({ props }) => (
          <div
            {...props}
            style={{
              ...props.style,
              height: '16px',
              width: '16px',
              borderRadius: '50%',
              backgroundColor: '#3498db',
              border: '2px solid #ecf0f1',
              cursor: 'pointer',
              marginTop: '-5px'
            }}
          />
        )}
      />
      <div style={{ fontSize: '12px', color: '#bdc3c7' }}>
        {values[0]} to {displayMax}{unit && ` ${unit}`}
      </div>
    </div>
  )
}