// Performance table structure and functionality
// Set up dimensions for performance table
const tableMargin = {top: 20, right: 20, bottom: 20, left: 20};
const tableWidth = 1300 - tableMargin.left - tableMargin.right;
const tableHeight = 460 - tableMargin.top - tableMargin.bottom;

// Parameter descriptions
const parameterDescriptions = {
  "alpha": "Excess return relative to market benchmark. Higher is better.",
  "beta": "Stock's volatility compared to market. >1 = more volatile, <1 = less volatile.",
  "sharpe_ratio": "Return per unit of risk. Higher values indicate better risk-adjusted performance.",
  "treynor_ratio": "Return per unit of market risk. Higher values show better market risk management."
};

// Parameter range limits
const parameterRanges = {
  "alpha": 3,         // -3 to +3 from S&P value
  "beta": 1,          // -1 to +1 from S&P value
  "sharpe_ratio": 3,  // -3 to +3 from S&P value
  "treynor_ratio": 1  // -1 to +1 from S&P value
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
    .style("font-weight", "bold")
    .style("margin-bottom", "15px")
    .style("color", "#333")
    .style("font-size", "36px")
    .style("margin-left", "50px")
    .style("font-family", "'Roboto', sans-serif");
  
  if (!performanceData) {
    performanceTable.append("p")
      .text("No performance data available")
      .style("text-align", "center")
      .style("color", "#666")
      .style("font-style", "italic")
      .style("font-family", "'Roboto', sans-serif");
    return;
  }
  
  // Get benchmark values from the API data
  const benchmarkValues = {
    "alpha": performanceData.market_alpha,
    "beta": performanceData.market_beta,
    "sharpe_ratio": performanceData.market_sharpe_ratio,
    "treynor_ratio": performanceData.market_treynor_ratio 
  };
  
  // Calculate average rank (for color determination)
  const avgRank = stocksDatabase.length / 2;
  
  // Create grid layout for metrics - 2x2 grid
  const metricsContainer = performanceTable.append("div")
    .style("display", "grid")
    .style("grid-template-columns", "repeat(2, 1fr)")
    .style("grid-gap", "20px")
    .style("max-height", "380px")
    .style("padding-left", "60px")
    .style("padding-right", "60px"); // Ensure it fits within container
  
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
  const isBelowAverage = value < benchmarkValues[paramKey];
  const circleColor = isBelowAverage ? "#EF7C8E" : "#66C2A3";
  
  // Create card container
  const card = container.append("div")
    .style("background-color", "white")
    .style("border-radius", "8px")
    .style("box-shadow", "0 4px 10px rgba(0,0,0,0.1)")
    .style("padding", "15px")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("height", "130px");
  
  // Create first row with circle and description
  const topRow = card.append("div")
    .style("display", "flex")
    .style("margin-bottom", "10px");
  
  // Create rank circle - 60x60px (reduced from 70x70)
  const circleContainer = topRow.append("div")
    .style("min-width", "60px");
  
  circleContainer.append("div")
    .style("width", "60px")
    .style("height", "60px")
    .style("border-radius", "50%")
    .style("background-color", circleColor)
    .style("display", "flex")
    .style("align-items", "center")
    .style("justify-content", "center")
    .style("color", "white")
    .style("font-weight", "bold")
    .style("font-size", "24px")
    .style("font-family", "'Roboto', sans-serif")
    .text(rank);
  
  // Create title and description
  const textContainer = topRow.append("div")
    .style("margin-left", "15px")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("justify-content", "center");
  
  textContainer.append("div")
    .style("font-size", "20px")
    .style("font-weight", "500")
    .style("font-family", "'Roboto', sans-serif")
    .style("color", "black")
    .text(title);
  
  textContainer.append("div")
    .style("font-size", "16px")
    .style("font-family", "'Roboto', sans-serif")
    .style("color", "#D6CDC4")
    .style("margin-top", "3px")
    .text(parameterDescriptions[paramKey]);
  
  // Create second row with linear graph
  const bottomRow = card.append("div")
    .style("height", "50px")
    .style("position", "relative")
    .style("margin-top", "5px");
  
  // Create the linear scale and axis
  const svgWidth = "100%";
  const svgHeight = 50;
  
  const svg = bottomRow.append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight);
  
  // Add horizontal line for the scale
  svg.append("line")
    .attr("x1", "5%")
    .attr("x2", "95%")
    .attr("y1", 25)
    .attr("y2", 25)
    .attr("stroke", "#E9E5E1")
    .attr("stroke-width", 8)
    .attr("stroke-linecap", "round");
  
  // Add benchmark marker (S&P500) - center at 50%
  const benchmarkX = "50%";
  const benchmarkValue = benchmarkValues[paramKey];
  
  svg.append("rect")
    .attr("x", benchmarkX)
    .attr("y", 15)
    .attr("width", 10)
    .attr("height", 20)
    .attr("transform", "translate(-5, 0)")
    .attr("fill", "#A38E79");
  
  // Add benchmark label
  svg.append("text")
    .attr("x", benchmarkX)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .attr("fill", "#666")
    .attr("font-size", "14px")
    .attr("font-family", "'Roboto', sans-serif")
    .text("S&P500");
  
  // Add benchmark value
  svg.append("text")
    .attr("x", benchmarkX)
    .attr("y", 10)
    .attr("text-anchor", "middle")
    .attr("fill", "#333")
    .attr("font-size", "14px")
    .attr("font-family", "'Roboto', sans-serif")
    .text(benchmarkValue.toFixed(1));
  
  // Get the fixed range for this parameter
  const fixedRange = parameterRanges[paramKey];
  
  // Calculate stock value relative to benchmark, capped at the parameter's range
  let relativeDiff = value - benchmarkValue;
  
  // Cap the difference if it exceeds the range
  if (relativeDiff > fixedRange) {
    relativeDiff = fixedRange;
  } else if (relativeDiff < -fixedRange) {
    relativeDiff = -fixedRange;
  }
  
  // Calculate position percentage (10% to 90% of available width)
  // With 50% being the benchmark position
  const stockX = `${50 + (relativeDiff / fixedRange) * 40}%`;
  
  // Add path/line connecting benchmark to stock value
  svg.append("line")
    .attr("x1", benchmarkX)
    .attr("x2", stockX)
    .attr("y1", 25)
    .attr("y2", 25)
    .attr("transform", "translate(5, 0)")
    .attr("stroke", isBelowAverage ? "rgba(239, 124, 142, 0.3)" : "rgba(102, 194, 163, 0.3)")
    .attr("stroke-width", 20);
  
  // Add stock marker
  svg.append("circle")
    .attr("cx", stockX)
    .attr("cy", 25)
    .attr("r", 10)
    .attr("fill", circleColor);
  
  // Add stock ticker
  svg.append("text")
    .attr("x", stockX)
    .attr("y", 50)
    .attr("text-anchor", "middle")
    .attr("fill", "#666")
    .attr("font-size", "14px")
    .attr("font-family", "'Roboto', sans-serif")
    .text(stockTicker);
  
  // Use original value for display (not the capped value)
  svg.append("text")
    .attr("x", stockX)
    .attr("y", 10)
    .attr("text-anchor", "middle")
    .attr("fill", "#333")
    .attr("font-size", "14px")
    .attr("font-family", "'Roboto', sans-serif")
    .text(value.toFixed(1));
}

// Export the functions and constants
export {
  tableMargin,
  tableWidth,
  tableHeight,
  updatePerformanceTable
};