import { supabase } from './supabase.js';

async function analyzeMeasurementDistribution() {
  console.log('Analyzing groundwater measurement distribution...\n');

  try {
    // First, check which tables exist and get their structure
    console.log('1. Checking table structure...');
    
    // Check if the table exists and get some sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('gw_historical_timeseries')
      .select('*')
      .limit(5);
    
    if (sampleError) {
      console.error('Error accessing gw_historical_timeseries:', sampleError.message);
      console.log('Trying alternative table name...');
      
      // Try the other possible table name
      const { data: altSample, error: altError } = await supabase
        .from('groundwater_time_series')
        .select('*')
        .limit(5);
        
      if (altError) {
        console.error('Error accessing groundwater_time_series:', altError.message);
        return;
      } else {
        console.log('Found groundwater_time_series table');
        console.log('Sample data structure:', altSample[0]);
      }
    } else {
      console.log('Found gw_historical_timeseries table');
      if (sampleData.length > 0) {
        console.log('Sample data structure:', sampleData[0]);
      }
    }

    // Get total count
    console.log('\n2. Getting total measurement count...');
    const { count: totalCount, error: countError } = await supabase
      .from('gw_historical_timeseries')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error getting total count:', countError.message);
      return;
    }
    
    console.log(`Total measurements in database: ${totalCount}`);

    // Get unique site count
    console.log('\n3. Getting unique site count...');
    const { data: allSites, error: sitesError } = await supabase
      .from('gw_historical_timeseries')
      .select('monitoring_location_number');
    
    if (sitesError) {
      console.error('Error getting all sites:', sitesError.message);
      return;
    }
    
    // Count unique sites manually
    const uniqueSiteNumbers = [...new Set(allSites.map(site => site.monitoring_location_number))];
    console.log(`Unique sites with measurements: ${uniqueSiteNumbers.length}`);
    console.log(`Average measurements per site: ${(totalCount / uniqueSiteNumbers.length).toFixed(2)}`);

    // Get measurement distribution by site
    console.log('\n4. Analyzing measurement distribution per site...');
    const { data: distributionData, error: distError } = await supabase
      .rpc('get_measurement_distribution');
    
    if (distError) {
      console.log('Custom function not available, using manual query...');
      
      // Use the already fetched allSites data to calculate distribution
      const siteCounts = {};
      allSites.forEach(row => {
        siteCounts[row.monitoring_location_number] = (siteCounts[row.monitoring_location_number] || 0) + 1;
      });
      
      const counts = Object.values(siteCounts);
      const distribution = {};
      counts.forEach(count => {
        distribution[count] = (distribution[count] || 0) + 1;
      });
      
      console.log('\nMeasurement count distribution:');
      Object.keys(distribution)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(count => {
          console.log(`Sites with ${count} measurement${count > 1 ? 's' : ''}: ${distribution[count]}`);
        });
      
      // Show statistics
      const sortedCounts = counts.sort((a, b) => a - b);
      console.log(`\nStatistics:`);
      console.log(`Min measurements per site: ${Math.min(...counts)}`);
      console.log(`Max measurements per site: ${Math.max(...counts)}`);
      console.log(`Median measurements per site: ${sortedCounts[Math.floor(sortedCounts.length / 2)]}`);
      console.log(`Sites with exactly 1 measurement: ${distribution[1] || 0} (${((distribution[1] || 0) / uniqueSiteNumbers.length * 100).toFixed(1)}%)`);
    }

    // Get some example sites with only 1 measurement
    console.log('\n5. Examining sites with only 1 measurement...');
    const { data: singleMeasurementSites, error: singleError } = await supabase
      .from('gw_historical_timeseries')
      .select('*')
      .limit(10);
    
    if (!singleError && singleMeasurementSites.length > 0) {
      console.log('\nSample sites with measurements:');
      singleMeasurementSites.forEach(site => {
        console.log(`Site: ${site.monitoring_location_number}, Date: ${site.measurement_datetime}, Value: ${site.measurement_value}, Variable: ${site.variable_code}`);
      });
    }

    // Check date range of measurements
    console.log('\n6. Checking date range of measurements...');
    const { data: dateRange, error: dateError } = await supabase
      .from('gw_historical_timeseries')
      .select('measurement_datetime')
      .order('measurement_datetime', { ascending: true })
      .limit(1);
    
    const { data: latestDate, error: latestError } = await supabase
      .from('gw_historical_timeseries')
      .select('measurement_datetime')
      .order('measurement_datetime', { ascending: false })
      .limit(1);
    
    if (!dateError && !latestError && dateRange.length > 0 && latestDate.length > 0) {
      console.log(`Earliest measurement: ${dateRange[0].measurement_datetime}`);
      console.log(`Latest measurement: ${latestDate[0].measurement_datetime}`);
    }

  } catch (error) {
    console.error('Analysis error:', error.message);
  }
}

analyzeMeasurementDistribution().catch(err => {
  console.error('Fatal error during analysis:', err.message);
  process.exit(1);
});