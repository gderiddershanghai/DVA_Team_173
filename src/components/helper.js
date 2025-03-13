// calculating stock analysis metrics such as Beta, Alpha, Sharpe Ratio, and Treynor Ratio in javascript
const fs = require('fs');
const Papa = require('papaparse');
const math = require('mathjs');

// Read and parse CSV files
function readCSV(filePath, callback) {
    const file = fs.createReadStream(filePath);
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: results => callback(results.data)
    });
}

// Filter data by date range
function filterDataByDateRange(data, startDate, endDate) {
    return data.filter(row => {
        const date = new Date(row.Date);
        return date >= startDate && date <= endDate;
    });
}

// Calculate daily returns
function calculateReturns(prices) {
    return prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
}

// Compute covariance
function covariance(arr1, arr2) {
    const mean1 = math.mean(arr1), mean2 = math.mean(arr2);
    return math.mean(arr1.map((val, i) => (val - mean1) * (arr2[i] - mean2)));
}

// Compute Beta
function calculateStockBeta(stockData, marketData, startDate, endDate) {
    const betas = {};
    const filteredMarketData = filterDataByDateRange(marketData, startDate, endDate);

    Object.keys(stockData).forEach(stock => {
        const filteredStockData = filterDataByDateRange(stockData[stock], startDate, endDate);
        const commonDates = filteredStockData.map(row => row.Date).filter(date =>
            filteredMarketData.some(row => row.Date === date)
        );
        
        const stockPrices = filteredStockData.filter(row => commonDates.includes(row.Date)).map(row => row.Close);
        const marketPrices = filteredMarketData.filter(row => commonDates.includes(row.Date)).map(row => row.Close);

        if (stockPrices.length > 1) {
            const stockReturns = calculateReturns(stockPrices);
            const marketReturns = calculateReturns(marketPrices);
            betas[stock] = covariance(stockReturns, marketReturns) / math.variance(marketReturns);
        } else {
            betas[stock] = null;
        }
    });
    console.log("Stock Betas:", betas);
    return betas;
}

// Compute Alpha
function calculateStockAlpha(stockData, marketData, betas, riskFreeRate, startDate, endDate) {
    const alphas = {};
    const filteredMarketData = filterDataByDateRange(marketData, startDate, endDate);

    Object.keys(stockData).forEach(stock => {
        const filteredStockData = filterDataByDateRange(stockData[stock], startDate, endDate);
        const commonDates = filteredStockData.map(row => row.Date).filter(date =>
            filteredMarketData.some(row => row.Date === date)
        );
        
        const stockPrices = filteredStockData.filter(row => commonDates.includes(row.Date)).map(row => row.Close);
        const marketPrices = filteredMarketData.filter(row => commonDates.includes(row.Date)).map(row => row.Close);

        if (stockPrices.length > 1) {
            const avgStockReturn = math.mean(calculateReturns(stockPrices));
            const avgMarketReturn = math.mean(calculateReturns(marketPrices));
            alphas[stock] = avgStockReturn - (riskFreeRate + betas[stock] * (avgMarketReturn - riskFreeRate));
        } else {
            alphas[stock] = null;
        }
    });
    console.log("Stock Alphas:", alphas);
    return alphas;
}

// Compute Sharpe Ratio
function calculateSharpeRatio(stockData, riskFreeRate, startDate, endDate) {
    const sharpeRatios = {};
    Object.keys(stockData).forEach(stock => {
        const filteredStockData = filterDataByDateRange(stockData[stock], startDate, endDate);
        const stockPrices = filteredStockData.map(row => row.Close);

        if (stockPrices.length > 1) {
            const stockReturns = calculateReturns(stockPrices);
            const avgStockReturn = math.mean(stockReturns);
            const stdDev = math.std(stockReturns);
            sharpeRatios[stock] = stdDev ? (avgStockReturn - riskFreeRate) / stdDev : null;
        } else {
            sharpeRatios[stock] = null;
        }
    });
    console.log("Sharpe Ratios:", sharpeRatios);
    return sharpeRatios;
}

// Compute Treynor Ratio
function calculateTreynorRatio(stockData, betas, riskFreeRate, startDate, endDate) {
    const treynorRatios = {};
    Object.keys(stockData).forEach(stock => {
        const filteredStockData = filterDataByDateRange(stockData[stock], startDate, endDate);
        const stockPrices = filteredStockData.map(row => row.Close);

        if (stockPrices.length > 1) {
            const avgStockReturn = math.mean(calculateReturns(stockPrices));
            treynorRatios[stock] = betas[stock] > 0 ? (avgStockReturn - riskFreeRate) / betas[stock] : null;
        } else {
            treynorRatios[stock] = null;
        }
    });
    console.log("Treynor Ratios:", treynorRatios);
    return treynorRatios;
}

// Test the functions with sample data
function testStockAnalysis() {
    const stockData = {
        AAPL: [
            { Date: '2024-03-01', Close: 150 },
            { Date: '2024-03-02', Close: 152 },
            { Date: '2024-03-03', Close: 151 }
        ],
        NVDA: [
            { Date: '2024-03-01', Close: 300 },
            { Date: '2024-03-02', Close: 310 },
            { Date: '2024-03-03', Close: 308 }
        ]
    };

    const marketData = [
        { Date: '2024-03-01', Close: 4000 },
        { Date: '2024-03-02', Close: 4050 },
        { Date: '2024-03-03', Close: 4030 }
    ];

    const riskFreeRate = 0.02; // 2% risk-free rate
    const startDate = new Date('2024-03-01');
    const endDate = new Date('2024-03-03');

    const betas = calculateStockBeta(stockData, marketData, startDate, endDate);
    calculateStockAlpha(stockData, marketData, betas, riskFreeRate, startDate, endDate);
    calculateSharpeRatio(stockData, riskFreeRate, startDate, endDate);
    calculateTreynorRatio(stockData, betas, riskFreeRate, startDate, endDate);
}

testStockAnalysis();
// Stock Betas: { AAPL: 0.5709361900326038, NVDA: 1.140736511561519 }
// Stock Alphas: { AAPL: -0.007362715416860733, NVDA: 0.01194262061090494 }
// Sharpe Ratios: { AAPL: -1.1805879738753369, NVDA: -0.23315412785069947 }
// Treynor Ratios: { AAPL: -0.029114999728068736, NVDA: -0.005749916583249916 }