const margin = { top: 20, right: 30, bottom: 30, left: 50 },
width = 800 - margin.left - margin.right,
height = 350 - margin.top - margin.bottom;

// Sample data for the main chart
const mainData = [
{ date: new Date(2021, 0, 1), value: 220 },
{ date: new Date(2021, 1, 1), value: 230 },
{ date: new Date(2021, 2, 1), value: 210 },
{ date: new Date(2021, 3, 1), value: 250 },
{ date: new Date(2021, 4, 1), value: 270 },
{ date: new Date(2021, 5, 1), value: 260 },
{ date: new Date(2021, 6, 1), value: 290 },
{ date: new Date(2021, 7, 1), value: 300 },
{ date: new Date(2021, 8, 1), value: 320 },
{ date: new Date(2021, 9, 1), value: 350 }
];

// Create the SVG for the main chart
const svgMain = d3.select("#chartContainer")
.append("svg")
.attr("width", width + margin.left + margin.right)
.attr("height", height + margin.top + margin.bottom)
.append("g")
.attr("transform", `translate(${margin.left},${margin.top})`);

// Scales
const xScaleMain = d3.scaleTime()
.domain(d3.extent(mainData, d => d.date))
.range([0, width]);

const yScaleMain = d3.scaleLinear()
.domain([
d3.min(mainData, d => d.value) - 10,
d3.max(mainData, d => d.value) + 10
])
.range([height, 0]);

// Line generator
const lineMain = d3.line()
.x(d => xScaleMain(d.date))
.y(d => yScaleMain(d.value));

// Draw the line
svgMain.append("path")
.datum(mainData)
.attr("fill", "none")
.attr("stroke", "#4caf50")
.attr("stroke-width", 2)
.attr("d", lineMain);

// X Axis
svgMain.append("g")
.attr("transform", `translate(0,${height})`)
.call(d3.axisBottom(xScaleMain).ticks(5));

// Y Axis
svgMain.append("g")
.call(d3.axisLeft(yScaleMain));


/*******************************************************
* Similar Stock Mini Chart (Apple)
*******************************************************/
const miniWidth = 250, miniHeight = 100;
const miniData = [
{ date: new Date(2021, 0, 1), value: 130 },
{ date: new Date(2021, 1, 1), value: 140 },
{ date: new Date(2021, 2, 1), value: 120 },
{ date: new Date(2021, 3, 1), value: 150 },
{ date: new Date(2021, 4, 1), value: 160 }
];

const xScaleMini = d3.scaleTime()
.domain(d3.extent(miniData, d => d.date))
.range([0, miniWidth]);
const yScaleMini = d3.scaleLinear()
.domain([
d3.min(miniData, d => d.value) - 5,
d3.max(miniData, d => d.value) + 5
])
.range([miniHeight, 0]);

const lineMini = d3.line()
.x(d => xScaleMini(d.date))
.y(d => yScaleMini(d.value));

const svgSimilar = d3.select("#similarStockChart")
.append("svg")
.attr("width", miniWidth)
.attr("height", miniHeight);

svgSimilar.append("path")
.datum(miniData)
.attr("fill", "none")
.attr("stroke", "#2196f3")
.attr("stroke-width", 2)
.attr("d", lineMini);


/*******************************************************
* Inverse Correlation Mini Chart (Coca Cola)
*******************************************************/
const miniDataInverse = [
{ date: new Date(2021, 0, 1), value: 50 },
{ date: new Date(2021, 1, 1), value: 55 },
{ date: new Date(2021, 2, 1), value: 45 },
{ date: new Date(2021, 3, 1), value: 60 },
{ date: new Date(2021, 4, 1), value: 58 }
];

const svgInverse = d3.select("#inverseStockChart")
.append("svg")
.attr("width", miniWidth)
.attr("height", miniHeight);

const xScaleInverse = d3.scaleTime()
.domain(d3.extent(miniDataInverse, d => d.date))
.range([0, miniWidth]);
const yScaleInverse = d3.scaleLinear()
.domain([
d3.min(miniDataInverse, d => d.value) - 5,
d3.max(miniDataInverse, d => d.value) + 5
])
.range([miniHeight, 0]);

const lineInverse = d3.line()
.x(d => xScaleInverse(d.date))
.y(d => yScaleInverse(d.value));

svgInverse.append("path")
.datum(miniDataInverse)
.attr("fill", "none")
.attr("stroke", "#ff9800")
.attr("stroke-width", 2)
.attr("d", lineInverse);


/*******************************************************
* Bubble Chart for Sentiment Analysis
*******************************************************/
const bubbleData = [
{ name: "Revenue", value: 30 },
{ name: "Cloud", value: 25 },
{ name: "AI", value: 35 },
{ name: "Technology", value: 15 },
{ name: "Increased Earning", value: 20 },
{ name: "Lagging Innovation", value: 10 },
{ name: "Reduced Earning", value: 10 },
{ name: "Security Breach", value: 40 }
];

const diameter = 300;
const bubble = d3.pack()
.size([diameter, diameter])
.padding(2);

const root = d3.hierarchy({ children: bubbleData })
.sum(d => d.value);

const bubbleSvg = d3.select("#bubbleChart")
.append("svg")
.attr("width", diameter)
.attr("height", diameter)
.attr("class", "bubble");

const nodes = bubble(root).leaves();

const node = bubbleSvg.selectAll(".node")
.data(nodes)
.enter()
.append("g")
.attr("class", "node")
.attr("transform", d => `translate(${d.x}, ${d.y})`);

node.append("circle")
.attr("r", d => d.r)
.style("fill", (d, i) => d3.schemeTableau10[i % 10]);

node.append("text")
.attr("dy", "0.3em")
.style("text-anchor", "middle")
.style("font-size", d => d.r / 3)
.text(d => d.data.name)
.attr("fill", "#fff");