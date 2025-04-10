// Correlation chart structure and functionality
// Set up dimensions for correlation chart
const correlationMargin = {top: 20, right: 20, bottom: 20, left: 20};
const correlationWidth = 900, correlationHeight = 300;

// Function to update the correlation section with API data
async function updateCorrelationChart(correlationData, symbol, startDate, endDate, selectedStartIdx, selectedEndIdx, dependencies) {
  const { currentWeeklyData, loadStockData, createLoadingSpinner, tooltip } = dependencies;
  
  // Create SVGs for the two correlation charts
  const corrContainer = d3.select("#correlationChart");
  
  // Clear previous content
  corrContainer.selectAll("*").remove();
  
  // Create container div with flex layout for the two charts
  const chartContainer = corrContainer.append("div")
    .style("display", "flex")
    .style("width", "100%")
    .style("height", "100%")
    .style("justify-content", "space-between");
    
  // Create the two chart areas
  const mostCorrChart = chartContainer.append("div")
    .attr("id", "most-correlated-chart")
    .style("width", "48%")
    .style("height", "100%");
    
  const leastCorrChart = chartContainer.append("div")
    .attr("id", "least-correlated-chart")
    .style("width", "48%")
    .style("height", "100%");
  
  // Create SVGs within the chart areas
  const mostSvg = mostCorrChart.append("svg")
    .attr("width", correlationWidth / 2 - 10)
    .attr("height", correlationHeight);
    
  const leastSvg = leastCorrChart.append("svg")
    .attr("width", correlationWidth / 2 - 10)
    .attr("height", correlationHeight);
  
  // Add titles to the charts
  mostSvg.append("text")
    .attr("x", (correlationWidth / 2 - 10) / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .style("font-size", "14px")
    .text("Most Correlated Stock");
    
  leastSvg.append("text")
    .attr("x", (correlationWidth / 2 - 10) / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .style("font-size", "14px")
    .text("Least Correlated Stock");
  
  // If no correlation data, show placeholders
  if (!correlationData) {
    d3.select("#mostCorrelated").text("Most Correlated: N/A");
    d3.select("#leastCorrelated").text("Least Correlated: N/A");
    
    // Show "No Data" message in both charts
    mostSvg.append("text")
      .attr("x", (correlationWidth / 2 - 10) / 2)
      .attr("y", correlationHeight / 2)
      .attr("text-anchor", "middle")
      .text("No correlation data available");
      
    leastSvg.append("text")
      .attr("x", (correlationWidth / 2 - 10) / 2)
      .attr("y", correlationHeight / 2)
      .attr("text-anchor", "middle")
      .text("No correlation data available");
      
    return;
  }
  
  // Update correlation text information
  const mostCorrelatedText = `Most Correlated: ${correlationData.most_correlated_stock} (${correlationData.most_correlated_stock_correlation.toFixed(4)})`;
  const leastCorrelatedText = `Least Correlated: ${correlationData.least_correlated_stock} (${correlationData.least_correlated_stock_correlation.toFixed(4)})`;
  
  d3.select("#mostCorrelated").text(mostCorrelatedText);
  d3.select("#leastCorrelated").text(leastCorrelatedText);
  
  // Show loading spinners while data is being fetched
  const mostSpinner = createLoadingSpinner(
    mostSvg,
    correlationWidth / 2 - 10,
    correlationHeight
  );
  
  const leastSpinner = createLoadingSpinner(
    leastSvg,
    correlationWidth / 2 - 10,
    correlationHeight
  );
  
  // Load data for the most and least correlated stocks
  let mostCorrelatedData = null;
  let leastCorrelatedData = null;
  
  try {
    // Get the selected date range
    const currentWeeklyDataCopy = [...currentWeeklyData];
    const startIdx = Math.max(0, Math.min(selectedStartIdx, currentWeeklyDataCopy.length - 1));
    const endIdx = Math.max(0, Math.min(selectedEndIdx, currentWeeklyDataCopy.length - 1));
    
    const minDate = currentWeeklyDataCopy[startIdx].date;
    const maxDate = currentWeeklyDataCopy[endIdx].date;
    
    // Filter the main data to the selected range
    const filteredMainData = currentWeeklyDataCopy.slice(startIdx, endIdx + 1);
    
    // Load data for the most correlated stock
    if (correlationData.most_correlated_stock !== "None") {
      const mostData = await loadStockData(correlationData.most_correlated_stock);
      if (mostData) {
        // Filter by date range
        mostCorrelatedData = mostData.weekly.filter(d => 
          d.date >= minDate && d.date <= maxDate
        );
        
        // Remove the loading spinner for most correlated chart
        mostSpinner.remove();
        
        // Draw the most correlated chart
        drawCorrelationChart(
          mostSvg,
          filteredMainData,
          mostCorrelatedData,
          symbol,
          correlationData.most_correlated_stock,
          minDate,
          maxDate,
          true,
          { tooltip }
        );
      }
    } else {
      // Remove spinner and show no data message
      mostSpinner.remove();
      mostSvg.append("text")
        .attr("x", (correlationWidth / 2 - 10) / 2)
        .attr("y", correlationHeight / 2)
        .attr("text-anchor", "middle")
        .text("No most correlated stock found");
    }
    
    // Load data for the least correlated stock
    if (correlationData.least_correlated_stock !== "None") {
      const leastData = await loadStockData(correlationData.least_correlated_stock);
      if (leastData) {
        // Filter by date range
        leastCorrelatedData = leastData.weekly.filter(d => 
          d.date >= minDate && d.date <= maxDate
        );
        
        // Remove the loading spinner for least correlated chart
        leastSpinner.remove();
        
        // Draw the least correlated chart
        drawCorrelationChart(
          leastSvg,
          filteredMainData,
          leastCorrelatedData,
          symbol,
          correlationData.least_correlated_stock,
          minDate,
          maxDate,
          false,
          { tooltip }
        );
      }
    } else {
      // Remove spinner and show no data message
      leastSpinner.remove();
      leastSvg.append("text")
        .attr("x", (correlationWidth / 2 - 10) / 2)
        .attr("y", correlationHeight / 2)
        .attr("text-anchor", "middle")
        .text("No least correlated stock found");
    }
  } catch (error) {
    console.error("Error loading correlated stock data:", error);
    
    // Remove spinners and show error message
    mostSpinner.remove();
    leastSpinner.remove();
    
    mostSvg.append("text")
      .attr("x", (correlationWidth / 2 - 10) / 2)
      .attr("y", correlationHeight / 2)
      .attr("text-anchor", "middle")
      .text("Error loading data");
      
    leastSvg.append("text")
      .attr("x", (correlationWidth / 2 - 10) / 2)
      .attr("y", correlationHeight / 2)
      .attr("text-anchor", "middle")
      .text("Error loading data");
  }
}

// Function to draw a single correlation chart
function drawCorrelationChart(svg, mainData, correlatedData, mainSymbol, correlatedSymbol, minDate, maxDate, isMostCorrelated, dependencies) {
  const { tooltip } = dependencies;
  
  // Set chart dimensions
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  const margin = {top: 40, right: 10, bottom: 40, left: 40};
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  
  // Create the chart area
  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Create normalized data for better comparison
  const normalizeData = (data) => {
    if (!data || data.length === 0) return [];
    
    const firstValue = data[0].close;
    return data.map(d => ({
      date: d.date,
      value: (d.close / firstValue) * 100 // Percentage of initial value
    }));
  };
  
  const normalizedMainData = normalizeData(mainData);
  const normalizedCorrelatedData = normalizeData(correlatedData);
  
  // Find min and max of normalized values
  const allValues = [
    ...normalizedMainData.map(d => d.value),
    ...normalizedCorrelatedData.map(d => d.value)
  ];
  
  const yMin = d3.min(allValues) * 0.95;
  const yMax = d3.max(allValues) * 1.05;
  
  // Create scales
  const xScale = d3.scaleTime()
    .domain([minDate, maxDate])
    .range([0, chartWidth]);
    
  const yScale = d3.scaleLinear()
    .domain([yMin, yMax])
    .range([chartHeight, 0]);
  
  // Add axes
  chart.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.timeFormat("%b %Y")));
    
  chart.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d.toFixed(0)}%`));
  
  // Add grid lines
  chart.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale)
      .tickSize(-chartHeight)
      .tickFormat("")
    )
    .style("opacity", 0.1);
    
  chart.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale)
      .tickSize(-chartWidth)
      .tickFormat("")
    )
    .style("opacity", 0.1);
  
  // Line generator
  const line = d3.line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);
  
  // Add lines
  // Main stock line
  chart.append("path")
    .datum(normalizedMainData)
    .attr("class", "line main-line")
    .attr("fill", "none")
    .attr("stroke", "#2196F3")
    .attr("stroke-width", 2)
    .attr("d", line);
  
  // Correlated stock line
  chart.append("path")
    .datum(normalizedCorrelatedData)
    .attr("class", "line correlated-line")
    .attr("fill", "none")
    .attr("stroke", isMostCorrelated ? "#4CAF50" : "#F44336")
    .attr("stroke-width", 2)
    .attr("d", line);
  
  // Add legend
  const legend = chart.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(10,10)`);
  
  // Main stock
  legend.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 15)
    .attr("height", 3)
    .attr("fill", "#2196F3");
    
  legend.append("text")
    .attr("x", 20)
    .attr("y", 3)
    .attr("dominant-baseline", "middle")
    .style("font-size", "10px")
    .text(mainSymbol);
  
  // Correlated stock
  legend.append("rect")
    .attr("x", 0)
    .attr("y", 15)
    .attr("width", 15)
    .attr("height", 3)
    .attr("fill", isMostCorrelated ? "#4CAF50" : "#F44336");
    
  legend.append("text")
    .attr("x", 20)
    .attr("y", 18)
    .attr("dominant-baseline", "middle")
    .style("font-size", "10px")
    .text(correlatedSymbol);
}

// Export the functions and constants
export { 
  correlationMargin, 
  correlationWidth, 
  correlationHeight,
  updateCorrelationChart,
  drawCorrelationChart 
}; 