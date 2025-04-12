// Line chart structure and functionality
// Set up dimensions for line chart
const lineMargin = {top: 100, right: 20, bottom: 50, left: 50};
const lineWidth = 1080 - lineMargin.left - lineMargin.right;
const lineHeight = 800 - lineMargin.top - lineMargin.bottom;

// Create a line chart
function drawlineChart(weeklyData, dailyData, selectedStartIdx, selectedEndIdx, dependencies) {
  const { lineSvg, formatMonthYear, formatDate, DISPLAY_START_DATE, DISPLAY_END_DATE, tooltip } = dependencies;
  
  // Clear previous chart
  lineSvg.selectAll("*").remove();
  
  // Format dates and ensure numerical values (weeklyData is already formatted)
  const filteredData = weeklyData;
  
  // Check if we have data to display
  if (filteredData.length === 0) {
    console.error("No data to display in the selected date range");
    return;
  }
  
  // Ensure valid indices
  selectedStartIdx = Math.max(0, Math.min(selectedStartIdx, filteredData.length - 1));
  selectedEndIdx = Math.max(0, Math.min(selectedEndIdx, filteredData.length - 1));
  
  // Set up scales for the full date range
  const xScale = d3.scaleBand()
    .domain(filteredData.map(d => d.date))
    .range([lineMargin.left, lineWidth - lineMargin.right])
    .padding(0.2);
  
  const yScale = d3.scaleLinear()
    .domain([
      d3.min(filteredData, d => d.low) * 0.99,
      d3.max(filteredData, d => d.high) * 1.01
    ])
    .range([lineHeight - lineMargin.bottom, lineMargin.top]);
  
  // Store quarters we've already seen to avoid duplicate ticks
  const seenQuarters = new Set();
  
  // Function to determine if a date is the first occurrence of a quarter start month
  const isFirstQuarterOccurrence = (date) => {
    const month = date.getMonth();
    const year = date.getFullYear();
    
    // Check if it's a quarter start month (Jan, Apr, Jul, Oct)
    if (month % 3 === 0) {
      const quarterKey = `${year}-${month}`;
      
      // If we haven't seen this quarter yet, mark it and return true
      if (!seenQuarters.has(quarterKey)) {
        seenQuarters.add(quarterKey);
        return true;
      }
    }
    
    return false;
  };
  
  // Create x-axis with better date formatting
  const xAxis = d3.axisBottom(xScale)
    .tickValues(
      filteredData
        .map(d => d.date)
        .filter(date => isFirstQuarterOccurrence(date))
    )
    .tickFormat(d => formatMonthYear(d));
  
  // Add X axis
  lineSvg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${lineHeight - lineMargin.bottom})`)
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");
  
  // Add Y axis
  lineSvg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${lineMargin.left},0)`)
    .call(d3.axisLeft(yScale));
  
  // Add grid lines
  lineSvg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${lineHeight - lineMargin.bottom})`)
    .call(d3.axisBottom(xScale)
      .tickValues([])
      .tickSize(-(lineHeight - lineMargin.top - lineMargin.bottom))
      .tickFormat("")
    );
  
  lineSvg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${lineMargin.left},0)`)
    .call(d3.axisLeft(yScale)
      .tickSize(-(lineWidth - lineMargin.left - lineMargin.right))
      .tickFormat("")
    );
  
  // Create line generator for the price line
  const line = d3.line()
    .x(d => xScale(d.date) + xScale.bandwidth() / 2)
    .y(d => yScale(d.close))
    .curve(d3.curveMonotoneX);
  
  // Draw the price line
  lineSvg.append("path")
    .datum(filteredData)
    .attr("class", "price-line")
    .attr("fill", "none")
    .attr("stroke", "#1976D2")
    .attr("stroke-width", 2)
    .attr("d", line);
  
  // Add dots for data points with tooltips
  lineSvg.selectAll(".data-point")
    .data(filteredData)
    .enter()
    .append("circle")
    .attr("class", "data-point")
    .attr("cx", d => xScale(d.date) + xScale.bandwidth() / 2)
    .attr("cy", d => yScale(d.close))
    .attr("r", 3)
    .attr("fill", "#1976D2")
    .on("mouseover", function(event, d) {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`
        <strong>Week of:</strong> ${formatDate(d.date)}<br>
        <strong>Price:</strong> $${d.close.toFixed(2)}<br>
        <strong>High:</strong> $${d.high.toFixed(2)}<br>
        <strong>Low:</strong> $${d.low.toFixed(2)}
        ${d.volume ? `<br><strong>Volume:</strong> ${d.volume.toLocaleString()}` : ''}
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
        
      // Highlight the point
      d3.select(this)
        .attr("r", 5)
        .attr("fill", "#FF5722");
    })
    .on("mouseout", function(d) {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
        
      // Reset point style
      d3.select(this)
        .attr("r", 3)
        .attr("fill", "#1976D2");
    });
  
  // Add shaded regions for unselected areas based on the slider positions
  const startDate = filteredData[selectedStartIdx].date;
  const endDate = filteredData[selectedEndIdx].date;
  
  // Create a clipping path for the selected region to make it stand out
  lineSvg.append("defs")
    .append("clipPath")
    .attr("id", "selected-region")
    .append("rect")
    .attr("x", xScale(startDate))
    .attr("y", lineMargin.top)
    .attr("width", xScale(endDate) + xScale.bandwidth() - xScale(startDate))
    .attr("height", lineHeight - lineMargin.top - lineMargin.bottom);
  
  // Left shade (before start handle)
  if (selectedStartIdx > 0) {
    lineSvg.append("rect")
      .attr("class", "chart-shade-left")
      .attr("x", lineMargin.left)
      .attr("y", lineMargin.top)
      .attr("width", xScale(startDate) - lineMargin.left)
      .attr("height", lineHeight - lineMargin.top - lineMargin.bottom);
  }
  
  // Right shade (after end handle)
  if (selectedEndIdx < filteredData.length - 1) {
    lineSvg.append("rect")
      .attr("class", "chart-shade-right")
      .attr("x", xScale(endDate) + xScale.bandwidth())
      .attr("y", lineMargin.top)
      .attr("width", (lineWidth - lineMargin.right) - (xScale(endDate) + xScale.bandwidth()))
      .attr("height", lineHeight - lineMargin.top - lineMargin.bottom);
  }
  
  // Calculate and draw moving averages if showMovingAverages is enabled
  const showingMA = d3.select("#maToggle").property("checked");
  if (showingMA && dailyData) {
    const maType = d3.select('input[name="maType"]:checked').property("value");
    let period;
    let color;
    
    switch(maType) {
      case "7day":
        period = 7;
        color = "#2196F3"; // Blue
        break;
      case "14day":
        period = 14;
        color = "#4CAF50"; // Green
        break;
      case "30day":
        period = 30;
        color = "#FF9800"; // Orange
        break;
      case "90day":
        period = 90;
        color = "#9C27B0"; // Purple
        break;
      default:
        period = 7;
        color = "#2196F3";
    }
    
    // Filter daily data to match display range
    const displayDailyData = dailyData.filter(d => 
      d.date >= DISPLAY_START_DATE && d.date <= DISPLAY_END_DATE
    );
    
    // Calculate moving average on daily data
    const dailyMA = [];
    for (let i = period - 1; i < displayDailyData.length; i++) {
      const sum = displayDailyData.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
      dailyMA.push({
        date: displayDailyData[i].date,
        value: sum / period
      });
    }
    
    // Map daily MA to weekly points 
    // Find closest MA point to each weekly line
    const maData = filteredData.map(weekData => {
      // Find the closest daily MA point to this week's end date
      const closestMA = dailyMA.reduce((closest, current) => {
        const currentDiff = Math.abs(current.date - weekData.date);
        const closestDiff = Math.abs(closest.date - weekData.date);
        return currentDiff < closestDiff ? current : closest;
      }, dailyMA[0]);
      
      return {
        date: weekData.date,
        value: closestMA.value
      };
    });
    
    // Draw moving average line
    const maLine = d3.line()
      .x(d => xScale(d.date) + xScale.bandwidth() / 2)
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
      
    lineSvg.append("path")
      .datum(maData)
      .attr("class", "ma-line")
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", maLine);
      
    // Add legend for moving average
    lineSvg.append("rect")
      .attr("x", lineWidth - 150)
      .attr("y", 15)
      .attr("width", 15)
      .attr("height", 3)
      .attr("fill", color);
      
    lineSvg.append("text")
      .attr("x", lineWidth - 130)
      .attr("y", 18)
      .attr("font-size", "10px")
      .text(`${period} Day MA`);
  }
  
  // Add legend for the price line
  lineSvg.append("rect")
    .attr("x", lineWidth - 150)
    .attr("y", 35)
    .attr("width", 15)
    .attr("height", 3)
    .attr("fill", "#1976D2");
    
  lineSvg.append("text")
    .attr("x", lineWidth - 130)
    .attr("y", 38)
    .attr("font-size", "10px")
    .text("Closing Price");
  
  // Highlight the selected range with a border or indicator
  lineSvg.append("rect")
    .attr("class", "selection-indicator")
    .attr("x", xScale(startDate))
    .attr("y", lineMargin.top)
    .attr("width", xScale(endDate) + xScale.bandwidth() - xScale(startDate))
    .attr("height", lineHeight - lineMargin.top - lineMargin.bottom)
    .attr("fill", "none")
    .attr("stroke", "#2196F3")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5")
    .attr("pointer-events", "none");
}

// Export the functions and constants
export { 
  lineMargin, 
  lineWidth, 
  lineHeight,
  drawlineChart 
}; 