// QS World University Rankings scraper (reading from local Excel file)
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const QS_EXCEL_FILE = 'qs_rankings.xlsx';
const QS_FILE_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', QS_EXCEL_FILE);

const qsFile = path.join(__dirname, '../frontend/public/data/qs_rankings.csv');

function parseQSCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Extract rank and name from the correct columns in the new CSV
        const rawRank = row['rank display'];
        const name = row['institution'];
        let rank = null;
        if (typeof rawRank === 'number') {
          rank = Math.floor(rawRank);
        } else if (typeof rawRank === 'string') {
          const match = rawRank.match(/^\d+/);
          if (match && match[0]) {
            rank = parseInt(match[0], 10);
          }
        }
        if (typeof name === 'string' && typeof rank === 'number' && !isNaN(rank)) {
          results.push({ name: name.trim(), rank });
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

/**
 * Reads QS World University Rankings from a local Excel file.
 * @param {number} limit - The maximum number of universities to read.
 * @returns {Promise<Object[]>} A promise that resolves with an array of university objects.
 */
async function scrapeQSRankings(limit) {
    // Use parseQSCSV (using the CSV file) instead of reading the Excel file.
    try {
        console.log(`Reading QS rankings from CSV file: ${qsFile}...`);
        const rankings = await parseQSCSV(qsFile);
        console.log(`Successfully read ${rankings.length} universities from CSV.`);
        return rankings;
    } catch (error) {
        console.error(`Error reading QS rankings from CSV file: ${error.message}`);
        throw error;
    }
}

async function main() {
  try {
    const qsData = await parseQSCSV(qsFile);
    console.log('Sample QS data:', qsData.slice(0, 5));
    // ...rest of your QS processing logic, using qsData...
  } catch (err) {
    console.error('Error reading QS CSV:', err);
  }
}

main();

// Export function for use in other scripts
module.exports = {
    scrapeQSRankings
};