export const wordBubbles = () => {
    let width = 1000;
    let height = 800;
    let data;
    let links = [];
    let margin = { top: 20, right: 50, bottom: 20, left: 20 };

    const processData = (rawData) => {
        if (!rawData) return [];
        
        // Find min and max counts for better scaling
        const minCount = Math.min(...rawData.map(d => d.counts));
        const maxCount = Math.max(...rawData.map(d => d.counts));
        //////////////////////////////////////////////
        // change the sizes here
        // Create a more compressed scale for radius
        const radiusScale = d3.scaleSqrt()
        .domain([minCount, maxCount])
        .range([10, 60]); 
        //////////////////////////////////////////////////
        
        rawData.forEach(d => {
            d.radius = radiusScale(d.counts);
          
            const sign = 1;
            // Scale charge based on radius but cap it for very large nodes
            d.charge = sign * Math.min(Math.pow(d.radius, 1.15), -300);
        });
        
        const minScore = Math.min(...rawData.map(d => d.average_score));
        const maxScore = Math.max(...rawData.map(d => d.average_score));
        
        rawData.forEach(d => {
            d.color_value = (d.average_score - minScore) / (maxScore - minScore);
        });
        
        return rawData;
    };
    
    // Will be set dynamically based on data
    let minWeight = 1;
    let maxWeight = 25;
    
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
            const r = width * 0.4; // Reduced radius from center for better initial layout
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
        
        // Get min and max weights for better scaling
        const linkWeights = links.map(link => link.weight);
        const minWeight = Math.min(...linkWeights);
        const maxWeight = Math.max(...linkWeights);


        const minCount = Math.min(...processedData.map(d => d.counts));
        const maxCount = Math.max(...processedData.map(d => d.counts));

        console.log("Max count:", maxCount);
        const threshold = Math.round(maxWeight * 0.005); // 0.75 percent of max count




        // Create a more compressed scale for link thickness
        const linkThicknessScale = d3.scaleSqrt()
        .domain([threshold, maxWeight])
        .range([0.5, 6]);


            /////////////////////////////////////////////////////////////////////////////
            // const maxCount = Math.max(...processedData.map(d => d.counts));
            // console.log("Max count:", maxCount);
            // const threshold = maxWeight * 0.0075; // 0.75 percent of max count
            
            const processedLinks = links.map(link => ({
                source: wordMap[link.source],
                target: wordMap[link.target],
                weight: link.weight,
                thickness: linkThicknessScale(link.weight)
            })).filter(link => link.source && link.target && link.weight >= threshold);
        
        // Create link color scale based on actual data
        const linkColorScale = d3.scaleLinear()
            .domain([threshold, maxWeight])
            .range(["#a2d5c6", "#316879"]);

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

        // const minCount = Math.min(...processedData.map(d => d.counts));
        // const maxCount = Math.max(...processedData.map(d => d.counts));
        
        const simulation = d3.forceSimulation(processedData)
            .force('link', d3.forceLink(processedLinks).id(d => d.word)
                // More consistent distance calculation
                .distance(d => 100 + Math.min(d.source.radius + d.target.radius, 100)))
            .force('charge', d3.forceManyBody().strength(d => Math.min(d.charge, -300)))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('x', d3.forceX().strength(0.08))
            .force('y', d3.forceY().strength(0.18))
            .force('collision', d3.forceCollide().radius(d => d.radius + 15))
            .alphaTarget(0.01)
            .alphaDecay(0.002)
            .on('tick', ticked);

        const link = svg
            .append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(processedLinks)
            .enter()
            .append("line")
            .style("stroke", d => linkColorScale(d.weight))
            .style("stroke-width", d => d.thickness)
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
            // .style("font-size", d => Math.min(d.radius * 0.5, 25) + "px")
            // .style("font-weight", "bold")
            .style("font-size", d => d.word.length > 8 ? "9px" : Math.min(d.radius * 0.5, 25) + "px")
            .style("font-weight", "bold")

            .style("pointer-events", "none")
            .style("fill", "white")
            .style("opacity", 0)   
            .transition(t)
            .delay((d, i) => i * 100 + 100) 
            .style("opacity", 1);
        
        // Add a color gradient legend
        const legendWidth = 250;
        const legendHeight = 20;
        const legendX = width - legendWidth - margin.right;
        //// CHANGE THE SIZES
        const legendY = 20;
        const sizeLegendY = legendY + legendHeight + 50;
        const linkLegendY = sizeLegendY + 100; 
        
        
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
        const xLocation = legendX +50
        legend.append('text')
            .attr('x', xLocation + 55)
            .attr('y', legendY - 5)
            .text('Word Mean Sentiment Score')
            // .style('text-anchor', 'right')
            .style('font-weight', 'bold')
            .style('font-size', '12px')
            
        legend.append('rect')
            .attr('x', xLocation)
            .attr('y', legendY)
            .attr('width', legendWidth-25)
            .attr('height', legendHeight)
            .style('fill', 'url(#viridis-gradient)');
            
        
            legend.append('text')
            .attr('x', legendX+50)
            .attr('y', legendY + legendHeight + 25) // Increase from 15 to 25
            .text(`(Negative)`)
            .style('font-size', '10px');
            
        legend.append('text')
            .attr('x', legendX + legendWidth+25)
            .attr('y', legendY + legendHeight + 25) // Increase from 15 to 25
            .text(`(Positive)`)
            .style('text-anchor', 'end')
            .style('font-size', '10px');
        
            
        
        // const sizeLegendY = legendY + legendHeight + 40;
        
        legend.append('text')
        .attr('x', xLocation+15)
        .attr('y', sizeLegendY +4)
        .style('font-weight', 'bold')
        .style('fill', 'black')
        .style('font-size', '12px')
        .selectAll('tspan')
        .data(['Word Frequency', '(Legend bubbles shown at 1:3 scale)'])
        .enter()
        .append('tspan')
        .attr('x', xLocation+15)
        .attr('dy', (d, i) => i * 15)  // Adjust line spacing as needed
        .text(d => d);
    



            
        // Use nicer round numbers for size legend
        const sizeStops = [
            minCount,
            Math.round((minCount + maxCount) / 2),
            maxCount
        ];
        
        // Use the same scale as for the actual nodes
        const radiusScale = d3.scaleSqrt()
            .domain([minCount, maxCount])
            .range([5, 40]);
            
        sizeStops.forEach((count, i) => {
            const radius = radiusScale(count);
            const cx = xLocation + 25 + i * 85; // Increase from 65 to 85
            const cy = sizeLegendY + 45; 
            
            const legendScaleFactor = 1/2;
            // Add circle
            legend.append('circle')
            .attr('cx', cx)
            .attr('cy', cy)
            .attr('r', radius * legendScaleFactor)
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

        // const linkLegendY = sizeLegendY + 80;

        legend.append('text')
        .attr('x', xLocation+45)
        .attr('y', linkLegendY + 25)
        .text('Co-occurrence Frequency')
        .style('font-weight', 'bold')
        .style('font-size', '12px');
    
    // Add an explanatory note
    legend.append('text')
        .attr('x', xLocation+15)
        .attr('y', linkLegendY + 40)
        .text('(Link thickness shows frequency of word pairs)')
        .style('font-size', '10px')
        .style('font-style', 'italic');
    
            
        // Use the same scale as for the actual links
        const linkWidthScale = d3.scaleSqrt()
            .domain([minWeight, maxWeight])
            .range([0.5, 6]);
        
        // Use nicer round numbers for link legend
        const linkStops = [
            threshold,
            Math.round((threshold + maxWeight) / 2),
            maxWeight
        ];
        
        linkStops.forEach((weight, i) => {
            const thickness = linkWidthScale(weight);  
            const color = linkColorScale(weight);  
            const y = linkLegendY + i * 25;
        
            legend.append('line')
                .attr('x1', xLocation+55)
                .attr('y1', y + 55 )
                .attr('x2', xLocation + 200)
                .attr('y2', y+55 )
                .attr('stroke', color)  
                .attr('stroke-width', thickness);
        
            // Add weight label
            legend.append('text')
                .attr('x', xLocation +20)
                .attr('y', y + 60)
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
        
        ////// tooltip
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
