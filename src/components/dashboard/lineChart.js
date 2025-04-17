
const lineMargin = {top: 0, right: 50, bottom: 30, left: 100};
const lineWidth = 1080 - lineMargin.left - lineMargin.right;
const lineHeight = 500 - lineMargin.top - lineMargin.bottom;

function calculateMovingAverage(displayDailyData, period) {
  const dailyMA = [];
  for (let i = period - 1; i < displayDailyData.length; i++) {
    const sum = displayDailyData.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
    dailyMA.push({
      date: displayDailyData[i].date,
      value: sum / period
    });
  }
  return dailyMA;
}

function mapMovingAverageToWeekly(filteredData, dailyMA) {
  return filteredData.map(weekData => {
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
}

function drawlineChart(weeklyData, dailyData, selectedStartIdx, selectedEndIdx, dependencies) {
  const { lineSvg, formatMonthYear, formatDate, DISPLAY_START_DATE, DISPLAY_END_DATE, tooltip } = dependencies;
  
  lineSvg.selectAll("*").remove();
  
  const filteredData = weeklyData;
  
  // Check if we have data to display
  if (filteredData.length === 0) {
    console.error("No data to display in the selected date range");
    return;
  }
  
  selectedStartIdx = Math.max(0, Math.min(selectedStartIdx, filteredData.length - 1));
  selectedEndIdx = Math.max(0, Math.min(selectedEndIdx, filteredData.length - 1));
  
  // Determine if price has increased or decreased in the selected range
  const startPrice = filteredData[selectedStartIdx].close;
  const endPrice = filteredData[selectedEndIdx].close;
  const priceIncreased = endPrice >= startPrice;
  
  // Calculate percentage change
  const percentChange = ((endPrice - startPrice) / startPrice * 100).toFixed(1);
  const dayCount = selectedEndIdx - selectedStartIdx;
  
  // Update UI elements with new data
  d3.select("#stockPrice")
    .text(`$${endPrice.toFixed(2)}`)
    .attr("class", priceIncreased ? "price-up" : "price-down");
  
  d3.select("#priceChange")
    .html(`<span class="${priceIncreased ? "price-up" : "price-down"}">${Math.abs(percentChange)}%</span> ${priceIncreased ? "increases" : "decreases"} in ${dayCount} days`);
  
  const xScale = d3.scaleBand()
    .domain(filteredData.map(d => d.date))
    .range([lineMargin.left, lineWidth + lineMargin.left])
    .padding(0.2);
  
  const yScale = d3.scaleLinear()
    .domain([
      d3.min(filteredData, d => d.low) * 0.99,
      d3.max(filteredData, d => d.high) * 1.01
    ])
    .range([lineHeight - lineMargin.bottom, lineMargin.top]);
  
  // Draw the chart components
  drawAxes(lineSvg, xScale, yScale, filteredData, formatMonthYear);
  drawGridLines(lineSvg, xScale, yScale);
  drawAreaUnderLine(lineSvg, filteredData, xScale, yScale, priceIncreased);
  drawPriceLine(lineSvg, filteredData, xScale, yScale, tooltip, formatDate, priceIncreased);
  
  // Add shaded regions for unselected areas based on the slider positions
  const startDate = filteredData[selectedStartIdx].date;
  const endDate = filteredData[selectedEndIdx].date;
  
  // Create a clipping path and highlight the selected region
  highlightSelectedRegion(lineSvg, xScale, startDate, endDate, selectedStartIdx, selectedEndIdx, 
                         filteredData, lineMargin, lineHeight);
  
  // Calculate and draw moving averages if showMovingAverages is enabled
  const showingMA = d3.select("#maToggle").property("checked");
  if (showingMA && dailyData) {
    // Get selected MA buttons
    const selectedMAs = Array.from(document.querySelectorAll('.ma-button.selected'))
      .map(button => parseInt(button.getAttribute('data-days')));
      
    // If no buttons selected, default to all
    const periods = selectedMAs.length > 0 ? selectedMAs : [7, 14, 30, 90];
    
    // Draw each selected MA
    periods.forEach(period => {
      drawMovingAverage(lineSvg, filteredData, dailyData, xScale, yScale, 
                       DISPLAY_START_DATE, DISPLAY_END_DATE, period);
    });
  }
}

// Helper function to draw axes
function drawAxes(svg, xScale, yScale, filteredData, formatMonthYear) {
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
  svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${lineHeight - lineMargin.bottom})`)
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");
  
  // Add Y axis with fewer ticks
  svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${lineMargin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(5));
}

// Helper function to draw grid lines
function drawGridLines(svg, xScale, yScale) {
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${lineHeight - lineMargin.bottom})`)
    .call(d3.axisBottom(xScale)
      .tickValues([])
      .tickSize(-(lineHeight - lineMargin.top - lineMargin.bottom))
      .tickFormat("")
    );
  
  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${lineMargin.left},0)`)
    .call(d3.axisLeft(yScale)
      .ticks(5)
      .tickSize(-(lineWidth))
      .tickFormat("")
    );
}

// Helper function to draw area under the line
function drawAreaUnderLine(svg, filteredData, xScale, yScale, priceIncreased) {
  const area = d3.area()
    .x(d => xScale(d.date) + xScale.bandwidth() / 2)
    .y0(lineHeight - lineMargin.bottom)
    .y1(d => yScale(d.close))
    .curve(d3.curveMonotoneX);
    
  svg.append("path")
    .datum(filteredData)
    .attr("class", priceIncreased ? "area-up" : "area-down")
    .attr("d", area);
}

// Helper function to draw the price line with data points
function drawPriceLine(svg, filteredData, xScale, yScale, tooltip, formatDate, priceIncreased) {
  // Create line generator for the price line
  const line = d3.line()
    .x(d => xScale(d.date) + xScale.bandwidth() / 2)
    .y(d => yScale(d.close))
    .curve(d3.curveMonotoneX);
  
  // Draw the price line
  svg.append("path")
    .datum(filteredData)
    .attr("class", priceIncreased ? "price-line-up" : "price-line-down")
    .attr("d", line);
  
  // Add dots for data points with tooltips
  svg.selectAll(".data-point")
    .data(filteredData)
    .enter()
    .append("circle")
    .attr("class", d => `data-point ${priceIncreased ? "data-point-up" : "data-point-down"}`)
    .attr("cx", d => xScale(d.date) + xScale.bandwidth() / 2)
    .attr("cy", d => yScale(d.close))
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
        .attr("r", 5);
    })
    .on("mouseout", function(d) {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
        
      // Reset point style
      d3.select(this)
        .attr("r", 3);
    });
}

// Helper function to highlight the selected region
function highlightSelectedRegion(svg, xScale, startDate, endDate, selectedStartIdx, selectedEndIdx, 
                               filteredData, lineMargin, lineHeight) {
  // Left shade (before start handle)
  if (selectedStartIdx > 0) {
    // Add left shaded area
    svg.append("rect")
      .attr("class", "chart-shade-left")
      .attr("x", lineMargin.left)
      .attr("y", lineMargin.top)
      .attr("width", xScale(startDate) - lineMargin.left)
      .attr("height", lineHeight - lineMargin.top - lineMargin.bottom)
      .attr("fill", "#F1EEEB")
      .attr("fill-opacity", 0.6);
      
    // Add right border for left shade
    svg.append("line")
      .attr("class", "chart-shade-border")
      .attr("x1", xScale(startDate))
      .attr("y1", lineMargin.top)
      .attr("x2", xScale(startDate))
      .attr("y2", lineHeight - lineMargin.bottom)
      .attr("stroke", "#A38E79")
      .attr("stroke-width", 6);
  }
  
  // Right shade (after end handle)
  if (selectedEndIdx < filteredData.length - 1) {
    // Add right shaded area
    svg.append("rect")
      .attr("class", "chart-shade-right")
      .attr("x", xScale(endDate) + xScale.bandwidth())
      .attr("y", lineMargin.top)
      .attr("width", (lineWidth+lineMargin.left) - (xScale(endDate) + xScale.bandwidth()))
      .attr("height", lineHeight - lineMargin.top - lineMargin.bottom)
      .attr("fill", "#F1EEEB")
      .attr("fill-opacity", 0.6);
      
    // Add left border for right shade
    svg.append("line")
      .attr("class", "chart-shade-border")
      .attr("x1", xScale(endDate) + xScale.bandwidth())
      .attr("y1", lineMargin.top)
      .attr("x2", xScale(endDate) + xScale.bandwidth())
      .attr("y2", lineHeight - lineMargin.bottom)
      .attr("stroke", "#A38E79")
      .attr("stroke-width", 6);
  }
  
  // Add date labels under the chart
  // Format dates as "31, Mar '22"
  const formatDateLabel = d3.timeFormat("%d, %b '%y");
  
  // Start date label
  const startLabelX = xScale(startDate) - 65; // Center the 130px box on the handle
  
  // Start date box
  svg.append("rect")
    .attr("class", "date-label-box")
    .attr("x", startLabelX)
    .attr("y", lineHeight - lineMargin.bottom) // Position below the chart
    .attr("width", 100)
    .attr("height", 30)
    .attr("rx", 15) // Rounded corners
    .attr("ry", 15)
    .attr("fill", "#A38E79");
  
  // Start date text
  svg.append("text")
    .attr("class", "date-label-text")
    .attr("x", startLabelX + 50) // Center in box
    .attr("y", lineHeight - lineMargin.bottom + 17) // Center vertically
    .attr("text-anchor", "middle") // Center text
    .attr("fill", "white")
    .attr("font-size", "20px")
    .attr("font-family", "'Roboto', sans-serif")
    .text(formatDateLabel(startDate));
  
  // End date label
  const endLabelX = xScale(endDate) + xScale.bandwidth() - 50; // Center the 130px box on the handle
  
  // End date box
  svg.append("rect")
    .attr("class", "date-label-box")
    .attr("x", endLabelX)
    .attr("y", lineHeight - lineMargin.bottom) // Position below the chart
    .attr("width", 100)
    .attr("height", 30)
    .attr("rx", 15) // Rounded corners
    .attr("ry", 15)
    .attr("fill", "#A38E79");
  
  // End date text
  svg.append("text")
    .attr("class", "date-label-text")
    .attr("x", endLabelX + 50) // Center in box
    .attr("y", lineHeight - lineMargin.bottom + 17) // Center vertically
    .attr("text-anchor", "middle") // Center text
    .attr("fill", "white")
    .attr("font-size", "20px")
    .attr("font-family", "'Roboto', sans-serif")
    .text(formatDateLabel(endDate));
}

// Helper function to draw moving average lines
function drawMovingAverage(svg, filteredData, dailyData, xScale, yScale, DISPLAY_START_DATE, DISPLAY_END_DATE, period) {
  let color;
  
  switch(period) {
    case 7:
      color = "#2196F3"; // Blue
      break;
    case 14:
      color = "#4CAF50"; // Green
      break;
    case 30:
      color = "#FF9800"; // Orange
      break;
    case 90:
      color = "#9C27B0"; // Purple
      break;
    default:
      color = "#2196F3";
  }
  
  // Filter daily data to match display range
  const displayDailyData = dailyData.filter(d => 
    d.date >= DISPLAY_START_DATE && d.date <= DISPLAY_END_DATE
  );
  
  // Calculate moving average
  const dailyMA = calculateMovingAverage(displayDailyData, period);
  
  // Map daily MA to weekly points
  const maData = mapMovingAverageToWeekly(filteredData, dailyMA);
  
  // Draw moving average line
  const maLine = d3.line()
    .x(d => xScale(d.date) + xScale.bandwidth() / 2)
    .y(d => yScale(d.value))
    .curve(d3.curveMonotoneX);
    
  svg.append("path")
    .datum(maData)
    .attr("class", "ma-line")
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", 2)
    .attr("d", maLine);
    
  // Add legend for moving average
  svg.append("rect")
    .attr("x", lineWidth - 150)
    .attr("y", 15 + (period === 7 ? 0 : period === 14 ? 20 : period === 30 ? 40 : 60))
    .attr("width", 15)
    .attr("height", 3)
    .attr("fill", color);
    
  svg.append("text")
    .attr("x", lineWidth - 130)
    .attr("y", 18 + (period === 7 ? 0 : period === 14 ? 20 : period === 30 ? 40 : 60))
    .attr("font-size", "10px")
    .attr("font-family", "'Roboto', sans-serif")
    .text(`${period} Day MA`);
}

// Export the functions and constants
export { 
  lineMargin, 
  lineWidth, 
  lineHeight,
  drawlineChart 
}; 