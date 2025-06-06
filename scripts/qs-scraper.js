// QS World University Rankings scraper (reading from local Excel file)
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const QS_CSV_DOWNLOAD_URL =
  'https://www.universityrankings.ch/results/QS/2025?mode=csv';

const QS_CSV_FILE = 'qs_rankings.csv';
const QS_FILE_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', QS_CSV_FILE);

// Download the latest QS CSV to the data directory
async function downloadQSCSV() {
  try {
    console.log(`Downloading QS CSV from ${QS_CSV_DOWNLOAD_URL}...`);
    const { exec } = require('child_process');
    await new Promise((resolve, reject) => {
      exec(`curl -L -o '${QS_FILE_PATH}' '${QS_CSV_DOWNLOAD_URL}'`, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    console.log(`Saved QS CSV to ${QS_FILE_PATH}`);
  } catch (error) {
    console.error(`Failed to download QS CSV: ${error.message}`);
    throw error;
  }
}

function parseQSCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(
        csv({
          headers: ['# World Rank', ' Institution', ' Country'],
          skipLines: 5,
          mapValues: ({ value }) => value.trim(),
        })
      )
      .on('data', (row) => {
        const rank = parseInt(row['# World Rank'], 10);
        const name = row[' Institution'];
        if (name && !isNaN(rank)) {
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
    try {
        await downloadQSCSV();
        console.log(`Reading QS rankings from CSV file: ${QS_FILE_PATH}...`);
        const rankings = await parseQSCSV(QS_FILE_PATH);
        console.log(`Successfully read ${rankings.length} universities from CSV.`);
        return rankings;
    } catch (error) {
        console.error(`Error reading QS rankings from CSV file: ${error.message}`);
        throw error;
    }
}

async function main() {
  try {
    await downloadQSCSV();
    const qsData = await parseQSCSV(QS_FILE_PATH);
    console.log('Sample QS data:', qsData.slice(0, 5));
    // ...rest of your QS processing logic, using qsData...
  } catch (err) {
    console.error('Error reading QS CSV:', err);
  }
}

// If this file is executed directly, run a small demo that downloads
// the QS rankings and logs a sample of the parsed data. When the
// module is imported by other scripts, this block is skipped so the
// scraper can be used programmatically.
if (require.main === module) {
  main();
}

// Export function for use in other scripts
module.exports = {
    scrapeQSRankings
};
