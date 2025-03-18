
d3.dsv(",", "board_games.csv", function(d) {
    return {
      source: d.source,
      target: d.target,
      value: +d.value
    }
  }).then(function(data) {
  
    var links = data;
  
    var nodes = {};
  
    // compute the distinct nodes from the links.
    links.forEach(function(link) {
        link.source = nodes[link.source] || (nodes[link.source] = {name: link.source});
        link.target = nodes[link.target] || (nodes[link.target] = {name: link.target});
    });

    // https://stackoverflow.com/questions/54471028/how-can-i-calculate-the-degree-of-nodes-in-d3-v5
    // Add degree 

//   
    // var width = 1200, 
    //     height = 700;
    var width = 1200, 
    height = 700;

    var force = d3.forceSimulation()
        .nodes(d3.values(nodes))
        .force("link", d3.forceLink(links).distance(100))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .force("charge", d3.forceManyBody().strength(-250))
        .alphaTarget(1)
        .on("tick", tick);
  
    var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height);
  
    // add the links
    // . [3 points] Styling edges: Style the edges based on the “value” field in the links array: 
    // • If the value of the edge is equal to 0 (similar), the edge should be gray, thick, and solid (The dashed 
    // line with zero gap is not considered as solid). 
    // • If the value of the edge is equal to 1 (not similar), the edge should be green, thin, and dashed. 
      // Add GT username
      svg.append('text')
        .attr('id', 'credit')
        .text('gridder3')
        .attr("x", width - 175)
        .attr("y", 50)
        .style("text-anchor", "end")
        .style("font-size", "12px")
        .style("font-weight", "bold")

    var path = svg.append("g")
        .selectAll("path")
        .data(links)
        .enter()
        .append("path")
        .attr("class", function(d) { return "link " + d.type; })
        // refactor
        .style('stroke', d => d.value === 0 ? 'gray' : 'green') 
        .style('stroke-dasharray', d => d.value === 1 ? '2,5' : 'none') 
        .style('stroke-width', d => d.value === 0 ? '3.5px' : '1.5px');

        // .style('stroke', function(d) { 
        //     if (d.value === 0) {
        //         return 'gray'
        //     } else {
        //     return 'green' }
        //     ; }) 
        // .style('stroke-dasharray', function(d) { 
        //     if (d.value === 1) {
        //         return '2,5'
        //     } 
        //     ; }) 
        // .style('stroke-width', function(d) { 
        //     if (d.value === 0) {
        //         return '3.5px'
        //     } 
        //     ; }) 

  
    // define the nodes
    var node = svg.selectAll(".node")
        .data(force.nodes())
        .enter().append("g")
        .attr("class", "node")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
            );

        d3.selectAll('g.node')
        .each(function(d) {
            d.degree = 0;
        });
    
        // Calculate degree
        links.forEach(function(d){
            d.source.degree += 1;
            d.target.degree += 1;
        });
    
        // Accessor functions to get min & max
        var minDegree = d3.min(
        d3.values(nodes), function(d) {
            return d.degree; })
    
        var maxDegree = d3.max(
        d3.values(nodes), function(d) { 
            return d.degree; })
            
        // Create node scale based on degree
        var nodescale = d3.scaleLog()
        .domain( [minDegree, maxDegree] )
        .range( [5, 25] ); // Change this to your desired range
        console.log(minDegree, maxDegree, 'asd')

    const colors = d3.scaleOrdinal(d3.interpolateViridis);
    var colorscale = d3.scaleOrdinal(d3.interpolateViridis)
                    .domain(d3.range(maxDegree))
                    .range(d3.range(0, 1.1, 0.1))
                    
    console.log('FUCK D3', colorscale(5))

    // https://stackoverflow.com/questions/48922251/using-scalequantile-with-viridis-color-scheme
    // add the nodes
    node.append("circle")
        .attr("id", function(d){
           return (d.name.replace(/\s+/g,'').toLowerCase());
        })
        .attr("r", (d)=> nodescale(d.degree))
        .style('fill', (d,i) => d3.interpolateViridis(colorscale(d.degree)))

        // a. [2 points] Adding node labels: Modify submission.html to show the node label (the node name, e.g., the 
        //     source) at the top right of each node in bold. If a node is dragged, its label must move with it. 
        

    node.append('text')
        .attr("x", 12) 
        .attr("y", -25) 
        .text(d => d.name)
        .style("font-weight", "bold")
        // .style('font', '12px')


    
    // add the curvy lines
    function tick() {
        path.attr("d", function(d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
            return "M" +
                d.source.x + "," +
                d.source.y + "A" +
                dr + "," + dr + " 0 0,1 " +
                d.target.x + "," +
                d.target.y;
        });
  
        node.attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")"; 
        });
    };
  
    function dragstarted(d) {
        if (!d3.event.active) force.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    };
  
    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    };
  
    function dragended(d) {
        // d.fx = d3.event.x;
        // d.fy = d3.event.y;
        console.log('fixed status', d.fixed)
        if (d.fixed != true) {
            d.fixed = true;
        }
        else {
            d.fixed = false;
        }
        
        if (!d3.event.active) force.alphaTarget(0);
        if (d.fixed === true) {
            d.fx = d.x;
            d.fy = d.y;
        }
        else {
            d.fx = null;
            d.fy = null;
        }
        if (d.fixed === true) {
        d3.select(this) 
        .select("circle")
        .style("fill", "orange");
        }
        else {
            d3.select(this)
            .select("circle")
            .style('fill', (d,i) => d3.interpolateViridis(colorscale(d.degree)))
        }
    };

    // d3.selectAll('.node')
    //     .on('click', function() {
            
    //         if (!d3.event.active) force.alphaTarget(0);
    //         if (d.fixed == true) {
    //             d.fx = null;
    //             d.fy = null;
    //             d3.select(this)
    //             .select("circle")
    //             .style('fill', (d,i) => d3.interpolateViridis(colorscale(d.degree)))
    //         }
    //         d.fixed = false;
    //     })
        

  }).catch(function(error) {
    console.log(error);
  });
  