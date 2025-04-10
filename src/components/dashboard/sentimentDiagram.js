// Sentiment diagram structure and functionality
// Set up dimensions for sentiment diagram
const sentimentMargin = {top: 20, right: 20, bottom: 20, left: 20};
const sentimentWidth = 1300 - sentimentMargin.left - sentimentMargin.right;
const sentimentHeight = 800 - sentimentMargin.top - sentimentMargin.bottom;

// Function to update the sentiment chart with API data
function updateSentimentChart(sentimentData, dependencies) {
  const { tooltip } = dependencies;
  
  if (!sentimentData || !sentimentData.keywords || Object.keys(sentimentData.keywords).length === 0) {
    // Create empty sentiment visualization
    d3.select("#sentimentChart").selectAll("*").remove();
    return;
  }
  
  // Extract keywords and their data
  const keywords = Object.keys(sentimentData.keywords);
  const bubbleData = keywords.map(keyword => {
    const keywordData = sentimentData.keywords[keyword];
    return {
      keyword: keyword,
      sentiment: keywordData.sentiment_score,
      count: keywordData.count,
      // Size is based on count, but with a minimum to ensure visibility
      size: Math.max(10, Math.min(50, keywordData.count / 2))
    };
  });
  
  // Remove any existing sentiment SVG and create a new one
  d3.select("#sentimentChart").selectAll("*").remove();
  
  const sentimentSvg = d3.select("#sentimentChart")
    .append("svg")
    .attr("width", sentimentWidth)
    .attr("height", sentimentHeight);
    
  // Create force simulation for bubble layout
  const simulation = d3.forceSimulation(bubbleData)
    .force("charge", d3.forceManyBody().strength(5))
    .force("center", d3.forceCenter(sentimentWidth / 2, sentimentHeight / 2))
    .force("collision", d3.forceCollide().radius(d => d.size + 2))
    .stop();
  
  // Run simulation
  for (let i = 0; i < 120; ++i) simulation.tick();
  
  // Color scale based on sentiment
  const colorScale = d3.scaleLinear()
    .domain([-1, 0, 1])  // Sentiment typically ranges from -1 to 1
    .range(["#F44336", "#9E9E9E", "#4CAF50"]);
  
  // Draw bubbles
  const bubbles = sentimentSvg.selectAll("g")
    .data(bubbleData)
    .enter()
    .append("g")
    .attr("transform", d => `translate(${d.x},${d.y})`);
    
  bubbles.append("circle")
    .attr("r", d => d.size)
    .attr("fill", d => colorScale(d.sentiment))
    .attr("stroke", "#333")
    .attr("stroke-width", 1)
    .on("mouseover", function(event, d) {
      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html(`
        <strong>${d.keyword}</strong><br>
        Sentiment: ${d.sentiment.toFixed(2)}<br>
        Count: ${d.count}
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function() {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });
    
  // Add text labels to bubbles
  bubbles.append("text")
    .text(d => d.keyword)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("font-size", d => Math.min(d.size * 0.8, 12))
    .attr("fill", "white");
}

// Export the functions and constants
export {
  sentimentMargin,
  sentimentWidth,
  sentimentHeight,
  updateSentimentChart
}; 