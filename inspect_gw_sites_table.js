const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key exists:', !!supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectTable() {
  console.log('Inspecting gw_sites_with_historical_data table/view...\n')
  
  try {
    // Get a few sample records to see the structure
    const { data, error } = await supabase
      .from('gw_sites_with_historical_data')
      .select('*')
      .limit(5)

    if (error) {
      console.error('Error fetching data:', error)
      return
    }

    if (!data || data.length === 0) {
      console.log('No data found in gw_sites_with_historical_data table/view')
      return
    }

    // Display available columns
    console.log('Available columns in gw_sites_with_historical_data:')
    console.log('=' .repeat(50))
    const columns = Object.keys(data[0])
    columns.forEach(col => {
      console.log(`- ${col}`)
    })
    
    // Check specifically for min_value, max_value, avg_value
    console.log('\n' + '=' .repeat(50))
    console.log('Checking for min_value, max_value, avg_value columns:')
    console.log('=' .repeat(50))
    const targetColumns = ['min_value', 'max_value', 'avg_value']
    
    targetColumns.forEach(col => {
      const exists = columns.includes(col)
      console.log(`${col}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`)
    })
    
    // Display sample data for these columns if they exist
    console.log('\n' + '=' .repeat(50))
    console.log('Sample data for first 3 records:')
    console.log('=' .repeat(50))
    
    data.slice(0, 3).forEach((record, index) => {
      console.log(`\nRecord ${index + 1}:`)
      console.log(`  monitoring_location_id: ${record.monitoring_location_id}`)
      console.log(`  monitoring_location_name: ${record.monitoring_location_name}`)
      console.log(`  measurement_count: ${record.measurement_count}`)
      
      targetColumns.forEach(col => {
        if (columns.includes(col)) {
          const value = record[col]
          console.log(`  ${col}: ${value !== null && value !== undefined ? value : 'NULL'}`)
        }
      })
    })
    
    // Get count of total records
    const { count } = await supabase
      .from('gw_sites_with_historical_data')
      .select('*', { count: 'exact', head: true })
      
    console.log(`\nTotal records in table: ${count}`)
    
    // Check for non-null values in min_value, max_value, avg_value
    if (targetColumns.some(col => columns.includes(col))) {
      console.log('\n' + '=' .repeat(50))
      console.log('Checking for non-null values in statistical columns:')
      console.log('=' .repeat(50))
      
      for (const col of targetColumns) {
        if (columns.includes(col)) {
          const { count: nonNullCount } = await supabase
            .from('gw_sites_with_historical_data')
            .select('*', { count: 'exact', head: true })
            .not(col, 'is', null)
            
          console.log(`${col} - Non-null values: ${nonNullCount}`)
        }
      }
    }
    
  } catch (error) {
    console.error('Error inspecting table:', error)
  }
}

inspectTable()