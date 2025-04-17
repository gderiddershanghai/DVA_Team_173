import { lineMargin, lineWidth, lineHeight, drawlineChart } from './lineChart.js';
import { correlationMargin, correlationWidth, correlationHeight, updateCorrelationChart } from './correlationChart.js';
import { tableMargin, tableWidth, tableHeight, updatePerformanceTable } from './performanceTable.js';
import { wordBubbles } from './wordbubbles.js';

const formatDate = d3.timeFormat("%b %d, %Y");
const formatMonthYear = d3.timeFormat("%b %Y");
const formatDateLabel = d3.timeFormat("%d, %b '%y");
const parseDate = d3.timeParse("%Y-%m-%d");

// Default date range for the dashboard, limited by the availability of the tweet data
const DISPLAY_START_DATE = new Date(2017, 0, 1);
const DISPLAY_END_DATE = new Date(2020, 6, 31);
const CALCULATION_DAYS_BEFORE = 90; // Data for calculation of 90 days moving average

const API_BASE_URL = "http://localhost:8001"; // To be changed when deployed

// Main chart initialized in this file because it contains the main controls
const lineSvg = d3.select("#lineChart")
  .append("svg")
  .attr("width", 1080)
  .attr("height", 500)
  .style("background-color", "transparent");

// Tooltip to show relevant information on hover
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Notify when there is an error loading data
const notification = d3.select("body").append("div")
  .attr("class", "notification")
  .style("position", "fixed")
  .style("top", "20px")
  .style("left", "50%")
  .style("transform", "translateX(-50%)")
  .style("background-color", "#f8d7da")
  .style("color", "#721c24")
  .style("padding", "10px 20px")
  .style("border-radius", "4px")
  .style("box-shadow", "0 4px 8px rgba(0,0,0,0.1)")
  .style("z-index", "1000")
  .style("display", "none")
  .style("text-align", "center")
  .style("font-family", "'Roboto', sans-serif")
  .style("font-size", "14px");

function showNotification(message, duration = 5000) {
  notification
    .html(message)
    .style("display", "block")
    .style("opacity", "1");
    
  setTimeout(() => {
    notification
      .style("opacity", "0")
      .style("transition", "opacity 0.5s ease-out");
      
    setTimeout(() => {
      notification.style("display", "none");
    }, 500);
  }, duration);
}

// Range slider variables
let startPercent = 0;
let endPercent = 100;
let isDraggingStart = false; // tracker to be used if user is updating the range
let isDraggingEnd = false;

// Store data
let currentDailyData = null;
let currentWeeklyData = null;
let currentStockData = null;
let currentTicker = "DIS"; // Default ticker

// Function to aggregate daily data into weekly lines to simplify the data for the main chart
function aggregateToWeekly(dailyData) {
  if (!dailyData || dailyData.length === 0) return [];
  
  const sortedData = [...dailyData].sort((a, b) => a.date - b.date);
  
  const weeklyData = [];
  let currentWeek = [];
  let currentWeekNum = -1;
  
  sortedData.forEach(day => {
    const weekNum = d3.timeWeek.count(d3.timeYear(day.date), day.date);
    const year = day.date.getFullYear();
    const weekKey = `${year}-${weekNum}`;
    
    if (weekKey !== currentWeekNum) {
      if (currentWeek.length > 0) {
        const weekData = {
          date: currentWeek[currentWeek.length - 1].date,
          open: currentWeek[0].open,
          high: d3.max(currentWeek, d => d.high),
          low: d3.min(currentWeek, d => d.low),
          close: currentWeek[currentWeek.length - 1].close,
          volume: d3.sum(currentWeek, d => d.volume)
        };
        weeklyData.push(weekData);
      }
      currentWeek = [day];
      currentWeekNum = weekKey;
    } else {
      currentWeek.push(day);
    }
  });
  
  if (currentWeek.length > 0) {
    const weekData = {
      date: currentWeek[currentWeek.length - 1].date,
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
    const url = `${API_BASE_URL}/api/stock_data`;
    
    const calculationStartDate = new Date(DISPLAY_START_DATE);
    calculationStartDate.setDate(calculationStartDate.getDate() - CALCULATION_DAYS_BEFORE);
    const paddedStartDate = d3.timeFormat("%Y-%m-%d")(calculationStartDate);
    const endDate = d3.timeFormat("%Y-%m-%d")(DISPLAY_END_DATE);
    
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
    
    transformedData.sort((a, b) => a.date - b.date);
    
    const filteredDailyData = transformedData.filter(d => 
      d.date >= calculationStartDate && d.date <= DISPLAY_END_DATE
    );
    
    const weeklyData = aggregateToWeekly(filteredDailyData);
    
    const displayWeeklyData = weeklyData.filter(d => 
      d.date >= DISPLAY_START_DATE && d.date <= DISPLAY_END_DATE
    );
    
    if (updateGlobalState) {
      currentDailyData = filteredDailyData;
      currentWeeklyData = displayWeeklyData;
    }
    
    return {
      daily: filteredDailyData,
      weekly: displayWeeklyData
    };
  } catch (error) {
    console.error(`Error loading data for ${symbol}. Falling back to local data.`);
    
    try {
      // Try to load data from local CSV file for the specific stock first
      let csvFile = `tmp_data/${symbol}.csv`;
      let useDefault = false;
      
      try {
        // Test if the file exists by trying to load it
        await d3.csv(csvFile);
        console.log(`Using ${csvFile} as fallback data for ${symbol}`);
      } catch (fileError) {
        // If not available, fall back to DIS.csv
        useDefault = true;
        csvFile = "tmp_data/DIS.csv";
        console.log(`Stock data for ${symbol} not available, using ${csvFile} instead`);
        
        // Show notification popup
        if (symbol !== "DIS" && updateGlobalState) {
          showNotification(`Stock data for ${symbol} not available, showing default dashboard`);
        }
      }
      
      const rawData = await d3.csv(csvFile);
      
      const calculationStartDate = new Date(DISPLAY_START_DATE);
      calculationStartDate.setDate(calculationStartDate.getDate() - CALCULATION_DAYS_BEFORE);
      
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
      
      transformedData.sort((a, b) => a.date - b.date);
      
      const filteredDailyData = transformedData.filter(d => 
        d.date >= calculationStartDate && d.date <= DISPLAY_END_DATE
      );
      
      const weeklyData = aggregateToWeekly(filteredDailyData);
      
      const displayWeeklyData = weeklyData.filter(d => 
        d.date >= DISPLAY_START_DATE && d.date <= DISPLAY_END_DATE
      );
      
      if (updateGlobalState) {
        currentDailyData = filteredDailyData;
        currentWeeklyData = displayWeeklyData;
        
        if (useDefault) {
          currentTicker = "DIS";
          d3.select("#ticker-symbol").text(currentTicker);
          d3.select("#searchTicker").property("value", currentTicker);
          
          const disStockInfo = stocksDatabase.find(stock => stock.symbol === "DIS") || 
                              { symbol: "DIS", name: "Walt Disney Co." };
          d3.select("#stockName").text(disStockInfo.name);
        }
      }
      
      return {
        daily: filteredDailyData,
        weekly: displayWeeklyData
      };
    } catch (fallbackError) {
      console.error("Error loading fallback data:", fallbackError);
      
      if (updateGlobalState) {
        showNotification(`Error loading data. Please check your connection.`, 7000);
      }
      
      return null;
    }
  }
}

// Stock names for dropdown and chart descriptions
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

function initializeSlider() {
  const sliderContainer = document.getElementById('date-sliders');
  if (sliderContainer) {
    sliderContainer.style.width = `${1080 - lineMargin.left - lineMargin.right}px`;
    sliderContainer.style.marginLeft = `${lineMargin.left}px`;
    sliderContainer.style.marginRight = `${lineMargin.right}px`;
  }
  
  updateSliderPositions();
  
  const startHandle = document.getElementById('startHandle');
  const endHandle = document.getElementById('endHandle');
  
  startHandle.addEventListener('mousedown', function(e) {
    isDraggingStart = true;
    e.preventDefault();
  });
  
  endHandle.addEventListener('mousedown', function(e) {
    isDraggingEnd = true;
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', handleSliderMove);
  
  document.addEventListener('mouseup', handleSliderRelease);
  
  initializeMAButtons();
}

function initializeMAButtons() {
  const maButtons = document.querySelectorAll('.ma-button');
  
  maButtons.forEach(button => {
    button.addEventListener('click', function() {
      this.classList.toggle('selected');
      
      updateLineChartOnly();
    });
  });
}

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

function handleSliderRelease() {
  if (isDraggingStart || isDraggingEnd) {
    updateDashboard(true);
  }
  isDraggingStart = false;
  isDraggingEnd = false;
}

function updateSliderPositions() {
  d3.select('.start-handle').style('left', `${startPercent}%`);
  d3.select('.end-handle').style('left', `${endPercent}%`);
  d3.select('.slider-range')
    .style('left', `${startPercent}%`)
    .style('width', `${endPercent - startPercent}%`);
}

async function fetchCalculationData(symbol, startDate, endDate) {
  try {
    const url = `${API_BASE_URL}/api/calculate`;
    
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
    console.log("Falling back to local performance data");
    
    // Fallback to local data
    try {
      const performanceData = await d3.json("tmp_data/performance.json");
      
      const correlationData = {
        most_correlated_stock: performanceData.correlation.most_correlated_stock,
        most_correlated_stock_correlation: performanceData.correlation.most_correlated_stock_correlation,
        least_correlated_stock: performanceData.correlation.least_correlated_stock,
        least_correlated_stock_correlation: performanceData.correlation.least_correlated_stock_correlation
      };
      
      return {
        performance: performanceData.performance,
        correlation: correlationData
      };
    } catch (fallbackError) {
      console.error("Error loading fallback calculation data:", fallbackError);
      return null;
    }
  }
}

async function updateWordBubbles(ticker, startDate, endDate) {
  let wordData = [];
  let links = [];

  try {
    const response = await fetch(`${API_BASE_URL}/api/word-bubbles`, {
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

  spinnerCircle.append("animateTransform")
    .attr("attributeName", "transform")
    .attr("attributeType", "XML")
    .attr("type", "rotate")
    .attr("from", "0 0 0")
    .attr("to", "360 0 0")
    .attr("dur", "1s")
    .attr("repeatCount", "indefinite");

  spinner.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.3em")
    .attr("fill", "#333")
    .text("Loading...");
    
  return spinner;
}

async function updateDashboard(isSliderUpdate = false) {
  const searchTickerValue = d3.select("#searchTicker").property("value").toUpperCase();
  
  if (!isSliderUpdate && searchTickerValue && searchTickerValue !== currentTicker && 
      (d3.select("#searchTicker").node() === document.activeElement || 
       document.activeElement.matches(".suggestion"))) {
    currentTicker = searchTickerValue;
  }
  
  d3.select("#ticker-symbol").text(currentTicker);
  
  const ticker = currentTicker;
  d3.select("#searchTicker").property("value", ticker);
  
  let shouldLoadData = !isSliderUpdate;
  
  if (shouldLoadData) {
    lineSvg.selectAll("*").remove();
    createLoadingSpinner(lineSvg, lineWidth, lineHeight);
    
    if (!currentStockData || currentStockData.symbol !== ticker) {
      const data = await loadStockData(ticker);
      if (data) {
        currentStockData = data;
        currentStockData.symbol = ticker;
        currentWeeklyData = data.weekly;
        currentDailyData = data.daily;
      }
    }
    
    lineSvg.selectAll("*").remove();
  }
  
  const totalDataPoints = currentWeeklyData.length;
  const startIndex = Math.floor(startPercent / 100 * (totalDataPoints - 1));
  const endIndex = Math.floor(endPercent / 100 * (totalDataPoints - 1));
  
  const startDate = d3.timeFormat("%Y-%m-%d")(currentWeeklyData[startIndex].date);
  const endDate = d3.timeFormat("%Y-%m-%d")(currentWeeklyData[endIndex].date);
  
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
  
  const calculationData = await fetchCalculationData(ticker, startDate, endDate);
  
  const stockInfo = stocksDatabase.find(stock => stock.symbol === currentTicker) || 
                    { symbol: currentTicker, name: "Unknown Stock" };
  
  d3.select("#stockName").text(stockInfo.name);
  
  // Update all components using currentTicker which may have been updated in loadStockData
  await updateAllComponents(currentTicker, calculationData, startIndex, endIndex, startDate, endDate);
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
  
  drawlineChart(currentWeeklyData, currentDailyData, startIndex, endIndex, commonDependencies);
  
  d3.select("#performance-table tbody").style("opacity", 1);
  
  updatePerformanceTable(calculationData ? calculationData.performance : null, { stocksDatabase });
  
  const correlationDependencies = {
    ...commonDependencies,
    currentWeeklyData: [...currentWeeklyData]
  };
  
  updateCorrelationChart(
    calculationData ? calculationData.correlation : null, 
    ticker, 
    startDate, 
    endDate, 
    startIndex, 
    endIndex, 
    correlationDependencies
  );
  
  await updateWordBubbles(ticker, startDate, endDate);
}

d3.select("#searchTicker").on("input", handleSearchInput);

d3.select("#maToggle").on("change", function() {
  updateLineChartOnly();
});

// this function is implemented to prevent reloading the whole data when MA is toggled
function updateLineChartOnly() {
  const totalDataPoints = currentWeeklyData.length;
  const startIndex = Math.floor(startPercent / 100 * (totalDataPoints - 1));
  const endIndex = Math.floor(endPercent / 100 * (totalDataPoints - 1));
  
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
  
  lineSvg.selectAll("*").remove();
  drawlineChart(currentWeeklyData, currentDailyData, startIndex, endIndex, commonDependencies);
}

// Stock suggestion dropdown functionality
function handleSearchInput() {
  const input = d3.select("#searchTicker").property("value").toUpperCase();
  const dropdown = d3.select("#stockSuggestions");
  
  dropdown.html("");
  
  if (input.length > 0) {
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

function getFilteredStockSuggestions(input) {
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
  const initialTicker = "DIS";
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
    
    initializeSlider();
    
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