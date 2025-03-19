// Create a search bar with suggestion dropdown for stock tickers.
const tickers = ["AAPL", "IVDA", "NVDA", "TLSA"];

// Insert search bar at the top of the body.
const searchDiv = d3.select("body").insert("div", ":first-child")
    .attr("id", "searchBar")
    .style("margin", "20px");

searchDiv.append("input")
    .attr("type", "text")
    .attr("placeholder", "Search Stock Ticker")
    .attr("id", "tickerSearch")
    .attr("list", "tickers");

searchDiv.append("datalist")
    .attr("id", "tickers")
    .selectAll("option")
    .data(tickers)
    .enter()
    .append("option")
    .attr("value", d => d);

// Function to load and render the chart for a given stock ticker.
function loadChart(ticker) {
    // Remove any existing chart.
    d3.select("svg").remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("body")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    d3.csv(`stock_data/${ticker}.csv`, d => {
            // Parse date and convert prices to numbers.
            const dateStr = d.Date.split(" ")[0];
            return {
                    date: d3.timeParse("%Y-%m-%d")(dateStr),
                    open: +d.Open,
                    high: +d.High,
                    low: +d.Low,
                    close: +d.Close
            };
    }).then(data => {
            // Sort data and filter dates after December 31, 2020.
            data.sort((a, b) => a.date - b.date);
            data = data.filter(d => d.date > new Date("2020-12-31"));

            // Aggregate data by week.
            const grouped = d3.group(data, d => d3.timeWeek.floor(d.date));
            const weeklyData = Array.from(grouped, ([weekStart, values]) => ({
                    date: weekStart,
                    open: values[0].open,
                    close: values[values.length - 1].close,
                    high: d3.max(values, d => d.high),
                    low: d3.min(values, d => d.low)
            }));

            // Create scales.
            const x = d3.scaleBand()
                .domain(weeklyData.map(d => d.date))
                .range([0, width])
                .padding(0.3);

            const y = d3.scaleLinear()
                .domain([d3.min(weeklyData, d => d.low), d3.max(weeklyData, d => d.high)])
                .range([height, 0])
                .nice();

            // X Axis with quarterly tick formatting.
            svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x)
                    .tickValues(x.domain().filter(d => d.getMonth() % 3 === 0 && d.getDate() <= 7))
                    .tickFormat(d3.timeFormat("%b %d, %Y")))
                .selectAll("text")
                .attr("transform", "rotate(-45)")
                .style("text-anchor", "end");

            // Y Axis.
            svg.append("g")
                .call(d3.axisLeft(y));

            // Draw weekly candles.
            weeklyData.forEach(d => {
                    const color = d.open > d.close ? "red" : "green";
                    const candleX = x(d.date);
                    const candleWidth = x.bandwidth();

                    // Draw the wick.
                    svg.append("line")
                        .attr("x1", candleX + candleWidth / 2)
                        .attr("x2", candleX + candleWidth / 2)
                        .attr("y1", y(d.high))
                        .attr("y2", y(d.low))
                        .attr("stroke", color);

                    // Draw the candle body.
                    svg.append("rect")
                        .attr("x", candleX)
                        .attr("y", y(Math.max(d.open, d.close)))
                        .attr("width", candleWidth)
                        .attr("height", Math.abs(y(d.open) - y(d.close)))
                        .attr("fill", color);
            });
    });
}

// Initially load the chart for "AAPL".
loadChart("AAPL");

// When a new ticker is selected from the search bar, reload the chart.
d3.select("#tickerSearch").on("change", function() {
    const ticker = this.value.toUpperCase();
    loadChart(ticker);
});