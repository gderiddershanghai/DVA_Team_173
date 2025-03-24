// Set up dimensions for different components
const margin = {top: 20, right: 20, bottom: 30, left: 50};
const candleWidth = 900, candleHeight = 600;
const tableWidth = 300, tableHeight = 600;
const correlationWidth = 900, correlationHeight = 300;
const sentimentWidth = 300, sentimentHeight = 300;

// Format date for display
const formatDate = d3.timeFormat("%b %d, %Y");
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

// Create a proper candle chart
function drawCandleChart(data) {
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
  
  // Filter data between 2020 and 2022
  const filteredData = formattedData.filter(d => 
    d.date.getFullYear() >= 2020 && d.date.getFullYear() <= 2022
  );
  
  // Sort by date
  filteredData.sort((a, b) => a.date - b.date);
  
  // Set up scales
  const xScale = d3.scaleBand()
    .domain(filteredData.map(d => d.date))
    .range([margin.left, candleWidth - margin.right])
    .padding(0.2);
  
  const yScale = d3.scaleLinear()
    .domain([
      d3.min(filteredData, d => d.low) * 0.99,
      d3.max(filteredData, d => d.high) * 1.01
    ])
    .range([candleHeight - margin.bottom, margin.top]);
  
  // Create x-axis with better date formatting
  const xAxis = d3.axisBottom(xScale)
    .tickValues(xScale.domain().filter((d, i) => i % 8 === 0))
    .tickFormat(d => formatDate(d));
  
  // Add X axis
  candleSvg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${candleHeight - margin.bottom})`)
    .call(xAxis)
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-45)");
  
  // Add Y axis
  candleSvg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale));
  
  // Add grid lines
  candleSvg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(0,${candleHeight - margin.bottom})`)
    .call(d3.axisBottom(xScale)
      .tickValues([])
      .tickSize(-(candleHeight - margin.top - margin.bottom))
      .tickFormat("")
    );
  
  candleSvg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale)
      .tickSize(-(candleWidth - margin.left - margin.right))
      .tickFormat("")
    );
    
  // Add candlesticks
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
        <strong>Date:</strong> ${formatDate(d.date)}<br>
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
  
  // Calculate moving averages if showMovingAverages is enabled
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
}

// Sample realistic candle chart data with OHLC values for 2020-2022
const generateRealisticData = () => {
  const data = [];
  let date = new Date(2020, 0, 5); // Jan 5, 2020 (Sunday)
  let close = 150;
  
  // Create weekly data points for 2020-2022
  while (date <= new Date(2022, 11, 25)) {
    // Generate realistic price movements with some volatility
    const volatility = Math.random() * 0.2 + 0.05; // 5-25% volatility
    const changePercent = (Math.random() - 0.5) * volatility;
    
    // Weekly open is previous close
    const open = close;
    // Random high/low with realistic ranges
    const upMove = Math.abs(Math.random() * open * 0.08);
    const downMove = Math.abs(Math.random() * open * 0.08);
    const high = Math.max(open, open * (1 + changePercent)) + upMove;
    const low = Math.min(open, open * (1 + changePercent)) - downMove;
    // New close
    close = open * (1 + changePercent);
    
    // Add volume (shares traded) - in millions
    const volumeBase = Math.random() * 10 + 5; // 5-15 million base
    const volume = Math.floor(volumeBase * 1000000 * (1 + Math.random() * 0.5));
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: volume
    });
    
    // Move to next week
    date.setDate(date.getDate() + 7);
  }
  
  return data;
};

const sampleCandleData = generateRealisticData();

// Update stock name and price range display 
d3.select("#stockName").text("Sample Stock (SMPL)");
d3.select("#priceRange").text("Low: $" + d3.min(sampleCandleData, d => d.low).toFixed(2) + 
                             ", High: $" + d3.max(sampleCandleData, d => d.high).toFixed(2));

// Realistic stock data with company names for dropdown
const stocksDatabase = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A" },
  { symbol: "GOOG", name: "Alphabet Inc. Class C" },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "BRK.A", name: "Berkshire Hathaway Inc. Class A" },
  { symbol: "BRK.B", name: "Berkshire Hathaway Inc. Class B" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "UNH", name: "UnitedHealth Group Inc." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "HD", name: "Home Depot Inc." },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "BAC", name: "Bank of America Corp." },
  { symbol: "XOM", name: "Exxon Mobil Corporation" },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "CVX", name: "Chevron Corporation" },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "PFE", name: "Pfizer Inc." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "CSCO", name: "Cisco Systems Inc." },
  { symbol: "LLY", name: "Eli Lilly and Company" },
  { symbol: "COST", name: "Costco Wholesale Corporation" },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "ABT", name: "Abbott Laboratories" }
];

// Create update function to refresh the dashboard components
function updateDashboard() {
  // Get current values from the search bar and date sliders
  const ticker = d3.select("#searchTicker").property("value").toUpperCase() || "SMPL";
  const startVal = parseInt(d3.select("#startDate").property("value"));
  const endVal = parseInt(d3.select("#endDate").property("value"));
  
  // Calculate start and end indices based on slider values
  const totalWeeks = sampleCandleData.length;
  const startIndex = Math.floor(startVal / 100 * (totalWeeks - 1));
  const endIndex = Math.floor(endVal / 100 * (totalWeeks - 1));
  
  // Filter data based on slider positions
  const dataToShow = sampleCandleData.slice(startIndex, endIndex + 1);
  
  // In a real implementation, you'd fetch data from an API:
  // fetch(`/api/stock?ticker=${ticker}&start=${startVal}&end=${endVal}`)
  //   .then(response => response.json())
  //   .then(data => {
  //       drawCandleChart(data.candles);
  //       d3.select("#stockName").text(data.stockName);
  //       d3.select("#priceRange").text(`Low: ${data.low}, High: ${data.high}`);
  //   });
  
  // Get stock info
  const stockInfo = stocksDatabase.find(stock => stock.symbol === ticker) || 
                    { symbol: ticker, name: "Sample Stock" };
  
  // Update the chart
  drawCandleChart(dataToShow);
  
  // Update stock info display
  d3.select("#stockName").text(`${stockInfo.name} (${stockInfo.symbol})`);
  d3.select("#priceRange").text("Low: $" + d3.min(dataToShow, d => d.low).toFixed(2) + 
                               ", High: $" + d3.max(dataToShow, d => d.high).toFixed(2));
  
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
    .attr("width", correlationWidth - margin.right - margin.left)
    .attr("height", correlationHeight - margin.top - margin.bottom)
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
    .attr("width", sentimentWidth - margin.right - margin.left)
    .attr("height", sentimentHeight - margin.top - margin.bottom)
    .attr("transform", `translate(${margin.left},${margin.top})`);
    
  // Create force simulation for bubble layout
  const simulation = d3.forceSimulation(sentimentData)
    .force("charge", d3.forceManyBody().strength(5))
    .force("center", d3.forceCenter((sentimentWidth - margin.right - margin.left) / 2, 
                                    (sentimentHeight - margin.top - margin.bottom) / 2))
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
d3.select("#startDate").on("input", updateDashboard);
d3.select("#endDate").on("input", updateDashboard);
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
drawCandleChart(sampleCandleData);
updateDashboard();

// Close dropdown when clicking outside
window.addEventListener("click", function(event) {
  if (!event.target.matches("#searchTicker")) {
    d3.select("#stockSuggestions").style("display", "none");
  }
});
