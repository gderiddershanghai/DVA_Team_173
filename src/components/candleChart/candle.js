const tickers = ["AAPL", "IVDA", "NVDA", "TLSA"];

// Insert search bar with dropdown suggestions
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

// Add toggles for moving averages
d3.select("body").insert("div", ":first-child")
    .attr("id", "maToggles")
    .selectAll("label")
    .data([
        { id: "ma7", label: "7-Day MA", color: "blue" },
        { id: "ma30", label: "1-Month MA", color: "orange" },
        { id: "ma90", label: "3-Month MA", color: "purple" }
    ])
    .enter()
    .append("label")
    .html(d => `<input type='checkbox' id='toggle-${d.id}' checked> ${d.label}`)
    .each(function(d) {
        d3.select(this).select("input").on("change", function() {
            d3.select(`#${d.id}-line`).style("display", this.checked ? "block" : "none");
        });
    });

// Function to load and render the chart for a given stock ticker.
function loadChart(ticker) {
    // Remove any existing chart.
    d3.select("svg").remove();

    const margin = { top: 50, right: 20, bottom: 50, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("body")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    d3.csv(`../../../toy_data/stock_data/${ticker}.csv`, d => {
        return {
            date: d3.timeParse("%Y-%m-%d")(d.Date.split(" ")[0]),
            open: +d.Open,
            high: +d.High,
            low: +d.Low,
            close: +d.Close
        };
    }).then(data => {
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

        // Moving averages calculation
        function movingAverage(data, days) {
            return data.map((d, i) => {
                if (i < days - 1) return null;
                const slice = data.slice(i - days + 1, i + 1);
                return {
                    date: d.date,
                    avg: d3.mean(slice, v => v.close)
                };
            }).filter(d => d);
        }

        const ma7 = movingAverage(weeklyData, 7);
        const ma30 = movingAverage(weeklyData, 30);
        const ma90 = movingAverage(weeklyData, 90);

        const x = d3.scaleBand()
            .domain(weeklyData.map(d => d.date))
            .range([0, width])
            .padding(0.3);

        const y = d3.scaleLinear()
            .domain([d3.min(weeklyData, d => d.low), d3.max(weeklyData, d => d.high)])
            .range([height, 0])
            .nice();

        const xAxis = d3.axisBottom(x)
            .tickValues(x.domain().filter(d => d.getMonth() % 3 === 0 && d.getDate() <= 7))
            .tickFormat(d3.timeFormat("%b %d, %Y"));
        
        svg.append("g").attr("transform", `translate(0, ${height})`).call(xAxis);
        svg.append("g").call(d3.axisLeft(y));

        // Draw weekly candlesticks
        weeklyData.forEach(d => {
            const color = d.open > d.close ? "red" : "green";
            const candleX = x(d.date);
            const candleWidth = x.bandwidth();

            svg.append("line")
                .attr("x1", candleX + candleWidth / 2)
                .attr("x2", candleX + candleWidth / 2)
                .attr("y1", y(d.high))
                .attr("y2", y(d.low))
                .attr("stroke", color);

            svg.append("rect")
                .attr("x", candleX)
                .attr("y", y(Math.max(d.open, d.close)))
                .attr("width", candleWidth)
                .attr("height", Math.abs(y(d.open) - y(d.close)))
                .attr("fill", color);
        });

        // Line generators for moving averages
        function drawLine(data, color, id) {
            const line = d3.line().x(d => x(d.date) + x.bandwidth() / 2).y(d => y(d.avg));
            svg.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 2)
                .attr("d", line)
                .attr("id", id + "-line")
                .style("display", "block");
        }

        drawLine(ma7, "blue", "ma7");
        drawLine(ma30, "orange", "ma30");
        drawLine(ma90, "purple", "ma90");
    });
}

loadChart("AAPL");
d3.select("#tickerSearch").on("input", function() {
    if (tickers.includes(this.value.toUpperCase())) {
        loadChart(this.value.toUpperCase());
    }
});
