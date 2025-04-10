// Performance table structure and functionality
// Set up dimensions for performance table
const tableMargin = {top: 20, right: 20, bottom: 20, left: 20};
const tableWidth = 300, tableHeight = 600;

// Function to update the performance table with API data
function updatePerformanceTable(performanceData, dependencies) {
  const { stocksDatabase } = dependencies;
  
  if (!performanceData) {
    // Reset to placeholder values if no data
    d3.selectAll("#performance-table tbody tr").each(function(d, i) {
      d3.select(this).select("td:nth-child(2)").text("N/A");
      d3.select(this).select("td:nth-child(3)").text("N/A");
    });
    return;
  }
  
  // Update Alpha row
  d3.select("#performance-table tbody tr:nth-child(1)")
    .select("td:nth-child(2)").text(performanceData.alpha.toFixed(4));
  d3.select("#performance-table tbody tr:nth-child(1)")
    .select("td:nth-child(3)").text(`Rank: ${performanceData.alpha_rank} of ${stocksDatabase.length}`);
    
  // Update Beta row
  d3.select("#performance-table tbody tr:nth-child(2)")
    .select("td:nth-child(2)").text(performanceData.beta.toFixed(4));
  d3.select("#performance-table tbody tr:nth-child(2)")
    .select("td:nth-child(3)").text(`Rank: ${performanceData.beta_rank} of ${stocksDatabase.length}`);
    
  // Update Sharpe Ratio row
  d3.select("#performance-table tbody tr:nth-child(3)")
    .select("td:nth-child(2)").text(performanceData.sharpe_ratio.toFixed(4));
  d3.select("#performance-table tbody tr:nth-child(3)")
    .select("td:nth-child(3)").text(`Rank: ${performanceData.sharpe_ratio_rank} of ${stocksDatabase.length}`);
    
  // Update Treynor Ratio row
  d3.select("#performance-table tbody tr:nth-child(4)")
    .select("td:nth-child(2)").text(performanceData.treynor_ratio.toFixed(4));
  d3.select("#performance-table tbody tr:nth-child(4)")
    .select("td:nth-child(3)").text(`Rank: ${performanceData.treynor_ratio_rank} of ${stocksDatabase.length}`);
}

// Export the functions and constants
export {
  tableMargin,
  tableWidth,
  tableHeight,
  updatePerformanceTable
}; 