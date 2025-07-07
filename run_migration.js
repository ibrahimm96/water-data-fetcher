const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key exists:', !!supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('Running migration to create gw_sites_with_historical_data view...\n')
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250707000000_create_gw_sites_with_historical_data_view.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('Migration SQL loaded, executing...')
    
    console.log('Migration SQL content:')
    console.log('=' .repeat(50))
    console.log(migrationSQL.substring(0, 500) + '...')
    console.log('=' .repeat(50))
    
    console.log('\nNote: This script shows the migration SQL that needs to be executed.')
    console.log('Please run this SQL manually in your Supabase dashboard or using a PostgreSQL client.')
    console.log('\nThe migration creates:')
    console.log('1. A materialized view "gw_sites_with_historical_data"')
    console.log('2. Indexes for performance')
    console.log('3. Statistical columns: min_value, max_value, avg_value')
    console.log('4. A refresh function for the materialized view')
    
    // Check if the view already exists and what columns it has
    console.log('\nChecking current gw_sites_with_historical_data structure...')
    try {
      const { data: testData, error: testError } = await supabase
        .from('gw_sites_with_historical_data')
        .select('*')
        .limit(3)
      
      if (testError) {
        console.error('View does not exist or error querying:', testError.message)
        console.log('\nThe view needs to be created. Please execute the migration SQL above.')
      } else {
        console.log('View exists! Current structure:')
        if (testData && testData.length > 0) {
          const columns = Object.keys(testData[0])
          console.log('\nAvailable columns:')
          columns.forEach(col => {
            console.log(`- ${col}`)
          })
          
          // Check specifically for the statistical columns we need
          const requiredCols = ['min_value', 'max_value', 'avg_value']
          console.log('\nRequired statistical columns:')
          requiredCols.forEach(col => {
            const exists = columns.includes(col)
            console.log(`${col}: ${exists ? '✓ EXISTS' : '✗ MISSING'}`)
          })
          
          if (requiredCols.every(col => columns.includes(col))) {
            console.log('\n✅ All required columns exist! The filters should work now.')
            
            // Show sample values
            console.log('\nSample data:')
            testData.forEach((row, i) => {
              console.log(`Site ${i + 1}: ${row.monitoring_location_id}`)
              console.log(`  min_value: ${row.min_value}`)
              console.log(`  max_value: ${row.max_value}`)
              console.log(`  avg_value: ${row.avg_value}`)
              console.log(`  measurement_count: ${row.measurement_count}`)
            })
          } else {
            console.log('\n❌ Missing required columns. Please run the migration.')
          }
        }
      }
    } catch (err) {
      console.error('Error checking view:', err)
    }
    
  } catch (error) {
    console.error('Error running migration:', error)
  }
}

runMigration()