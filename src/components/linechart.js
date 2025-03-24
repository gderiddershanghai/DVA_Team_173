// linegraph.js

// Load the CSV data once
let dataset = []; // Global variable for data

d3.csv("../toy_data/stock_data/TLSA.csv")
  .then((data) => {
    // Parse the date and close price
    data.forEach((d) => {
      d.Date = new Date(d.Date); // Convert to date object
      d.Close = +d.Close; // Convert to number
    });

    dataset = data; // Store data globally

    // Populate year dropdown
    const years = [...new Set(data.map((d) => d.Date.getFullYear()))];
    const yearSelect = d3.select("#year-select");
    years.forEach((year) => {
      yearSelect.append("option").attr("value", year).text(year);
    });

    // Initialize chart with the first year by default
    updateChart(years[0]);

    // Add listener for year dropdown changes
    yearSelect.on("change", function () {
      const selectedYear = this.value;
      updateChart(selectedYear);
    });
  })
  .catch((error) => {
    console.error("Error loading the data:", error);
  });

function updateChart(selectedYear) {
  // Group data by month for the selected year
  const filteredData = d3
    .nest()
    .key((d) => d.Date.getMonth())
    .rollup((v) => d3.mean(v, (d) => d.Close))
    .entries(dataset.filter((d) => d.Date.getFullYear() == selectedYear))
    .map((d) => ({ Date: new Date(selectedYear, d.key), Close: d.value }));

  // Set margins and dimensions
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  // Remove previous SVG
  d3.select("#chart").selectAll("*").remove();

  // Create SVG container
  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Set the scales
  const x = d3.scaleTime().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);

  // Define the line
  const line = d3
    .line()
    .x((d) => x(d.Date))
    .y((d) => y(d.Close));

  // Set the domains
  x.domain(d3.extent(filteredData, (d) => d.Date));
  y.domain([0, d3.max(filteredData, (d) => d.Close)]);

  // Add X and Y axes
  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth).tickFormat(d3.timeFormat("%B")))
    .append("text")
    .attr("y", 40)
    .attr("x", width / 2)
    .attr("fill", "black")
    .style("text-anchor", "middle")
    .text("Months");

  svg
    .append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2)
    .attr("dy", "1em")
    .attr("fill", "black")
    .style("text-anchor", "middle")
    .text("Closing Price (USD)");

  // Add the line path
  svg
    .append("path")
    .datum(filteredData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", line);
}
