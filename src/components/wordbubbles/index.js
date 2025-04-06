import { wordBubbles } from "./wordbubbles.js";

// Update file paths to use your JSON files
// Use relative paths instead of absolute paths
const topWordsUrl = "tmp_data/top_words.json";
const bottomWordsUrl = "tmp_data/bottom_words.json";
const adjMatrixUrl = "tmp_data/adjacency_matrix.json";

const width = window.innerWidth;
const height = window.innerHeight;

async function main() {
    try {
        // Load JSON files
        const [topWords, bottomWords, adjMatrix] = await Promise.all([
            d3.json(topWordsUrl),
            d3.json(bottomWordsUrl),
            d3.json(adjMatrixUrl),
        ]);
        
        console.log("Adjacency matrix:", adjMatrix);
        
        // Combine top and bottom words into a single array
        const wordData = [...topWords, ...bottomWords];
        
        // Process adjacency matrix to create links
        const links = [];
        
        // Process the adjacency matrix which is in the format:
        // { "word1": { "word2": weight, "word3": weight, ... }, ... }
        Object.keys(adjMatrix).forEach(source => {
            Object.keys(adjMatrix[source]).forEach(target => {
                const weight = adjMatrix[source][target];
                if (weight > 0) {
                    links.push({ source, target, weight });
                }
            });
        });
        
        console.log("Generated links:", links.slice(0, 5));
        
        // make chart
        const bubbles = wordBubbles()
            .width(width)
            .height(height)
            .data(wordData)
            .links(links)
            .margin({ top: 50, right: 50, bottom: 50, left: 50 });
        
        d3.select("#visualization-container").call(bubbles);
        
    } catch (error) {
        console.error("Error loading or processing data:", error);
    }
}

main();




// import { wordBubbles } from "./wordbubbles.js";


// const wordDataUrl = "word_data.csv";
// const adjMatrixUrl = "adj_matrix.csv";





// const parseRow = (d) => {
//   return {
//     word: d.word,
//     counts: +d.counts,
//     total_score: +d.total_score,
//     average_score: +d.average_score
//   };
// };

// function parseAdjMatrixRow(d) {
//     // guess not really needed
//     return d }

// const width = window.innerWidth
// const height = window.innerHeight


// async function main() {
//     try {
//       // Load csv files
//       const [wordData, adjMatrix] = await Promise.all([
//         d3.csv(wordDataUrl, parseRow),
//         d3.csv(adjMatrixUrl, parseAdjMatrixRow),
//       ]);
//   console.log("Adjacency matrix:", adjMatrix);

//     const links = [];
//     const words = adjMatrix.columns.slice(1); // everything EXCEPT 'go'
//     adjMatrix.forEach(row => {
//       // Use row.go as the label
//       const source = row.go;
//       words.forEach(target => {
//         const weight = +row[target];
//         if (weight > 0) {
//           links.push({ source, target, weight });
//         }
//       });
//     });
    
  
//       // make chart
//       const bubbles = wordBubbles()
//         .width(width)
//         .height(height)
//         .data(wordData)
//         .links(links) 
//         .margin({ top: 50, right: 50, bottom: 50, left: 50 });
  
//       d3.select("#visualization-container").call(bubbles);
  
//     } catch (error) {
//       console.error("FUCKING ERRORS ALL OVER THE PLACE", error);
//     }
//   }
  
//   main();