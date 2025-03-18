import { wordBubbles } from "./wordbubbles.js";


const wordDataUrl = "word_data.csv";
const adjMatrixUrl = "adj_matrix.csv";


const parseRow = (d) => {
  return {
    word: d.word,
    counts: +d.counts,
    total_score: +d.total_score,
    average_score: +d.average_score
  };
};

function parseAdjMatrixRow(d) {
    // guess not really needed
    return d }

const width = window.innerWidth
const height = window.innerHeight


async function main() {
    try {
      // Load csv files
      const [wordData, adjMatrix] = await Promise.all([
        d3.csv(wordDataUrl, parseRow),
        d3.csv(adjMatrixUrl, parseAdjMatrixRow),
      ]);
  console.log("Adjacency matrix:", adjMatrix);

    const links = [];
    const words = adjMatrix.columns.slice(1); // everything EXCEPT 'go'
    adjMatrix.forEach(row => {
      // Use row.go as the label
      const source = row.go;
      words.forEach(target => {
        const weight = +row[target];
        if (weight > 0) {
          links.push({ source, target, weight });
        }
      });
    });
    
  
      // Create the chart instance
      const bubbles = wordBubbles()
        .width(width)
        .height(height)
        .data(wordData)
        .links(links) 
        .margin({ top: 50, right: 50, bottom: 50, left: 50 });
  
      d3.select("#visualization-container").call(bubbles);
  
    } catch (error) {
      console.error("FUCKING ERRORS ALL OVER THE PLACE", error);
    }
  }
  
  main();