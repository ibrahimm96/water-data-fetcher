const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testTableStructure() {
  try {
    console.log('Testing gw_sites_with_historical_data table structure...')
    
    // Try to get a few records to see what columns exist
    const { data, error } = await supabase
      .from('gw_sites_with_historical_data')
      .select('*')
      .limit(3)

    if (error) {
      console.error('Error accessing table:', error)
      return
    }

    if (!data || data.length === 0) {
      console.log('No data found in table')
      return
    }

    console.log('\nColumns found in gw_sites_with_historical_data:')
    console.log('=' .repeat(50))
    
    const columns = Object.keys(data[0])
    columns.forEach(col => {
      console.log(`- ${col}`)
    })
    
    // Check for the specific columns we're interested in
    const targetColumns = ['min_value', 'max_value', 'avg_value']
    console.log('\nChecking for statistical columns:')
    console.log('=' .repeat(50))
    
    targetColumns.forEach(col => {
      const exists = columns.includes(col)
      console.log(`${col}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`)
    })
    
    // Show sample data
    console.log('\nSample data (first 3 records):')
    console.log('=' .repeat(50))
    
    data.forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`)
      console.log(`  monitoring_location_id: ${record.monitoring_location_id}`)
      console.log(`  measurement_count: ${record.measurement_count}`)
      
      targetColumns.forEach(col => {
        if (columns.includes(col)) {
          const value = record[col]
          console.log(`  ${col}: ${value !== null && value !== undefined ? value : 'NULL'}`)
        }
      })
    })
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testTableStructure()