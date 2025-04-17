export const wordBubbles = () => {

    let width = 1200;
    let height = 700;
    let data;
    let links = [];
    let margin = { top: 20, right: 20, bottom: 20, left: 20 };
    let minScore, maxScore; // Define these at the module level


    function isInLegendArea(x, y) {
        return y < 160 && x > (width / 2 - 420) && x < (width / 2 + 420);
    }
    


    const backGroundColor = "#F1EEEB"//"aliceblue"; 

    const processData = (rawData) => {
        if (!rawData) return [];
        
        // Find min and max counts for better scaling
        const minCount = Math.min(...rawData.map(d => d.counts));
        const maxCount = Math.max(...rawData.map(d => d.counts));
        
        // Create a more compressed scale for radius
        const radiusScale = d3.scaleSqrt()
            .domain([minCount, maxCount])
            .range([20, 70]); 
        
        rawData.forEach(d => {
            d.radius = radiusScale(d.counts);
          
            const sign = 1;
            // Scale charge based on radius but cap it for very large nodes
            d.charge = sign * Math.min(Math.pow(d.radius, 1.15), -100);
            // const polarityStrength = 60;
            // d.charge = (d.average_score >= 0 ? -1 : 1) * polarityStrength - Math.pow(d.radius, 1.1);
            // d.charge = -100 + d.average_score * 600; 
        });
        
        minScore = Math.min(...rawData.map(d => d.average_score));
        maxScore = Math.max(...rawData.map(d => d.average_score));
        
        rawData.forEach(d => {
            // normalize color
            // d.color_value = (d.average_score - minScore) / (maxScore - minScore);
            // dont normalize the color
            d.color_value = d.average_score;
        });
        
        return rawData;
    };
    
    // set dynamically based on data
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
        const centerY = height * .4;
        processedData.forEach((d, i) => {
            const angle = (i / processedData.length) * 2 * Math.PI;
            const r = width * .5; // reduce!!
            d.x = centerX + r * Math.cos(angle);
            d.y = centerY + r * Math.sin(angle);
            // d.y = height * 0.015 + Math.random() * 40;
        });

        // Create map of words
        const wordMap = {};
        processedData.forEach(d => {
            wordMap[d.word] = d;
        });
        
        console.log("wodd map keys:", Object.keys(wordMap));
        console.log("links before processing:", links.slice(0, 5));
        
        // Get min and max weights for better scaling
        const linkWeights = links.map(link => link.weight);
        const minWeight = Math.min(...linkWeights);
        const maxWeight = Math.max(...linkWeights);

        const minCount = Math.min(...processedData.map(d => d.counts));
        const maxCount = Math.max(...processedData.map(d => d.counts))

        console.log("Max count:", maxCount)
        const threshold = Math.round(maxWeight * 0.005)
        
        const linkThicknessScale = d3.scaleSqrt()
            .domain([threshold, maxWeight])
            .range([0.5, 4]);
            
        const processedLinks = links.map(link => ({
            source: wordMap[link.source],
            target: wordMap[link.target],
            weight: link.weight,
            thickness: linkThicknessScale(link.weight)
        })).filter(link => link.source && link.target && link.weight >= threshold);
        
        // Create link color scale based on actual data
        // const linkColorScale = d3.scaleLinear()
        //     .domain([threshold, maxWeight])
        //     .range(["#a2d5c6", "#316879"]);

        const linkColorScale = d3.scaleLinear()
            .domain([minWeight, maxWeight])
            // .domain([minWeight, maxWeight])
            .range(["#CDC9C9", "#544444"]);

        console.log("Processed links:", processedLinks.length);
        console.log("Sample processed links:", processedLinks.slice(0, 5));

        const svg = selection
            .append('svg')
            .attr('width', width)
            .attr('height', height-10)
            .style('background-color', 'white');
        
        // const colorScale = d3.scaleSequential(d3.interpolateViridis)
        //     .domain([Math.min(minScore*1.2,-0.5), Math.max(maxScore*1.5,0.75)]);

        const colorScale = d3.scaleLinear()
        .domain([-0.5, -0.3, -0.1, 0, 0.3, 0.5, 0.75])
        .range(["#ed5f74", "#EF7C8E", "#F5B9C3", '#fef9e7', "#B6E2D3", "#66C2A3", "#1B9E77"])
        .clamp(true);
    
            
        const t = d3
            .transition()
            .duration(1500)      
            .ease(d3.easeCubicOut);
        
        const simulation = d3.forceSimulation(processedData)
            .force('link', d3.forceLink(processedLinks).id(d => d.word)
                .distance(d => 100 + Math.min(d.source.radius + d.target.radius, 100)))
            .force('charge', d3.forceManyBody().strength(d => Math.min(d.charge, -350)))
            .force('center', d3.forceCenter(width / 2, height * 0.7))
            .force('x', d3.forceX().strength(0.08))
            .force('y', d3.forceY().strength(0.18))
            .force('collision', d3.forceCollide().radius(d => d.radius +25)) // makes them spread out more
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
                
                    // .style("fill", () => colorScale(d.color_value))
                    // .style("stroke-width", 5) 
                    // .style("stroke", () => colorScale(d.color_value))

        nodes
            .append("circle")
            .attr("r", 0) // Start collapsed
            .style("fill", backGroundColor)
            .style("stroke", (d) => colorScale(d.color_value))
            .style("stroke-width", 10)
            .transition(t)
            .delay((d, i) => i * 100) 
            .attr("r", (d) => d.radius);
        
        nodes
            .append("text")
            .text(d => d.word)
            .attr("text-anchor", "middle")
            .attr("dy", ".3em")
            .style("font-size", d => {
                const baseSize = d.radius * 0.6; // 60% of node radius
                const lengthPenalty = Math.sqrt(d.word.length); // Reduce impact of long words
                const calculatedSize = Math.min(baseSize, baseSize / (lengthPenalty * 0.60));
                return Math.max(calculatedSize, 8) + "px"; // Enforce 8px minimum
            })
            .style("text-anchor", "middle")
            .style("alignment-baseline", "middle")            
            .style("font-weight", "bold")
            .style("pointer-events", "none")
            .style("fill", "black")
            .style("opacity", 0)   
            .transition(t)
            .delay((d, i) => i * 100 + 100) 
            .style("opacity", 1);



        // Add a color gradient legend
        const legendWidth = 250;
        const legendHeight = 20;
        const legendX = (width - legendWidth) / 2;  
        const legendY = margin.top 

        const spacing = 200 ////

        const colorLegendX = width / 2 - spacing;
        const sizeLegendX = width / 2;
        const linkLegendX = width / 2 + spacing;


        // === Gradient Definition for Color Legend ===
        const defs = svg.append('defs');
        const gradient = defs.append('linearGradient')
                .attr('id', 'viridis-gradient')
                .attr('x1', '0%')
                .attr('y1', '0%')
                .attr('x2', '100%')
                .attr('y2', '0%');

            const stops = [
                { offset: "0%", color: colorScale(-0.5) },
                { offset: "16.6%", color: colorScale(-0.3) },
                { offset: "33.3%", color: colorScale(-0.1) },
                { offset: "50%", color: colorScale(0) },
                { offset: "66.6%", color: colorScale(0.3) },
                { offset: "83.3%", color: colorScale(0.5) },
                { offset: "100%", color: colorScale(0.75) }
            ];
            
            stops.forEach(stop => {
                gradient.append('stop')
                    .attr('offset', stop.offset)
                    .attr('stop-color', stop.color);
            });
            

            const legendGroup = svg.insert('g', ':first-child')
            .attr('class', 'legend-group')
            .attr('transform', `translate(${width / 2}, ${legendY})`);

            const colorLegend = legendGroup.append('g').attr('transform', `translate(-360, 0)`);
            const sizeLegend  = legendGroup.append('g').attr('transform', `translate(-90, 0)`);
            const linkLegend  = legendGroup.append('g').attr('transform', `translate(190, 0)`);
            

        

        

        // === Color Legend ===
        // const colorLegend = svg.append('g')
        //     .attr('class', 'legend color-legend')
        //     .attr('transform', `translate(${colorLegendX}, ${legendY})`);



        //////////////////////////////////////////////////////////
        // Wrap the contents in a subgroup
        const colorContent = colorLegend.append('g');





        colorLegend.append('text')
            .attr('x', 2)
            .attr('y', 10)
            .text('Tweet Sentiment Analysis')
            .style('font-weight', 'bold')
            .style('font-size', '20px');

        colorLegend.append('rect')
            .attr('x', 20)
            .attr('y', 40)
            .attr('width', 200)
            .attr('height', 20)
            .style('fill', 'url(#viridis-gradient)');

        colorLegend.append('text')
            .attr('x', 20)
            .attr('y', 75)
            .text('(Negative)')
            .style('font-size', '10px');

        colorLegend.append('text')
            .attr('x', 220)
            .attr('y', 75)
            .text('(Positive)')
            .style('text-anchor', 'end')
            .style('font-size', '10px');

       
        // const bbox = colorContent.node().getBBox();

        // const colorLegendWidth = bbox.width + 800;
        // const colorLegendHeight = bbox.height + 130;

        const bboxNode = colorContent.node();
        if (bboxNode) {
          const bbox = bboxNode.getBBox();
          const colorLegendWidth = bbox.width + 800;
          const colorLegendHeight = bbox.height + 130;
        
          colorLegend.insert('rect', 'g') // insert behind everything
            .attr('x', bbox.x - 20)
            .attr('y', bbox.y - 20)
            .attr('width', colorLegendWidth)
            .attr('height', colorLegendHeight)
            .attr('rx', 12)
            .attr('ry', 12)
            .attr('fill', '#D6CDC4')
            .attr('opacity', 0.21)
            .attr('stroke', '#ccc')
            .attr('stroke-width', 1);
        }
        


        // colorLegend.insert('rect', 'g') // insert behind everything
        //     .attr('x', bbox.x - 10)
        //     .attr('y', bbox.y - 20)
        //     .attr('width', colorLegendWidth)
        //     .attr('height', colorLegendHeight)
        //     .attr('rx', 12)  // rounded corners
        //     .attr('ry', 12)
        //     .attr('fill', '#D6CDC4')
        //     .attr('opacity', 0.21)
        //     .attr('stroke', '#ccc')
        //     .attr('stroke-width', 1);
        //////////////////////////////////////////////////////////




        // === Size Legend ===
        // const sizeLegend = svg.append('g')
        //     .attr('class', 'legend size-legend')
        //     .attr('transform', `translate(${sizeLegendX}, ${legendY})`);


        sizeLegend.append('text')
            .attr('cx', -10)
            .attr('y', 0)
            .style('font-weight', 'bold')
            .style('fill', 'black')
            .style('font-size', '12px')
            .selectAll('tspan')
            .data(['Word Frequency', '(Legend bubbles shown at 1:3 scale)'])
            .enter()
            .append('tspan')
            .attr('x', 20)
            .attr('dy', (d, i) => i * 15)
            .text(d => d);

        const sizeStops = [minCount, Math.round((minCount + maxCount) / 2), maxCount];
        const radiusScale = d3.scaleSqrt()
            .domain([minCount, maxCount])
            .range([20, 70]);

        sizeStops.forEach((count, i) => {
            const radius = radiusScale(count);
            const cx = 25 + i * 85;
            const cy = 55;
            const legendScaleFactor = 0.33;

            sizeLegend.append('circle')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', radius * legendScaleFactor)
                .style('fill', 'black')
                .style('stroke', 'black')
                .style('stroke-width', 1);

            sizeLegend.append('text')
                .attr('x', cx)
                .attr('y', cy + (0.4*radius) + 15)
                .text(Math.round(count))
                .style('text-anchor', 'middle')
                .style('font-size', '10px');
        });

            // sizeLegend.append('text')
            // .attr('x', cx)
            // .attr('y', cy + radius + 10) 
            // .text(Math.round(count))
            // .style('text-anchor', 'middle')  
            // .style('font-size', '10px');



        // === Link Legend ===
        // const linkLegend = svg.append('g')
        //     .attr('class', 'legend link-legend')
        //     .attr('transform', `translate(${linkLegendX}, ${legendY})`);

        linkLegend.append('text')
            .attr('x', 20)
            .attr('y', 0)
            .text('Co-occurrence Frequency')
            .style('font-weight', 'bold')
            .style('font-size', '12px');

        linkLegend.append('text')
            .attr('x', 20)
            .attr('y', 15)
            .text('(Link thickness shows frequency of word pairs)')
            .style('font-size', '10px')
            .style('font-style', 'italic');

        const linkWidthScale = d3.scaleSqrt()
            .domain([minWeight, maxWeight])
            .range([0.5, 4]);

        const linkStops = [threshold, Math.round((threshold + maxWeight) / 2), maxWeight];
        linkStops.forEach((weight, i) => {
            const thickness = linkWidthScale(weight);
            const color = linkColorScale(weight);
            const y = 40 + i * 20;

            linkLegend.append('line')
                .attr('x1', 55)
                .attr('y1', y)
                .attr('x2', 160)
                .attr('y2', y)
                .attr('stroke', color)
                .attr('stroke-width', thickness);

            linkLegend.append('text')
                .attr('x', 20)
                .attr('y', y + 4)
                .text(Math.max(Math.round(weight),1))
                .style('font-size', '10px');
        });


        
////////////////////////////FUNCTIONS/////////////////////////////////////

// keeps nodes from going into the legend

                //  const colorLegendWidth = bbox.width + 760;
                //  const colorLegendHeight = bbox.height + 130;
        // function isInsideLegend(x, y) {
        //     // Define fixed region covering all legend groups
        //     return y < 130 && x > (width / 2 - 400) && x < (width / 2 + 400);
        // }



        function ticked() {
            // Update node positions
            nodes.attr('transform', d => {
                const strokeBuffer = 26

                d.x = Math.max(margin.left + d.radius + strokeBuffer,
                               Math.min(width - margin.right - d.radius - strokeBuffer, d.x));
                
                d.y = Math.max(margin.top + d.radius + strokeBuffer,
                               Math.min(height - margin.bottom - d.radius - strokeBuffer, d.y));
                
     
            


                            //  if (isInsideLegend(d.x, d.y)) {
                            //     d.x = d.px || d.x;  // Revert to previous x
                            //     d.y = d.py || d.y;
                            // }
                            // d.px = d.x;
                            // d.py = d.y;
              
                             return `translate(${d.x},${d.y})`;
            });
            
            // Update link positions as straight lines
            link
              .attr("x1", d => d.source.x)
              .attr("y1", d => d.source.y)
              .attr("x2", d => d.target.x)
              .attr("y2", d => d.target.y);
        }
        
        // Create the tooltip
        const tooltip = d3
                .select("body")
                .append("div")
                .style("position", "absolute")
                .style("text-align", "center")
                .style("padding", "5px 8px")
                .style("font", "12px 'Roboto', sans-serif")
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
            
            // 1) Okay, I'll change it to assign more space for the tweet analysis
            // 2) I can add it by changing some design. I'll change it.
            // 3) I agree it. I comment color code in the last page of my slide. please refer to it if you need. In my design plan, I use  "no fill" and line color with thick line. I think it would look better, but if it is hard to make, conventional one is okay but I recommend to remove outline of circles.
            // 4) This is the hardest question. In my thought, there are two options:
            //   (1) same color with background's (#F1EEB) with the moderate transparency (0.4~0.6)
            //   (2) gradation from source color to target color with slightly lower saturation and moderate transparency (0.4~0.6)
            // 5) I think the background color (#F1EEB) or the ticker color (#D6CDC4).



            // Toggle fixed status
            if (d.fixed !== true) {
                d.fixed = true;
                d.fx = d.x;
                d.fy = d.y;
                // Change color to orange when fixed
                d3.select(this)
                    .select("circle")
                    // .style("fill", "#D6CDC4")
                    // .style("stroke", "#D6CDC4")
                    .style("fill", d => colorScale(d.color_value))
                    // // .style("fill-opacity", 0.15)  
                    // .style("stroke", d => colorScale(d.color_value))
                    // .style("stroke-opacity", 1);  
                  
            } else {
                d.fixed = false;
                d.fx = null;
                d.fy = null;
                //get og color
                d3.select(this)
                    .select("circle")
                    .style("fill", backGroundColor)
                    .style("stroke-width", 5) 
                    .style("stroke", () => colorScale(d.color_value))
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
