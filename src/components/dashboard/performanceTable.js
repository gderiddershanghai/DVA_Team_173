// Performance table structure and functionality
// Set up dimensions for performance table
const tableMargin = {top: 20, right: 20, bottom: 20, left: 20};
const tableWidth = 1300 - tableMargin.left - tableMargin.right;
const tableHeight = 460 - tableMargin.top - tableMargin.bottom;

// Parameter descriptions
const parameterDescriptions = {
  "alpha": "Earnings more than market average.",
  "beta": "Moves with market, shows risk.",
  "sharpe_ratio": "Earnings compared to total risk.",
  "treynor_ratio": "Earnings compared to market risk."
};

// Function to update the performance table with API data
function updatePerformanceTable(performanceData, dependencies) {
  const { stocksDatabase } = dependencies;
  
  // Clear existing table
  const performanceTable = d3.select("#performance-table");
  performanceTable.html("");
  
  // Add title
  performanceTable.append("h2")
    .text("Stock Information")
    .style("margin-bottom", "20px")
    .style("color", "#333");
  
  if (!performanceData) {
    performanceTable.append("p")
      .text("No performance data available")
      .style("text-align", "center")
      .style("color", "#666")
      .style("font-style", "italic");
    return;
  }
  
  // Log performance data for debugging
  console.log("Performance Data:", performanceData);
  
  // Get benchmark values from the API data
  const benchmarkValues = {
    "alpha": performanceData.market_alpha,
    "beta": performanceData.market_beta,
    "sharpe_ratio": performanceData.market_sharpe_ratio,
    "treynor_ratio": performanceData.market_treynor_ratio 
  };
  
  // Log benchmark values
  console.log("Benchmark Values:", benchmarkValues);
  
  // Calculate average rank (for color determination)
  const avgRank = stocksDatabase.length / 2;
  
  // Create metric row container
  const metricsContainer = performanceTable.append("div")
    .style("display", "grid")
    .style("grid-template-columns", "repeat(2, 1fr)")
    .style("grid-gap", "20px");
  
  // Get current ticker from the search box
  const currentTicker = d3.select("#searchTicker").property("value").toUpperCase() || "AAPL";
  
  // Create metric cards with benchmark values passed explicitly
  createMetricCard(metricsContainer, "Alpha", 
                  performanceData.alpha, 
                  performanceData.alpha_rank, 
                  avgRank, 
                  stocksDatabase.length,
                  "alpha",
                  currentTicker,
                  benchmarkValues);
  
  createMetricCard(metricsContainer, "Beta", 
                  performanceData.beta, 
                  performanceData.beta_rank, 
                  avgRank, 
                  stocksDatabase.length,
                  "beta",
                  currentTicker,
                  benchmarkValues);
  
  createMetricCard(metricsContainer, "Sharpe Ratio", 
                  performanceData.sharpe_ratio, 
                  performanceData.sharpe_ratio_rank, 
                  avgRank, 
                  stocksDatabase.length,
                  "sharpe_ratio",
                  currentTicker,
                  benchmarkValues);
                  
  createMetricCard(metricsContainer, "Treynor Ratio", 
                  performanceData.treynor_ratio, 
                  performanceData.treynor_ratio_rank, 
                  avgRank, 
                  stocksDatabase.length,
                  "treynor_ratio",
                  currentTicker,
                  benchmarkValues);
}

// Helper function to create a metric card
function createMetricCard(container, title, value, rank, avgRank, totalStocks, paramKey, stockTicker, benchmarkValues) {
  // Validate input values and provide defaults if needed
  value = value || 0;
  rank = rank || 0;
  
  // Calculate if above or below average
  const isBelowAverage = rank > avgRank;
  const colorClass = isBelowAverage ? "#F44336" : "#4CAF50";
  
  // Create card container
  const card = container.append("div")
    .style("display", "flex")
    .style("background-color", "white")
    .style("border-radius", "8px")
    .style("box-shadow", "0 2px 6px rgba(0,0,0,0.1)")
    .style("padding", "15px")
    .style("height", "120px");
  
  // Left side with badge and description
  const leftSide = card.append("div")
    .style("flex", "1")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("padding-right", "15px");
  
  // Metric badge (circular)
  const badgeContainer = leftSide.append("div")
    .style("display", "flex")
    .style("align-items", "center");
  
  badgeContainer.append("div")
    .style("width", "60px")
    .style("height", "60px")
    .style("border-radius", "50%")
    .style("background-color", colorClass)
    .style("display", "flex")
    .style("align-items", "center")
    .style("justify-content", "center")
    .style("margin-bottom", "10px")
    .style("color", "white")
    .style("font-weight", "bold")
    .style("font-size", "24px")
    .text(Math.round(value));
  
  // Title and description
  leftSide.append("h3")
    .style("font-size", "18px")
    .style("margin", "5px 0")
    .text(title);
  
  leftSide.append("p")
    .style("font-size", "14px")
    .style("color", "#666")
    .text(parameterDescriptions[paramKey]);
  
  // Right side with linear graph
  const rightSide = card.append("div")
    .style("flex", "1.5")
    .style("border-left", "1px solid #eee")
    .style("padding-left", "15px");
  
  // Create SVG for visualization
  const svg = rightSide.append("svg")
    .attr("width", "100%")
    .attr("height", "60px");
  
  // Add scale line
  svg.append("line")
    .attr("x1", "10%")
    .attr("x2", "90%")
    .attr("y1", 30)
    .attr("y2", 30)
    .attr("stroke", "#ddd")
    .attr("stroke-width", 2);
  
  // Add benchmark marker (S&P500)
  const benchmarkX = "50%"; // Center position
  svg.append("line")
    .attr("x1", benchmarkX)
    .attr("x2", benchmarkX)
    .attr("y1", 25)
    .attr("y2", 35)
    .attr("stroke", "#888")
    .attr("stroke-width", 2);
  
  svg.append("text")
    .attr("x", benchmarkX)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .attr("fill", "#666")
    .attr("font-size", "12px")
    .text("S&P500");
  
  svg.append("text")
    .attr("x", benchmarkX)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("fill", "#333")
    .attr("font-size", "10px")
    .text(benchmarkValues[paramKey].toFixed(1));
  
  // Calculate stock position based on value relative to benchmark
  // Normalize position between 10% and 90% of the available width
  const benchmarkVal = benchmarkValues[paramKey];
  const range = Math.max(Math.abs(value - benchmarkVal) * 3, 0.5);
  const maxPos = Math.min(90, 50 + range * 20);
  const minPos = Math.max(10, 50 - range * 20);
  
  const stockX = value > benchmarkVal 
    ? `${50 + (value - benchmarkVal) / range * (maxPos - 50)}%`
    : `${50 - (benchmarkVal - value) / range * (50 - minPos)}%`;
  
  // Add stock marker
  svg.append("circle")
    .attr("cx", stockX)
    .attr("cy", 30)
    .attr("r", 10)
    .attr("fill", colorClass);
  
  svg.append("text")
    .attr("x", stockX)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .attr("fill", "#666")
    .attr("font-size", "12px")
    .text(stockTicker);
  
  svg.append("text")
    .attr("x", stockX)
    .attr("y", 10)
    .attr("text-anchor", "middle")
    .attr("fill", "#333")
    .attr("font-size", "10px")
    .text(value.toFixed(1));
}

// Export the functions and constants
export {
  tableMargin,
  tableWidth,
  tableHeight,
  updatePerformanceTable
};