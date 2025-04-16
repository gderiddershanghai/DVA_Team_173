// Correlation chart structure and functionality
// Set up dimensions for correlation chart
const correlationMargin = {top: 0, right: 0, bottom: 0, left: 0}; // Remove container margins
const correlationWidth = 1080;
const correlationHeight = 460;

// Function to update the correlation section with API data
async function updateCorrelationChart(correlationData, symbol, startDate, endDate, selectedStartIdx, selectedEndIdx, dependencies) {
  const { currentWeeklyData, loadStockData, createLoadingSpinner, tooltip } = dependencies;
  
  // Make a local copy of the data to avoid affecting the original
  const localWeeklyData = [...currentWeeklyData];
  
  // Create a local stock data loading function that doesn't affect the global state
  const loadCorrelatedStockData = async (correlatedSymbol) => {
    try {
      // Use the original loadStockData but return only the result without storing it globally
      const data = await loadStockData(correlatedSymbol, false);
      return data;
    } catch (error) {
      console.error(`Error loading correlated stock data for ${correlatedSymbol}:`, error);
      return null;
    }
  };
  
  // Create SVGs for the two correlation charts
  const corrContainer = d3.select("#correlationChart");
  
  // Clear previous content
  corrContainer.selectAll("*").remove();
  
  // Create container div with flex layout for the two charts with spacing between them
  const chartContainer = corrContainer.append("div")
    .style("display", "flex")
    .style("width", "100%")
    .style("height", "100%")
    .style("justify-content", "flex-start")
    .style("padding", "0")
    .style("border", "0");
    
  // Create the two chart areas - exactly 520px wide with 40px margin between them (1080 = 520 + 40 + 520)
  const mostCorrChart = chartContainer.append("div")
    .attr("id", "most-correlated-chart")
    .style("width", "520px")
    .style("height", "100%")
    .style("background-color", "white")
    .style("border-radius", "60px")
    .style("border", "0");
    
  const leastCorrChart = chartContainer.append("div")
    .attr("id", "least-correlated-chart")
    .style("width", "520px")
    .style("margin-left", "40px")
    .style("height", "100%")
    .style("background-color", "white")
    .style("border-radius", "60px")
    .style("border", "0");
  
  // Create SVGs within the chart areas
  const mostSvg = mostCorrChart.append("svg")
    .attr("width", 520)
    .attr("height", 460);
    
  const leastSvg = leastCorrChart.append("svg")
    .attr("width", 520)
    .attr("height", 460);
  
  // Add titles to the charts
  mostSvg.append("text")
    .attr("x", 520 / 2)
    .attr("y", 60)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .style("font-size", "32px")
    .style("font-family", "'Roboto', sans-serif")
    .text("Most Correlated Stock");
    
  leastSvg.append("text")
    .attr("x", 520 / 2)
    .attr("y", 60)
    .attr("text-anchor", "middle")
    .style("font-weight", "bold")
    .style("font-size", "32px")
    .style("font-family", "'Roboto', sans-serif")
    .text("Least Correlated Stock");
  
  // If no correlation data, show placeholders
  if (!correlationData) {
    // Show "No Data" message in both charts
    mostSvg.append("text")
      .attr("x", 520 / 2)
      .attr("y", correlationHeight / 2)
      .attr("text-anchor", "middle")
      .text("No correlation data available");
      
    leastSvg.append("text")
      .attr("x", 520 / 2)
      .attr("y", correlationHeight / 2)
      .attr("text-anchor", "middle")
      .text("No correlation data available");
      
    return;
  }
  
  // Show loading spinners while data is being fetched
  const mostSpinner = createLoadingSpinner(
    mostSvg,
    520 / 2,
    correlationHeight / 2
  );
  
  const leastSpinner = createLoadingSpinner(
    leastSvg,
    520 / 2,
    correlationHeight / 2
  );
  
  // Load data for the most and least correlated stocks
  let mostCorrelatedData = null;
  let leastCorrelatedData = null;
  
  try {
    // Get the selected date range
    const startIdx = Math.max(0, Math.min(selectedStartIdx, localWeeklyData.length - 1));
    const endIdx = Math.max(0, Math.min(selectedEndIdx, localWeeklyData.length - 1));
    
    const minDate = localWeeklyData[startIdx].date;
    const maxDate = localWeeklyData[endIdx].date;
    
    // Filter the main data to the selected range
    const filteredMainData = localWeeklyData.slice(startIdx, endIdx + 1);
    
    // Load data for the most correlated stock
    if (correlationData.most_correlated_stock !== "None") {
      const mostData = await loadCorrelatedStockData(correlationData.most_correlated_stock);
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
          { 
            tooltip,
            correlationValue: correlationData.most_correlated_stock_correlation,
            stocksDatabase: dependencies.stocksDatabase
          }
        );
      }
    } else {
      // Remove spinner and show no data message
      mostSpinner.remove();
      mostSvg.append("text")
        .attr("x", 520 / 2)
        .attr("y", correlationHeight / 2)
        .attr("text-anchor", "middle")
        .text("No most correlated stock found");
    }
    
    // Load data for the least correlated stock
    if (correlationData.least_correlated_stock !== "None") {
      const leastData = await loadCorrelatedStockData(correlationData.least_correlated_stock);
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
          { 
            tooltip,
            correlationValue: correlationData.least_correlated_stock_correlation,
            stocksDatabase: dependencies.stocksDatabase
          }
        );
      }
    } else {
      // Remove spinner and show no data message
      leastSpinner.remove();
      leastSvg.append("text")
        .attr("x", 520 / 2)
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
      .attr("x", 520 / 2)
      .attr("y", correlationHeight / 2)
      .attr("text-anchor", "middle")
      .text("Error loading data");
      
    leastSvg.append("text")
      .attr("x", 520 / 2)
      .attr("y", correlationHeight / 2)
      .attr("text-anchor", "middle")
      .text("Error loading data");
  }
}

// Function to draw a single correlation chart
function drawCorrelationChart(svg, mainData, correlatedData, mainSymbol, correlatedSymbol, minDate, maxDate, isMostCorrelated, dependencies) {
  const { tooltip, correlationValue, stocksDatabase } = dependencies;
  
  // Set chart dimensions
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  
  // Position chart elements - no internal margins reducing the chart height
  const titleHeight = 60;  // Space for title
  const bottomSpace = 140; // Space for boxes and company name below chart
  const chartTop = titleHeight + 20; // Increased by 20
  const chartHeight = 240;   // Decreased by 20
  const chartWidth = 460 - 40; // Chart width with only left margin for y-axis
  const leftMargin = 40;    // Space for y-axis
  
  // Create the chart area
  const chart = svg.append("g")
    .attr("transform", `translate(${(width - 460) / 2 + leftMargin},${chartTop})`);
  
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
  
  // Find min and max of normalized values for both stocks
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
  
  // Create the tick values for the y-axis
  const yTickValues = yScale.ticks(5);
  
  // Add horizontal grid lines that match the tick values
  yTickValues.forEach(tickValue => {
    chart.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(tickValue))
      .attr("x2", chartWidth)
      .attr("y2", yScale(tickValue))
      .attr("stroke", "#D9D9D9")
      .attr("stroke-width", "1px");
  });
  
  // Add axes with text labels but hide the lines
  chart.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.timeFormat("%b '%y")))
    .call(g => g.select(".domain").remove()) // Remove x-axis line
    .call(g => g.selectAll(".tick line").remove()); // Remove tick lines
    
  chart.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d.toFixed(0)}`))
    .call(g => g.select(".domain").remove()) // Remove y-axis line
    .call(g => g.selectAll(".tick line").remove()); // Remove tick lines
  
  // Line generator
  const line = d3.line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);
  
  // Colors based on whether this is most or least correlated
  const lineColor = isMostCorrelated ? "#00BF7F" : "#DB5167";
  const fillColor = isMostCorrelated ? "#B6E2D3" : "#F5B9C3";
  const boxColor = isMostCorrelated ? "#7ECCB1" : "#E77C8D";
  
  // Create an area generator for the fill
  const area = d3.area()
    .x(d => xScale(d.date))
    .y0(chartHeight)
    .y1(d => yScale(d.value))
    .curve(d3.curveMonotoneX);
  
  // Add area fill under the line
  chart.append("path")
    .datum(normalizedCorrelatedData)
    .attr("class", "area")
    .attr("fill", fillColor)
    .attr("d", area);
  
  // Add the main stock line in a neutral color
  chart.append("path")
    .datum(normalizedMainData)
    .attr("class", "line main-line")
    .attr("fill", "none")
    .attr("stroke", "#888888")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "3,3")
    .attr("d", line);
  
  // Add the correlated stock line
  chart.append("path")
    .datum(normalizedCorrelatedData)
    .attr("class", "line correlated-line")
    .attr("fill", "none")
    .attr("stroke", lineColor)
    .attr("stroke-width", 2)
    .attr("d", line);
  
  // Find company name for the ticker
  const company = stocksDatabase?.find(s => s.symbol === correlatedSymbol);
  const companyName = company ? company.name : "Microsoft Corp NASDAQ";
  
  // Create the boxes for ticker and correlation value
  const boxGroup = svg.append("g")
    .attr("transform", `translate(${width/2}, ${chartTop + chartHeight + 50})`);
  
  // Large background box (320x70)
  boxGroup.append("rect")
    .attr("x", -160)
    .attr("y", -10)
    .attr("width", 320)
    .attr("height", 70)
    .attr("rx", 35)
    .attr("ry", 35)
    .attr("fill", fillColor);
  
  // Smaller box for ticker (160x70)
  boxGroup.append("rect")
    .attr("x", -160)
    .attr("y", -10)
    .attr("width", 160)
    .attr("height", 70)
    .attr("rx", 35)
    .attr("ry", 35)
    .attr("fill", boxColor);
  
  // Format correlation value
  const corrValue = correlationValue.toFixed(2);
  
  // Add ticker to the left box
  boxGroup.append("text")
    .attr("x", -80)
    .attr("y", 38)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .style("font-size", "40px")
    .style("font-weight", "bold")
    .style("font-family", "'Roboto', sans-serif")
    .text(correlatedSymbol);
  
  // Add correlation value to the right box
  boxGroup.append("text")
    .attr("x", 75)
    .attr("y", 38)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .style("font-size", "40px")
    .style("font-weight", "bold")
    .style("font-family", "'Roboto', sans-serif")
    .text(corrValue);
  
  // Add company name below
  boxGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 77)
    .attr("fill", "#555")
    .style("font-size", "13px")
    .style("font-family", "'Roboto', sans-serif")
    .text(companyName);
}

// Export the functions and constants
export { 
  correlationMargin, 
  correlationWidth, 
  correlationHeight,
  updateCorrelationChart,
  drawCorrelationChart 
}; 