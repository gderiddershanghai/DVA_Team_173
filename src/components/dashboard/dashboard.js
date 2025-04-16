// Import modularized components
import { lineMargin, lineWidth, lineHeight, drawlineChart } from './lineChart.js';
import { correlationMargin, correlationWidth, correlationHeight, updateCorrelationChart } from './correlationChart.js';
import { tableMargin, tableWidth, tableHeight, updatePerformanceTable } from './performanceTable.js';
import { wordBubbles } from './wordbubbles.js';

// Format date for display
const formatDate = d3.timeFormat("%b %d, %Y");
const formatMonthYear = d3.timeFormat("%b %Y");
const formatDateLabel = d3.timeFormat("%d, %b '%y");
const parseDate = d3.timeParse("%Y-%m-%d");

// Define chart date range constants
const DISPLAY_START_DATE = new Date(2017, 0, 1); // Jan 1, 2017
const DISPLAY_END_DATE = new Date(2020, 6, 31); // Jul 31, 2020
const CALCULATION_DAYS_BEFORE = 90; // Data for calculation: 90 days before display start

// API configuration
const API_BASE_URL = "http://localhost:8001";

// Create SVG for the line chart
const lineSvg = d3.select("#lineChart")
  .append("svg")
  .attr("width", 1080)
  .attr("height", 500)
  .style("background-color", "transparent");

// Create tooltip for lines
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Range slider variables
let startPercent = 0; // Start at beginning of display range
let endPercent = 100; // End at end of display range
let isDraggingStart = false;
let isDraggingEnd = false;
let sliderInUse = false; // Track if slider is in use

// Store data
let currentDailyData = null;
let currentWeeklyData = null;
let currentStockData = null;
let currentTicker = "MSFT"; // Default ticker

// Function to aggregate daily data into weekly lines
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

// Load and parse stock data using API
async function loadStockData(symbol, updateGlobalState = true) {
  try {
    // Use the API endpoint to fetch stock data
    const url = `${API_BASE_URL}/api/stock_data`;
    
    // Calculate date range
    const calculationStartDate = new Date(DISPLAY_START_DATE);
    calculationStartDate.setDate(calculationStartDate.getDate() - CALCULATION_DAYS_BEFORE);
    const paddedStartDate = d3.timeFormat("%Y-%m-%d")(calculationStartDate);
    const endDate = d3.timeFormat("%Y-%m-%d")(DISPLAY_END_DATE);
    
    // Fetch data from API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stock_ticker: symbol,
        start_date: paddedStartDate,
        end_date: endDate
      })
    });
    
    const rawData = await response.json();
    
    // Transform API data to our format
    const transformedData = rawData.map(d => {
      const parsedDate = parseDate(d.Date.split(' ')[0]) || new Date(d.Date);
      return {
        date: parsedDate,
        open: +d.Open,
        high: +d.High,
        low: +d.Low,
        close: +d.Close,
        volume: +d.Volume,
        dividends: d.Dividends ? +d.Dividends : 0,
        stockSplits: d['Stock Splits'] ? +d['Stock Splits'] : 0
      };
    }).filter(d => d.date instanceof Date);
    
    // Sort by date
    transformedData.sort((a, b) => a.date - b.date);
    
    // Filter for data within our display range plus calculation period
    const filteredDailyData = transformedData.filter(d => 
      d.date >= calculationStartDate && d.date <= DISPLAY_END_DATE
    );
    
    // Aggregate to weekly data
    const weeklyData = aggregateToWeekly(filteredDailyData);
    
    // Filter weekly data to match display range
    const displayWeeklyData = weeklyData.filter(d => 
      d.date >= DISPLAY_START_DATE && d.date <= DISPLAY_END_DATE
    );
    
    // Only update global state if requested
    if (updateGlobalState) {
      currentDailyData = filteredDailyData;
      currentWeeklyData = displayWeeklyData;
    }
    
    return {
      daily: filteredDailyData,
      weekly: displayWeeklyData
    };
  } catch (error) {
    console.error(`Error loading data for ${symbol}`);
    return null;
  }
}

// Realistic stock data with company names for dropdown
const stocksDatabase = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "AMD", name: "Advanced Micro Devices Inc." },
  { symbol: "BA", name: "Boeing Co." },
  { symbol: "BAC", name: "Bank of America Corp." },
  { symbol: "CMCSA", name: "Comcast Corp." },
  { symbol: "COST", name: "Costco Wholesale Corp." },
  { symbol: "CSCO", name: "Cisco Systems Inc." },
  { symbol: "CVX", name: "Chevron Corp." },
  { symbol: "DIS", name: "Walt Disney Co." },
  { symbol: "F", name: "Ford Motor Co." },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A" },
  { symbol: "HD", name: "Home Depot Inc." },
  { symbol: "IBM", name: "International Business Machines Corp." },
  { symbol: "INTC", name: "Intel Corp." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "KO", name: "Coca-Cola Co." },
  { symbol: "KR", name: "Kroger Co." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "MCD", name: "McDonald's Corp." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "MRK", name: "Merck & Co Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "NKE", name: "Nike Inc." },
  { symbol: "ORCL", name: "Oracle Corp." },
  { symbol: "PEP", name: "PepsiCo Inc." },
  { symbol: "PFE", name: "Pfizer Inc." },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "PYPL", name: "PayPal Holdings Inc." },
  { symbol: "SBUX", name: "Starbucks Corp." },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust" },
  { symbol: "T", name: "AT&T Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "UNH", name: "UnitedHealth Group Inc." },
  { symbol: "UPS", name: "United Parcel Service Inc." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "XOM", name: "Exxon Mobil Corp." }
];

// Initialize slider
function initializeSlider() {
  // Adjust slider width to match the chart's plotting area width
  const sliderContainer = document.getElementById('date-sliders');
  if (sliderContainer) {
    sliderContainer.style.width = `${1080 - lineMargin.left - lineMargin.right}px`;
    sliderContainer.style.marginLeft = `${lineMargin.left}px`;
    sliderContainer.style.marginRight = `${lineMargin.right}px`;
  }
  
  // Set initial handle positions
  updateSliderPositions();
  
  // Add event listeners for the slider handles
  const startHandle = document.getElementById('startHandle');
  const endHandle = document.getElementById('endHandle');
  
  startHandle.addEventListener('mousedown', function(e) {
    isDraggingStart = true;
    sliderInUse = true; // Set flag when slider interaction starts
    e.preventDefault();
  });
  
  endHandle.addEventListener('mousedown', function(e) {
    isDraggingEnd = true;
    sliderInUse = true; // Set flag when slider interaction starts
    e.preventDefault();
  });
  
  // Unified mousemove handler
  document.addEventListener('mousemove', handleSliderMove);
  
  // Unified mouseup handler
  document.addEventListener('mouseup', handleSliderRelease);
  
  // Initialize MA buttons
  initializeMAButtons();
}

// Initialize MA buttons
function initializeMAButtons() {
  // Add click handler for MA buttons
  const maButtons = document.querySelectorAll('.ma-button');
  
  maButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Toggle selected class
      this.classList.toggle('selected');
      
      // Update chart
      updateLineChartOnly();
    });
  });
}

// Handle slider movement
function handleSliderMove(e) {
  if (!isDraggingStart && !isDraggingEnd) return;
  
  const sliderTrack = document.getElementById('date-range-slider');
  const sliderRect = sliderTrack.getBoundingClientRect();
  const newPercent = Math.min(100, Math.max(0, ((e.clientX - sliderRect.left) / sliderRect.width) * 100));
  
  if (isDraggingStart) {
    startPercent = Math.min(endPercent - 5, newPercent);
  } else if (isDraggingEnd) {
    endPercent = Math.max(startPercent + 5, newPercent);
  }
  
  updateSliderPositions();
}

// Handle slider release
function handleSliderRelease() {
  if (isDraggingStart || isDraggingEnd) {
    // Only update dashboard when dragging stops, and signal this is a slider update
    updateDashboard(true);
    sliderInUse = false; // Clear flag when slider interaction ends
  }
  isDraggingStart = false;
  isDraggingEnd = false;
}

// Update slider handle positions and range display
function updateSliderPositions() {
  d3.select('.start-handle').style('left', `${startPercent}%`);
  d3.select('.end-handle').style('left', `${endPercent}%`);
  d3.select('.slider-range')
    .style('left', `${startPercent}%`)
    .style('width', `${endPercent - startPercent}%`);
}

// Function to fetch data from the calculation API
async function fetchCalculationData(symbol, startDate, endDate) {
  try {
    const url = `${API_BASE_URL}/api/calculate`;
    
    // Use d3.json with a POST request
    const data = await d3.json(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stock_ticker: symbol,
        start_date: startDate,
        end_date: endDate
      })
    });
    
    return data;
  } catch (error) {
    console.error("Error fetching calculation data:", error);
    return null;
  }
}

// Function to load sentiment data
async function updateWordBubbles(ticker, startDate, endDate) {
  let wordData = [];
  let links = [];

  try {
    const response = await fetch("http://localhost:8001/api/word-bubbles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ticker,
        start_date: startDate,
        end_date: endDate,
      }),
    });

    if (!response.ok) {
      throw new Error("API request failed");
    }

    const sentimentData = await response.json();
    wordData = [...sentimentData.top_words, ...sentimentData.bottom_words];

    const adjMatrix = sentimentData.adj_matrix;
    Object.keys(adjMatrix).forEach((source) => {
      Object.keys(adjMatrix[source]).forEach((target) => {
        const weight = adjMatrix[source][target];
        if (weight > 0) {
          links.push({ source, target, weight });
        }
      });
    });
  } catch (err) {
    console.warn("Falling back to local files due to API error:", err);

    try {
      const [topWords, bottomWords, adjMatrix] = await Promise.all([
        d3.json("tmp_data/top_words.json"),
        d3.json("tmp_data/bottom_words.json"),
        d3.json("tmp_data/adjacency_matrix.json"),
      ]);

      wordData = [...topWords, ...bottomWords];

      Object.keys(adjMatrix).forEach((source) => {
        Object.keys(adjMatrix[source]).forEach((target) => {
          const weight = adjMatrix[source][target];
          if (weight > 0) {
            links.push({ source, target, weight });
          }
        });
      });
    } catch (localErr) {
      console.error("Error loading fallback word bubble data:", localErr);
      return;
    }
  }

  d3.select("#sentimentChart").selectAll("*").remove();

  const bubbles = wordBubbles()
    .width(1200)
    .height(700)
    .data(wordData)
    .links(links)
    .margin({ top: 20, right: 20, bottom: 20, left: 20 });

  d3.select("#sentimentChart").call(bubbles);
}

// Generic loading spinner function
function createLoadingSpinner(container, width, height) {
  const spinner = container.append("g")
    .attr("class", "loading-spinner")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);
    
  const spinnerCircle = spinner.append("circle")
    .attr("r", 30)
    .attr("fill", "none")
    .attr("stroke", "#999")
    .attr("stroke-width", 4)
    .attr("stroke-dasharray", "10, 10")
    .style("opacity", 0.7);

  // Add rotation animation directly to the circle
  spinnerCircle.append("animateTransform")
    .attr("attributeName", "transform")
    .attr("attributeType", "XML")
    .attr("type", "rotate")
    .attr("from", "0 0 0")
    .attr("to", "360 0 0")
    .attr("dur", "1s")
    .attr("repeatCount", "indefinite");

  // Centered text
  spinner.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .attr("fill", "#333")
    .text("Loading...");
    
  return spinner;
}

// Create update function to refresh the dashboard components
async function updateDashboard(isSliderUpdate = false) {
  // Get current ticker from search bar if changed and not a slider update
  const searchTickerValue = d3.select("#searchTicker").property("value").toUpperCase();
  
  if (!isSliderUpdate && searchTickerValue && searchTickerValue !== currentTicker && 
      (d3.select("#searchTicker").node() === document.activeElement || 
       document.activeElement.matches(".suggestion"))) {
    currentTicker = searchTickerValue;
  }
  
  // Update ticker symbol display
  d3.select("#ticker-symbol").text(currentTicker);
  
  // Use the current ticker
  const ticker = currentTicker;
  d3.select("#searchTicker").property("value", ticker);
  
  // Check if we need to load new data
  let shouldLoadData = !isSliderUpdate;
  
  if (shouldLoadData) {
    // Show loading spinner
    lineSvg.selectAll("*").remove();
    createLoadingSpinner(lineSvg, lineWidth, lineHeight);
    
    // Load stock data if needed
    if (!currentStockData || currentStockData.symbol !== ticker) {
      const data = await loadStockData(ticker);
      if (data) {
        currentStockData = data;
        currentStockData.symbol = ticker;
        currentWeeklyData = data.weekly;
        currentDailyData = data.daily;
      }
    }
    
    // Clear spinner
    lineSvg.selectAll("*").remove();
  }
  
  // Calculate data range for display
  const totalDataPoints = currentWeeklyData.length;
  const startIndex = Math.floor(startPercent / 100 * (totalDataPoints - 1));
  const endIndex = Math.floor(endPercent / 100 * (totalDataPoints - 1));
  
  // Get date range for API
  const startDate = d3.timeFormat("%Y-%m-%d")(currentWeeklyData[startIndex].date);
  const endDate = d3.timeFormat("%Y-%m-%d")(currentWeeklyData[endIndex].date);
  
  // Show loading indicators
  d3.select("#performance-table tbody").style("opacity", 0.5);
  
  const sentimentMargin = {top: 20, right: 20, bottom: 20, left: 20};
  const sentimentWidth = 1300 - sentimentMargin.left - sentimentMargin.right;
  const sentimentHeight = 800 - sentimentMargin.top - sentimentMargin.bottom;

  d3.select("#sentimentChart").selectAll("*").remove();
  createLoadingSpinner(
    d3.select("#sentimentChart").append("svg")
      .attr("width", sentimentWidth)
      .attr("height", sentimentHeight),
    sentimentWidth,
    sentimentHeight
  );
  
  // Fetch calculation data from the API
  const calculationData = await fetchCalculationData(ticker, startDate, endDate);
  
  // Get the selected data range for info display
  const selectedData = currentWeeklyData.slice(startIndex, endIndex + 1);
  
  // Get stock info
  const stockInfo = stocksDatabase.find(stock => stock.symbol === ticker) || 
                    { symbol: ticker, name: "Unknown Stock" };
  
  // Update the stock info display
  d3.select("#stockName").text(stockInfo.name);
  
  // Update all components
  await updateAllComponents(ticker, calculationData, startIndex, endIndex, startDate, endDate);
}

// Update all dashboard components
async function updateAllComponents(ticker, calculationData, startIndex, endIndex, startDate, endDate) {
  // Create dependencies object to pass to component functions
  const commonDependencies = {
    lineSvg,
    formatMonthYear,
    formatDate,
    formatDateLabel,
    DISPLAY_START_DATE,
    DISPLAY_END_DATE,
    tooltip,
    currentWeeklyData,
    loadStockData,
    createLoadingSpinner,
    stocksDatabase
  };
  
  // Always update the line chart with the SELECTED stock's data
  drawlineChart(currentWeeklyData, currentDailyData, startIndex, endIndex, commonDependencies);
  
  // Reset performance table opacity
  d3.select("#performance-table tbody").style("opacity", 1);
  
  // Update the performance table with API data or placeholder values
  updatePerformanceTable(calculationData ? calculationData.performance : null, { stocksDatabase });
  
  // Create a separate set of dependencies for correlation chart to avoid data confusion
  const correlationDependencies = {
    ...commonDependencies,
    // Make sure currentWeeklyData is properly cloned to avoid reference issues
    currentWeeklyData: [...currentWeeklyData]
  };
  
  // Update the correlation chart with API data or placeholder visualization
  updateCorrelationChart(
    calculationData ? calculationData.correlation : null, 
    ticker, 
    startDate, 
    endDate, 
    startIndex, 
    endIndex, 
    correlationDependencies
  );
  
  // Update the sentiment chart with API data
  await updateWordBubbles(ticker, startDate, endDate);
}

// Attach event listeners for interactivity
d3.select("#searchTicker").on("input", handleSearchInput);
d3.select("#searchTicker").on("focus", function() {
  // When clicking in the search box, we're definitely not using the slider
  sliderInUse = false;
});

// Moving average toggle handlers
d3.select("#maToggle").on("change", function() {
  // Only update the line chart - no need to reload data
  updateLineChartOnly();
});

// Function to update only the line chart without reloading data
function updateLineChartOnly() {
  const totalDataPoints = currentWeeklyData.length;
  const startIndex = Math.floor(startPercent / 100 * (totalDataPoints - 1));
  const endIndex = Math.floor(endPercent / 100 * (totalDataPoints - 1));
  
  // Create dependencies object to pass to component functions
  const commonDependencies = {
    lineSvg,
    formatMonthYear,
    formatDate,
    formatDateLabel,
    DISPLAY_START_DATE,
    DISPLAY_END_DATE,
    tooltip,
    currentWeeklyData,
    loadStockData,
    createLoadingSpinner,
    stocksDatabase
  };
  
  // Clear previous chart and redraw with current settings
  lineSvg.selectAll("*").remove();
  drawlineChart(currentWeeklyData, currentDailyData, startIndex, endIndex, commonDependencies);
}

// Stock suggestion dropdown functionality
function handleSearchInput() {
  const input = d3.select("#searchTicker").property("value").toUpperCase();
  const dropdown = d3.select("#stockSuggestions");
  
  // Clear previous suggestions
  dropdown.html("");
  
  if (input.length > 0) {
    // Get filtered suggestions
    const suggestions = getFilteredStockSuggestions(input);
    
    if (suggestions.length > 0) {
      dropdown.style("display", "block");
      
      suggestions.forEach(stock => {
        dropdown.append("div")
          .attr("class", "suggestion")
          .html(`<strong>${stock.symbol}</strong> - ${stock.name}`)
          .on("click", function() {
            d3.select("#searchTicker").property("value", stock.symbol);
            currentTicker = stock.symbol; // Update the currentTicker
            dropdown.style("display", "none");
            updateDashboard(false); // Full update when selecting a new stock
          });
      });
    } else {
      dropdown.style("display", "none");
    }
  } else {
    dropdown.style("display", "none");
  }
}

// Filter and sort stock suggestions based on input
function getFilteredStockSuggestions(input) {
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
  return filteredStocks.slice(0, 8);
}

// Initialize the dashboard
async function initDashboard() {
  // Load initial stock data
  const initialTicker = "MSFT";
  currentTicker = initialTicker;
  d3.select("#searchTicker").property("value", currentTicker);
  d3.select("#ticker-symbol").text(currentTicker);
  
  // Show loading spinner
  lineSvg.selectAll("*").remove();
  createLoadingSpinner(lineSvg, lineWidth, lineHeight);
  
  // Load data for the initial ticker
  const data = await loadStockData(initialTicker);
  if (data) {
    currentStockData = data;
    currentStockData.symbol = initialTicker;
    currentWeeklyData = data.weekly;
    currentDailyData = data.daily;
    
    // Initialize slider
    initializeSlider();
    
    // Update dashboard
    await updateDashboard(false);
  }
}

// Start the application
initDashboard();

// Close dropdown when clicking outside
window.addEventListener("click", function(event) {
  if (!event.target.matches("#searchTicker")) {
    d3.select("#stockSuggestions").style("display", "none");
  }
});