export const wordBubbles = () => {
    let width = 1000;
    let height = 800;
    let data;
    let links = [];
    let margin = { top: 20, right: 50, bottom: 20, left: 20 };

    const processData = (rawData) => {
        if (!rawData) return [];
        
        rawData.forEach(d => {
            d.radius = Math.sqrt(d.counts) * 5;
          
            // const sign = Math.random() < 0.5 ? -1 : 1;
            const sign=1
            d.charge = sign * Math.pow(d.radius, 1.15);
          });
        
        const minScore = Math.min(...rawData.map(d => d.average_score));
        const maxScore = Math.max(...rawData.map(d => d.average_score));
        
        rawData.forEach(d => {
            d.color_value = (d.average_score - minScore) / (maxScore - minScore);
        });
        
        return rawData;
    };
        const minWeight = 1;
        const maxWeight = 25;
        const linkColorScale = d3.scaleLinear()
        .domain([minWeight, maxWeight])
        .range(["#a2d5c6", "#316879"]); 
    
    
    
    const my = (selection) => {
        // Process the data
        const processedData = processData(data);
        processedData.forEach(d => {
            d.x = Math.random() * width;
            d.y = Math.random() * height;
          });

          const centerX = width / 2;
          const centerY = height / 2;
          processedData.forEach((d, i) => {
            const angle = (i / processedData.length) * 2 * Math.PI;
            const r = width * 0.73; // radius from center
            d.x = centerX + r * Math.cos(angle);
            d.y = centerY + r * Math.sin(angle);
          });

        // Create map of words
        const wordMap = {};
        processedData.forEach(d => {
            wordMap[d.word] = d;
        });
        
        console.log("Word map keys:", Object.keys(wordMap));
        console.log("First few links before processing:", links.slice(0, 5));
        
        const processedLinks = links.map(link => ({
            source: wordMap[link.source],
            target: wordMap[link.target],
            weight: link.weight,
            thickness: Math.sqrt(link.weight*50) 
        })).filter(link => link.source && link.target); 

        console.log("Processed links:", processedLinks.length);
        console.log("Sample processed links:", processedLinks.slice(0, 5));

        const svg = selection
            .append('svg')
            .attr('width', width)
            .attr('height', height);
        
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, 1]);
            
        const t = d3
            .transition()
            .duration(1500)      
            .ease(d3.easeCubicOut);


        const minCount = Math.min(...processedData.map(d => d.counts));
        const maxCount = Math.max(...processedData.map(d => d.counts));
        
        const simulation = d3.forceSimulation(processedData)
            .force('link', d3.forceLink(processedLinks).id(d => d.word)
                .distance(d => 250 + d.source.radius + d.target.radius))
                
            .force('charge', d3.forceManyBody().strength(d => d.charge))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('x', d3.forceX().strength(0.05))
            .force('y', d3.forceY().strength(0.15))
            .force('collision', d3.forceCollide().radius(d => d.radius + 25))
            .alphaTarget(0.01)
            .alphaDecay(0.001)
            .on('tick', ticked);
            
        // const link = svg.append("g")
        // .attr("class", "links")
        // .selectAll("line")
        // .data(processedLinks)
        // .enter()
        // .append("line")        
        // .style("stroke", d => {
        //     const minWeight = 5;
        //     const maxWeight = 50;
        //     return d3.interpolateBlues(2*d.weight / maxWeight);
        //   })
        // .style("stroke-width", d => Math.sqrt(d.weight))
        // .style("opacity", 0)
        // .transition(t)
        // .delay((d, i) => i * 10)
        // .style("stroke-opacity", 0.68)

        const link = svg
        .append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(processedLinks)
        .enter()
        .append("line")
        // .style("stroke", (d) => {
        //   const maxWeight = 50;
        //   return d3.interpolateBlues((2 * d.weight) / maxWeight);
        // })
        .style("stroke", d => linkColorScale(d.weight))

        .style("stroke-width", (d) => Math.sqrt(d.weight))
        .style("stroke-opacity", 0.68);



        const nodes = svg.selectAll('.node')
            .data(processedData)
            .enter()
            .append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended))
                  // MOUSE EVENTS for tooltip:
  .on("mouseover", (event, d) => {
    tooltip
      .style("opacity", 0.95)
      .html(`
        <div>
          <strong>${d.word}</strong><br />
          Counts: ${d.counts}<br/>
          Sentiment Score: ${d.average_score.toFixed(2)}
        </div>
      `);
  })
  .on("mousemove", (event) => {
    tooltip
      .style("left", event.pageX + 10 + "px")
      .style("top", event.pageY + 10 + "px");
  })
  .on("mouseout", () => {
    tooltip.style("opacity", 0);
  });
                
            nodes
                .append("circle")
                .attr("r", 0) // Start collapsed
                .style("fill", (d) => colorScale(d.color_value))
                .style("stroke", "#333")
                .style("stroke-width", 1)
                .transition(t)
                .delay((d, i) => i * 100) 
                .attr("r", (d) => d.radius);
            
            nodes
                .append("text")
                .text(d => d.word)
                .attr("text-anchor", "middle")
                .attr("dy", ".3em")
                .style("font-size", d => Math.min(d.radius * 0.8, 14) + "px")
                .style("font-weight", "bold")
                .style("pointer-events", "none")
                .style("fill", "white")
                .style("opacity", 0)   
                .transition(t)
                .delay((d, i) => i * 100 + 100) 
                .style("opacity", 1);
            
        // Add a color gradient legend
        const legendWidth = 200;
        const legendHeight = 20;
        const legendX = width - legendWidth - 20;
        const legendY = 20;
        
        // Create color gradient for legend
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
            .attr('id', 'viridis-gradient')
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');
            
        // Add color stops to gradient
        const stops = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
        stops.forEach(stop => {
            gradient.append('stop')
                .attr('offset', `${stop * 100}%`)
                .attr('stop-color', colorScale(stop));
        });
        
        // add legend
        const legend = svg.append('g')
            .attr('class', 'legend');
            
        ////////////////////// color legend //////////////////////
        const xLocation = legendX - margin.right
        legend.append('text')
            .attr('x', xLocation+15)
            .attr('y', legendY - 5)
            .text('Word Mean Sentiment Score')
            .style('font-weight', 'bold')
            .style('font-size', '12px')
            
        legend.append('rect')
            .attr('x', xLocation)
            .attr('y', legendY)
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            .style('fill', 'url(#viridis-gradient)');
            
        
        legend.append('text')
            .attr('x', xLocation)
            .attr('y', legendY + legendHeight + 15)
            .text(`(Negative)`)
            .style('font-size', '10px');
            
        legend.append('text')
            .attr('x', xLocation + legendWidth)
            .attr('y', legendY + legendHeight + 15)
            .text(`(Positive)`)
            .style('text-anchor', 'end')
            .style('font-size', '10px');
            
        
        const sizeLegendY = legendY + legendHeight + 40;
        
        legend.append('text')
            .attr('x', xLocation+15)
            .attr('y', sizeLegendY +4)
            .text('Word Frequency (Counts)')
            .style('font-weight', 'bold')
            .style('fill', 'black')
            .style('font-size', '12px');
            
        const sizeStops = [minCount, (minCount + maxCount) / 2, maxCount];
        sizeStops.forEach((count, i) => {
            const radius = Math.sqrt(count) * 2;
            const cx = xLocation + 25 + i * 65;
            const cy = sizeLegendY + 30;
            
            // Add circle
            legend.append('circle')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', radius)
                .style('fill', 'black')
                .style('stroke', 'black')
                .style('stroke-width', 1);
                
            legend.append('text')
                .attr('x', cx)
                .attr('y', cy + radius + 15)
                .text(Math.round(count))
                .style('text-anchor', 'middle')
                .style('font-size', '10px');
        });

        const linkLegendY = sizeLegendY + 80;

        legend.append('text')
            .attr('x', legendX)
            .attr('y', linkLegendY + 15)
            .text('Co-occurrence Frequency')
            .style('font-weight', 'bold')
            .style('font-size', '12px');
            
            const linkWeights = processedLinks.map(d => d.weight);
            const minWeight = Math.min(...linkWeights);
            const maxWeight = Math.max(...linkWeights);
            

            const linkWidthScale = d3.scaleSqrt()
                .domain([minWeight, maxWeight])
                .range([1, 8]);  // cahnge mx if needed
            
            const linkStops = [minWeight, (minWeight + maxWeight) / 2, maxWeight];
            linkStops.forEach((weight, i) => {
                const thickness = linkWidthScale(weight);  
                const color = linkColorScale(weight);  
                const y = linkLegendY + i * 20;
            
                legend.append('line')
                    .attr('x1', xLocation+25)
                    .attr('y1', y + 35 )
                    .attr('x2', xLocation + 150)
                    .attr('y2', y+35 )
                    .attr('stroke', color)  
                    .attr('stroke-width', thickness);
            
                // Add weight label
                legend.append('text')
                    .attr('x', xLocation + 10)
                    .attr('y', y + 40)
                    .text(Math.round(weight))
                    .style('font-size', '10px');
            });


        function ticked() {
            // Update node positions (unchanged from before)
            nodes.attr('transform', d => {
              d.x = Math.max(margin.left + d.radius,
                             Math.min(width - margin.right - d.radius, d.x));
              d.y = Math.max(margin.top + d.radius,
                             Math.min(height - margin.bottom - d.radius, d.y));
              return `translate(${d.x},${d.y})`;
            });
            
            // Update link positions as straight lines:
            link
              .attr("x1", d => d.source.x)
              .attr("y1", d => d.source.y)
              .attr("x2", d => d.target.x)
              .attr("y2", d => d.target.y);
          }
        
        ////// tooltop
        // Create the tooltip
        const tooltip = d3
                .select("body")
                .append("div")
                .style("position", "absolute")
                .style("text-align", "center")
                .style("padding", "5px 8px")
                .style("font", "12px sans-serif")
                .style("background", "#f8f8f8")
                .style("border", "1px solid #ccc")
                .style("border-radius", "4px")
                .style("pointer-events", "none")
                .style("opacity", 0);





        // Drag functions
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            
            // Toggle fixed status
            if (d.fixed !== true) {
                d.fixed = true;
                d.fx = d.x;
                d.fy = d.y;
                // Change color to orange when fixed
                d3.select(this)
                    .select("circle")
                    .style("fill", "orange");
            } else {
                d.fixed = false;
                d.fx = null;
                d.fy = null;
                // Restore original color based on sentiment
                d3.select(this)
                    .select("circle")
                    .style("fill", () => colorScale(d.color_value));
            }
        }
    };

    
    
    my.width = function(_) {
        return arguments.length ? ((width = +_), my) : width;
    };
    
    my.height = function(_) {
        return arguments.length ? ((height = +_), my) : height;
    };
    
    my.data = function(_) {
        return arguments.length ? ((data = _), my) : data;
    };
    
    my.margin = function(_) {
        return arguments.length ? ((margin = _), my) : margin;
    };

    my.links = function(_) {
        return arguments.length ? ((links = _), my) : links;
    };
    
    return my;
};
