// Dimensions for the correlation chart
const correlationMargin = {top: 0, right: 0, bottom: 0, left: 0}; 
const correlationWidth = 1080;
const correlationHeight = 460;

async function updateCorrelationChart(correlationData, symbol, startDate, endDate, selectedStartIdx, selectedEndIdx, dependencies) {
  const { currentWeeklyData, loadStockData, createLoadingSpinner, tooltip } = dependencies;
  
  const localWeeklyData = [...currentWeeklyData];
  
  // This part loads the most/least correlated stock data since only the ticker is passed from the dashboard
  const loadCorrelatedStockData = async (correlatedSymbol) => {
    try {
      const data = await loadStockData(correlatedSymbol, false);
      return data;
    } catch (error) {
      console.error(`Error loading correlated stock data for ${correlatedSymbol}:`, error);
      return null;
    }
  };
  
  const corrContainer = d3.select("#correlationChart");
  
  corrContainer.selectAll("*").remove();
  
  // Make space for the two charts
  const chartContainer = corrContainer.append("div")
    .style("display", "flex")
    .style("width", "100%")
    .style("height", "100%")
    .style("justify-content", "flex-start")
    .style("padding", "0")
    .style("border", "0");
    
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
  
  const mostSvg = mostCorrChart.append("svg")
    .attr("width", 520)
    .attr("height", 460);
    
  const leastSvg = leastCorrChart.append("svg")
    .attr("width", 520)
    .attr("height", 460);
  
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
  
  if (!correlationData) {
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
  
  let mostCorrelatedData = null;
  let leastCorrelatedData = null;
  
  // try loading data and draw the charts
  try {
    const startIdx = Math.max(0, Math.min(selectedStartIdx, localWeeklyData.length - 1));
    const endIdx = Math.max(0, Math.min(selectedEndIdx, localWeeklyData.length - 1));
    
    const minDate = localWeeklyData[startIdx].date;
    const maxDate = localWeeklyData[endIdx].date;
    
    const filteredMainData = localWeeklyData.slice(startIdx, endIdx + 1);
    
    // try most correlated stock data
    if (correlationData.most_correlated_stock && correlationData.most_correlated_stock !== "None") {
      const mostCorrelatedTicker = correlationData.most_correlated_stock;
      const mostData = await loadCorrelatedStockData(mostCorrelatedTicker);
      
      if (mostData) {
        mostCorrelatedData = mostData.weekly.filter(d => 
          d.date >= minDate && d.date <= maxDate
        );
        
        mostSpinner.remove();
        
        drawCorrelationChart(
          mostSvg,
          filteredMainData,
          mostCorrelatedData,
          symbol,
          mostCorrelatedTicker,
          minDate,
          maxDate,
          true,
          { 
            tooltip,
            correlationValue: correlationData.most_correlated_stock_correlation,
            stocksDatabase: dependencies.stocksDatabase
          }
        );
      } else {
        mostSpinner.remove();
        mostSvg.append("text")
          .attr("x", 520 / 2)
          .attr("y", correlationHeight / 2)
          .attr("text-anchor", "middle")
          .text(`Error loading data for ${mostCorrelatedTicker}`);
      }
    } else {
      mostSpinner.remove();
      mostSvg.append("text")
        .attr("x", 520 / 2)
        .attr("y", correlationHeight / 2)
        .attr("text-anchor", "middle")
        .text("No most correlated stock found");
    }
    
    // try least correlated stock data
    if (correlationData.least_correlated_stock && correlationData.least_correlated_stock !== "None") {
      const leastCorrelatedTicker = correlationData.least_correlated_stock;
      const leastData = await loadCorrelatedStockData(leastCorrelatedTicker);
      
      if (leastData) {
        leastCorrelatedData = leastData.weekly.filter(d => 
          d.date >= minDate && d.date <= maxDate
        );
        
        leastSpinner.remove();
        
        drawCorrelationChart(
          leastSvg,
          filteredMainData,
          leastCorrelatedData,
          symbol,
          leastCorrelatedTicker,
          minDate,
          maxDate,
          false,
          { 
            tooltip,
            correlationValue: correlationData.least_correlated_stock_correlation,
            stocksDatabase: dependencies.stocksDatabase
          }
        );
      } else {
        leastSpinner.remove();
        leastSvg.append("text")
          .attr("x", 520 / 2)
          .attr("y", correlationHeight / 2)
          .attr("text-anchor", "middle")
          .text(`Error loading data for ${leastCorrelatedTicker}`);
      }
    } else {
      leastSpinner.remove();
      leastSvg.append("text")
        .attr("x", 520 / 2)
        .attr("y", correlationHeight / 2)
        .attr("text-anchor", "middle")
        .text("No least correlated stock found");
    }
  } catch (error) {
    console.error("Error loading correlated stock data:", error);
    
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

function drawCorrelationChart(svg, mainData, correlatedData, mainSymbol, correlatedSymbol, minDate, maxDate, isMostCorrelated, dependencies) {
  const { tooltip, correlationValue, stocksDatabase } = dependencies;
  
  const width = +svg.attr("width");
  const height = +svg.attr("height");
  
  const titleHeight = 60;  // Space for title
  const bottomSpace = 140; // Space for boxes and company name below chart
  const chartTop = titleHeight + 20; // Increased by 20
  const chartHeight = 240;   // Decreased by 20
  const chartWidth = 460 - 40; // Chart width with only left margin for y-axis
  const leftMargin = 40;    // Space for y-axis
  
  const chart = svg.append("g")
    .attr("transform", `translate(${(width - 460) / 2 + leftMargin},${chartTop})`);
  
  const normalizeData = (data) => {
    if (!data || data.length === 0) return [];
    
    const firstValue = data[0].close;
    return data.map(d => ({
      date: d.date,
      value: (d.close / firstValue) * 100
    }));
  };
  
  const normalizedMainData = normalizeData(mainData);
  const normalizedCorrelatedData = normalizeData(correlatedData);
  
  const allValues = [
    ...normalizedMainData.map(d => d.value),
    ...normalizedCorrelatedData.map(d => d.value)
  ];
  
  // range for the y-axis
  const yMin = d3.min(allValues) * 0.95;
  const yMax = d3.max(allValues) * 1.05;
  
  // Create scales
  const xScale = d3.scaleTime()
    .domain([minDate, maxDate])
    .range([0, chartWidth]);
    
  const yScale = d3.scaleLinear()
    .domain([yMin, yMax])
    .range([chartHeight, 0]);
  
  const yTickValues = yScale.ticks(5);
  
  // for tick visuals
  yTickValues.forEach(tickValue => {
    chart.append("line")
      .attr("x1", 0)
      .attr("y1", yScale(tickValue))
      .attr("x2", chartWidth)
      .attr("y2", yScale(tickValue))
      .attr("stroke", "#D9D9D9")
      .attr("stroke-width", "1px");
  });
  
  chart.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale).ticks(4).tickFormat(d3.timeFormat("%b '%y")))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").remove());
    
  chart.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d.toFixed(0)}`))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").remove());
  
  const line = d3.line()
    .x(d => xScale(d.date))
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);
  
  // colors for the lines
  const lineColor = isMostCorrelated ? "#00BF7F" : "#DB5167";
  const fillColor = isMostCorrelated ? "#B6E2D3" : "#F5B9C3";
  const boxColor = isMostCorrelated ? "#7ECCB1" : "#E77C8D";
  
  // fills the area under the line
  const area = d3.area()
    .x(d => xScale(d.date))
    .y0(chartHeight)
    .y1(d => yScale(d.value))
    .curve(d3.curveMonotoneX);
  
  chart.append("path")
    .datum(normalizedCorrelatedData)
    .attr("class", "area")
    .attr("fill", fillColor)
    .attr("d", area);
  
  chart.append("path")
    .datum(normalizedMainData)
    .attr("class", "line main-line")
    .attr("fill", "none")
    .attr("stroke", "#888888")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "3,3")
    .attr("d", line);
  
  chart.append("path")
    .datum(normalizedCorrelatedData)
    .attr("class", "line correlated-line")
    .attr("fill", "none")
    .attr("stroke", lineColor)
    .attr("stroke-width", 2)
    .attr("d", line);
  
  // find company name for the ticker
  const company = stocksDatabase?.find(s => s.symbol === correlatedSymbol);
  const companyName = company ? company.name : "N/A";
  
  // make box to show the ticker and correlation value
  const boxGroup = svg.append("g")
    .attr("transform", `translate(${width/2}, ${chartTop + chartHeight + 50})`);
  
  boxGroup.append("rect")
    .attr("x", -160)
    .attr("y", -10)
    .attr("width", 320)
    .attr("height", 70)
    .attr("rx", 35)
    .attr("ry", 35)
    .attr("fill", fillColor);
  
  boxGroup.append("rect")
    .attr("x", -160)
    .attr("y", -10)
    .attr("width", 160)
    .attr("height", 70)
    .attr("rx", 35)
    .attr("ry", 35)
    .attr("fill", boxColor);
  
  const corrValue = correlationValue.toFixed(2);
  
  boxGroup.append("text")
    .attr("x", -80)
    .attr("y", 38)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .style("font-size", "40px")
    .style("font-weight", "bold")
    .style("font-family", "'Roboto', sans-serif")
    .text(correlatedSymbol);
  
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

export { 
  correlationMargin, 
  correlationWidth, 
  correlationHeight,
  updateCorrelationChart,
  drawCorrelationChart 
}; 