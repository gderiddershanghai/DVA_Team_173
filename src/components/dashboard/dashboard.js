// Set up dimensions for different components
const candleMargin = {top: 100, right: 20, bottom: 50, left: 50};
const tableMargin = {top: 20, right: 20, bottom: 20, left: 20};
const correlationMargin = {top: 20, right: 20, bottom: 20, left: 20};
const sentimentMargin = {top: 20, right: 20, bottom: 20, left: 20};
const candleWidth = 900, candleHeight = 600;
const tableWidth = 300, tableHeight = 600;
const correlationWidth = 900, correlationHeight = 300;
const sentimentWidth = 300, sentimentHeight = 300;

// Format date for display
const formatDate = d3.timeFormat("%b %d, %Y");
const formatMonthYear = d3.timeFormat("%b %Y");
const parseDate = d3.timeParse("%Y-%m-%d");

// Create SVG for the candle chart
const candleSvg = d3.select("#candleChart")
  .append("svg")
  .attr("width", candleWidth)
  .attr("height", candleHeight)
  .style("background-color", "#f9f9f9");

// Create tooltip for candles
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Range slider variables
let startPercent = 10;
let endPercent = 90;
let isDraggingStart = false;
let isDraggingEnd = false;

// Create a proper candle chart - always showing all data
function drawCandleChart(data, selectedStartIdx, selectedEndIdx) {
  // Clear previous chart
  candleSvg.selectAll("*").remove();
  
  // Format dates and ensure numerical values
  const formattedData = data.map(d => ({
    date: typeof d.date === 'string' ? parseDate(d.date) : d.date,
    open: +d.open,
    high: +d.high,
    low: +d.low,
    close: +d.close,
    volume: d.volume ? +d.volume : 0
  }));
  
  // Filter data to show 2020 and later (no upper year limit)
  const filteredData = formattedData.filter(d => 
    d.date.getFullYear() >= 2020
  );
  
  // Sort by date
  filteredData.sort((a, b) => a.date - b.date);
  
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
    .range([candleMargin.left, candleWidth - candleMargin.right])
    .padding(0.2);
  
  const yScale = d3.scaleLinear()
    .domain([
      d3.min(filteredData, d => d.low) * 0.99,
      d3.max(filteredData, d => d.high) * 1.01
    ])
    .range([candleHeight - candleMargin.bottom, candleMargin.top]);
  
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
  candleSvg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${candleHeight - candleMargin.bottom})`)
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");
  
  // Add Y axis
  candleSvg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${candleMargin.left},0)`)
    .call(d3.axisLeft(yScale));
  
  // Add grid lines
  candleSvg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${candleHeight - candleMargin.bottom})`)
    .call(d3.axisBottom(xScale)
      .tickValues([])
      .tickSize(-(candleHeight - candleMargin.top - candleMargin.bottom))
      .tickFormat("")
    );
  
  candleSvg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${candleMargin.left},0)`)
    .call(d3.axisLeft(yScale)
      .tickSize(-(candleWidth - candleMargin.left - candleMargin.right))
      .tickFormat("")
    );
  
  // Add candlesticks for all data
  const candles = candleSvg.selectAll(".candle")
    .data(filteredData)
    .enter()
    .append("g")
    .attr("class", "candle")
    .on("mouseover", function(event, d) {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`
        <strong>Week of:</strong> ${formatDate(d.date)}<br>
        <strong>Open:</strong> $${d.open.toFixed(2)}<br>
        <strong>High:</strong> $${d.high.toFixed(2)}<br>
        <strong>Low:</strong> $${d.low.toFixed(2)}<br>
        <strong>Close:</strong> $${d.close.toFixed(2)}
        ${d.volume ? `<br><strong>Volume:</strong> ${d.volume.toLocaleString()}` : ''}
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });
  
  // Draw candle wicks (high-low line)
  candles.append("line")
    .attr("class", "wick")
    .attr("x1", d => xScale(d.date) + xScale.bandwidth() / 2)
    .attr("x2", d => xScale(d.date) + xScale.bandwidth() / 2)
    .attr("y1", d => yScale(d.high))
    .attr("y2", d => yScale(d.low))
    .attr("stroke", "#000")
    .attr("stroke-width", 1);
  
  // Draw candle bodies
  candles.append("rect")
    .attr("class", "body")
    .attr("x", d => xScale(d.date))
    .attr("y", d => yScale(Math.max(d.open, d.close)))
    .attr("width", xScale.bandwidth())
    .attr("height", d => Math.abs(yScale(d.open) - yScale(d.close)))
    .attr("fill", d => d.open > d.close ? "#ef5350" : "#26a69a")
    .attr("stroke", "#000")
    .attr("stroke-width", 1);
  
  // Add shaded regions for unselected areas based on the slider positions
  const startDate = filteredData[selectedStartIdx].date;
  const endDate = filteredData[selectedEndIdx].date;
  
  // Create a clipping path for the selected region to make it stand out
  candleSvg.append("defs")
    .append("clipPath")
    .attr("id", "selected-region")
    .append("rect")
    .attr("x", xScale(startDate))
    .attr("y", candleMargin.top)
    .attr("width", xScale(endDate) + xScale.bandwidth() - xScale(startDate))
    .attr("height", candleHeight - candleMargin.top - candleMargin.bottom);
  
  // Left shade (before start handle)
  if (selectedStartIdx > 0) {
    candleSvg.append("rect")
      .attr("class", "chart-shade-left")
      .attr("x", candleMargin.left)
      .attr("y", candleMargin.top)
      .attr("width", xScale(startDate) - candleMargin.left)
      .attr("height", candleHeight - candleMargin.top - candleMargin.bottom);
  }
  
  // Right shade (after end handle)
  if (selectedEndIdx < filteredData.length - 1) {
    candleSvg.append("rect")
      .attr("class", "chart-shade-right")
      .attr("x", xScale(endDate) + xScale.bandwidth())
      .attr("y", candleMargin.top)
      .attr("width", (candleWidth - candleMargin.right) - (xScale(endDate) + xScale.bandwidth()))
      .attr("height", candleHeight - candleMargin.top - candleMargin.bottom);
  }
  
  // Calculate and draw moving averages if showMovingAverages is enabled
  const showingMA = d3.select("#maToggle").property("checked");
  if (showingMA) {
    const maType = d3.select('input[name="maType"]:checked').property("value");
    let period;
    let color;
    
    switch(maType) {
      case "7day":
        period = 7;
        color = "#2196F3"; // Blue
        break;
      case "30day":
        period = 30;
        color = "#FF9800"; // Orange
        break;
      case "60day":
        period = 60;
        color = "#9C27B0"; // Purple
        break;
      default:
        period = 7;
        color = "#2196F3";
    }
    
    // Calculate moving average
    const maData = [];
    for (let i = period - 1; i < filteredData.length; i++) {
      const sum = filteredData.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
      maData.push({
        date: filteredData[i].date,
        value: sum / period
      });
    }
    
    // Draw moving average line
    const line = d3.line()
      .x(d => xScale(d.date) + xScale.bandwidth() / 2)
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
      
    candleSvg.append("path")
      .datum(maData)
      .attr("class", "ma-line")
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line);
      
    // Add legend for moving average
    candleSvg.append("rect")
      .attr("x", candleWidth - 150)
      .attr("y", 15)
      .attr("width", 15)
      .attr("height", 3)
      .attr("fill", color);
      
    candleSvg.append("text")
      .attr("x", candleWidth - 130)
      .attr("y", 18)
      .attr("font-size", "10px")
      .text(`${period} Day MA`);
  }
  
  // Highlight the selected range with a border or indicator
  candleSvg.append("rect")
    .attr("class", "selection-indicator")
    .attr("x", xScale(startDate))
    .attr("y", candleMargin.top)
    .attr("width", xScale(endDate) + xScale.bandwidth() - xScale(startDate))
    .attr("height", candleHeight - candleMargin.top - candleMargin.bottom)
    .attr("fill", "none")
    .attr("stroke", "#2196F3")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5")
    .attr("pointer-events", "none");
}

// Function to filter data between 2020 and latest available date
function filterDataByDateRange(data) {
  return data.filter(d => 
    d.date.getFullYear() >= 2020
  );
}

// Function to aggregate daily data into weekly candles
function aggregateToWeekly(dailyData) {
  if (!dailyData || dailyData.length === 0) return [];
  
  // Sort by date first to ensure proper aggregation
  const sortedData = [...dailyData].sort((a, b) => a.date - b.date);
  
  // Group by week
  const weeklyData = [];
  let currentWeek = [];
  let currentWeekNum = -1;
  
  sortedData.forEach(day => {
    // Get week number (Sunday-based)
    const weekNum = d3.timeWeek.count(d3.timeYear(day.date), day.date);
    const year = day.date.getFullYear();
    const weekKey = `${year}-${weekNum}`;
    
    if (weekKey !== currentWeekNum) {
      // Start new week
      if (currentWeek.length > 0) {
        // Calculate OHLC for the completed week
        const weekData = {
          date: currentWeek[currentWeek.length - 1].date, // Use last day of week as the date
          open: currentWeek[0].open,
          high: d3.max(currentWeek, d => d.high),
          low: d3.min(currentWeek, d => d.low),
          close: currentWeek[currentWeek.length - 1].close,
          volume: d3.sum(currentWeek, d => d.volume)
        };
        weeklyData.push(weekData);
      }
      // Start new week
      currentWeek = [day];
      currentWeekNum = weekKey;
    } else {
      // Add to current week
      currentWeek.push(day);
    }
  });
  
  // Add the last week if there's data
  if (currentWeek.length > 0) {
    const weekData = {
      date: currentWeek[currentWeek.length - 1].date, // Use last day of week as the date
      open: currentWeek[0].open,
      high: d3.max(currentWeek, d => d.high),
      low: d3.min(currentWeek, d => d.low),
      close: currentWeek[currentWeek.length - 1].close,
      volume: d3.sum(currentWeek, d => d.volume)
    };
    weeklyData.push(weekData);
  }
  
  return weeklyData;
}

// Load and parse CSV data
async function loadStockData(symbol) {
  try {
    const response = await fetch(`/toy_data/stock_data/${symbol}.csv`);
    const csvText = await response.text();
    const dailyData = d3.csvParse(csvText, d => ({
      date: parseDate(d.Date.split(' ')[0]), // Extract just the date part
      open: +d.Open,
      high: +d.High,
      low: +d.Low,
      close: +d.Close,
      volume: +d.Volume,
      dividends: +d.Dividends,
      stockSplits: +d['Stock Splits']
    }));
    
    // Sort by date
    dailyData.sort((a, b) => a.date - b.date);
    
    // Filter for data from 2020 onwards
    const filteredData = filterDataByDateRange(dailyData);
    
    // Aggregate to weekly data
    return aggregateToWeekly(filteredData);
  } catch (error) {
    console.error(`Error loading data for ${symbol}:`, error);
    return null;
  }
}

// Initialize price range display with full data range
let currentStockData = null;

// Realistic stock data with company names for dropdown
const stocksDatabase = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "TLSA", name: "Tesla Inc." },
  { symbol: "IVDA", name: "Iveda Solutions Inc." }
];

// Initialize slider
function initializeSlider() {
  // Adjust slider width to match the chart's plotting area width
  const sliderContainer = document.getElementById('date-sliders');
  if (sliderContainer) {
    sliderContainer.style.width = `${candleWidth - candleMargin.left - candleMargin.right}px`;
    sliderContainer.style.marginLeft = `${candleMargin.left}px`;
    sliderContainer.style.marginRight = `${candleMargin.right}px`;
  }
  
  // Set initial handle positions
  updateSliderPositions();
  
  // Set initial date labels
  updateDateLabels();
  
  // Add event listeners for the slider handles
  const startHandle = document.getElementById('startHandle');
  const endHandle = document.getElementById('endHandle');
  const sliderTrack = document.getElementById('date-range-slider');
  
  startHandle.addEventListener('mousedown', function(e) {
    isDraggingStart = true;
    e.preventDefault();
  });
  
  endHandle.addEventListener('mousedown', function(e) {
    isDraggingEnd = true;
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDraggingStart && !isDraggingEnd) return;
    
    const sliderRect = sliderTrack.getBoundingClientRect();
    const newPercent = Math.min(100, Math.max(0, ((e.clientX - sliderRect.left) / sliderRect.width) * 100));
    
    if (isDraggingStart) {
      startPercent = Math.min(endPercent - 5, newPercent);
    } else if (isDraggingEnd) {
      endPercent = Math.max(startPercent + 5, newPercent);
    }
    
    updateSliderPositions();
    updateDateLabels();
  });
  
  document.addEventListener('mouseup', function() {
    if (isDraggingStart || isDraggingEnd) {
      // Only update dashboard when dragging stops
      updateDashboard();
    }
    isDraggingStart = false;
    isDraggingEnd = false;
  });
}

// Update slider handle positions and range display
function updateSliderPositions() {
  d3.select('.start-handle').style('left', `${startPercent}%`);
  d3.select('.end-handle').style('left', `${endPercent}%`);
  d3.select('.slider-range')
    .style('left', `${startPercent}%`)
    .style('width', `${endPercent - startPercent}%`);
}

// Update date labels based on slider positions
function updateDateLabels() {
  if (!currentStockData) return;
  
  const totalDataPoints = currentStockData.length;
  const startIndex = Math.floor(startPercent / 100 * (totalDataPoints - 1));
  const endIndex = Math.floor(endPercent / 100 * (totalDataPoints - 1));
  
  const startDateObj = currentStockData[startIndex].date;
  const endDateObj = currentStockData[endIndex].date;
  
  d3.select('#startLabel').text(formatMonthYear(startDateObj));
  d3.select('#endLabel').text(formatMonthYear(endDateObj));
}

// Create update function to refresh the dashboard components
async function updateDashboard() {
  // Get current values from the search bar
  const ticker = d3.select("#searchTicker").property("value").toUpperCase() || "AAPL";
  
  // Load stock data if not already loaded or if ticker changed
  if (!currentStockData || currentStockData.symbol !== ticker) {
    const data = await loadStockData(ticker);
    if (!data) {
      console.error("Failed to load stock data");
      return;
    }
    currentStockData = data;
    currentStockData.symbol = ticker;
  }
  
  // Calculate start and end indices based on slider positions
  const totalDataPoints = currentStockData.length;
  const startIndex = Math.floor(startPercent / 100 * (totalDataPoints - 1));
  const endIndex = Math.floor(endPercent / 100 * (totalDataPoints - 1));
  
  // Get the selected date range for display in the info
  const selectedData = currentStockData.slice(startIndex, endIndex + 1);
  
  // Get stock info
  const stockInfo = stocksDatabase.find(stock => stock.symbol === ticker) || 
                    { symbol: ticker, name: "Unknown Stock" };
  
  // Update the chart - showing all data but highlighting the selected portion
  drawCandleChart(currentStockData, startIndex, endIndex);
  
  // Update stock info display with stats from the selected range
  d3.select("#stockName").text(`${stockInfo.name} (${stockInfo.symbol})`);
  d3.select("#priceRange").text("Selected: $" + d3.min(selectedData, d => d.low).toFixed(2) + 
                               " - $" + d3.max(selectedData, d => d.high).toFixed(2));
  
  // Update performance table (sample update)
  d3.selectAll("#performance-table tbody tr").each(function(d, i) {
    d3.select(this).select("td:nth-child(2)").text(Math.floor(Math.random()*50));
    d3.select(this).select("td:nth-child(3)").text((Math.random()).toFixed(2));
  });
  
  // Update correlation section (sample update)
  d3.select("#mostCorrelated").text("Most Correlated: Stock A (Score: " + (0.8 + Math.random()*0.2).toFixed(2) + ")");
  d3.select("#leastCorrelated").text("Least Correlated: Stock B (Score: " + (-0.5 + Math.random()*0.1).toFixed(2) + ")");
  
  // For the correlation graph, you would update an SVG within #correlationChart.
  const corrSvg = d3.select("#correlationChart").selectAll("svg").data([null]);
  corrSvg.enter()
    .append("svg")
    .merge(corrSvg)
    .attr("width", correlationWidth - correlationMargin.right - correlationMargin.left)
    .attr("height", correlationHeight - correlationMargin.top - correlationMargin.bottom)
    .style("background-color", "#eef")
    .selectAll("*").remove();
  
  // Update sentiment analysis bubbles (sample update)
  const sentimentData = [
    {sentiment: "positive", value: Math.random()*50 + 10},
    {sentiment: "negative", value: Math.random()*50 + 10},
    {sentiment: "positive", value: Math.random()*50 + 10},
    {sentiment: "negative", value: Math.random()*50 + 10}
  ];
  
  // Remove any existing sentiment SVG and create a new one.
  d3.select("#sentimentChart").selectAll("*").remove();
  const sentimentSvg = d3.select("#sentimentChart")
    .append("svg")
    .attr("width", sentimentWidth - sentimentMargin.right - sentimentMargin.left)
    .attr("height", sentimentHeight - sentimentMargin.top - sentimentMargin.bottom)
    .attr("transform", `translate(${sentimentMargin.left},${sentimentMargin.top})`);
    
  // Create force simulation for bubble layout
  const simulation = d3.forceSimulation(sentimentData)
    .force("charge", d3.forceManyBody().strength(5))
    .force("center", d3.forceCenter((sentimentWidth - sentimentMargin.right - sentimentMargin.left) / 2, 
                                    (sentimentHeight - sentimentMargin.top - sentimentMargin.bottom) / 2))
    .force("collision", d3.forceCollide().radius(d => d.value))
    .stop();
  
  // Run simulation
  for (let i = 0; i < 120; ++i) simulation.tick();
  
  // Draw bubbles
  sentimentSvg.selectAll("circle")
    .data(sentimentData)
    .enter()
    .append("circle")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", d => d.value / 4)
    .attr("fill", d => d.sentiment === "positive" ? "green" : "red")
    .attr("stroke", "#333");
}

// Attach event listeners for interactivity
d3.select("#searchTicker").on("input", handleSearchInput);
d3.select("#maToggle").on("change", updateDashboard);
d3.selectAll('input[name="maType"]').on("change", updateDashboard);

// Stock suggestion dropdown functionality
function handleSearchInput() {
  const input = d3.select("#searchTicker").property("value").toUpperCase();
  const dropdown = d3.select("#stockSuggestions");
  
  // Clear previous suggestions
  dropdown.html("");
  
  if (input.length > 0) {
    // Filter stocks based on input matching either symbol or name
    const filteredStocks = stocksDatabase.filter(stock => 
      stock.symbol.includes(input) || 
      stock.name.toUpperCase().includes(input)
    );
    
    // Sort results: exact symbol matches first, then symbol includes, then name includes
    filteredStocks.sort((a, b) => {
      if (a.symbol === input && b.symbol !== input) return -1;
      if (a.symbol !== input && b.symbol === input) return 1;
      if (a.symbol.startsWith(input) && !b.symbol.startsWith(input)) return -1;
      if (!a.symbol.startsWith(input) && b.symbol.startsWith(input)) return 1;
      return 0;
    });
    
    // Limit to top 8 results for better UX
    const limitedResults = filteredStocks.slice(0, 8);
    
    if (limitedResults.length > 0) {
      dropdown.style("display", "block");
      
      limitedResults.forEach(stock => {
        dropdown.append("div")
          .attr("class", "suggestion")
          .html(`<strong>${stock.symbol}</strong> - ${stock.name}`)
          .on("click", function() {
            d3.select("#searchTicker").property("value", stock.symbol);
            dropdown.style("display", "none");
            updateDashboard();
          });
      });
    } else {
      dropdown.style("display", "none");
    }
  } else {
    dropdown.style("display", "none");
  }
}

// Initialize the dashboard
initializeSlider();
updateDashboard();

// Close dropdown when clicking outside
window.addEventListener("click", function(event) {
  if (!event.target.matches("#searchTicker")) {
    d3.select("#stockSuggestions").style("display", "none");
  }
});
