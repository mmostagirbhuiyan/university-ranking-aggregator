// Academic Ranking of World Universities (ARWU) scraper 
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

// URL to download the latest ARWU CSV directly from universityrankings.ch
// Note: if this URL changes in the future, update the constant accordingly.
const ARWU_CSV_DOWNLOAD_URL =
  'https://www.universityrankings.ch/results/Shanghai/2024?mode=csv';

// Updated URL to universityrankings.ch - This is no longer used for fetching, but kept for reference
// Updated URL to universityrankings.ch
const ARWU_RANKINGS_URL = 'https://www.universityrankings.ch/results/Shanghai/2024';

// Define the path for the local CSV file
const ARWU_CSV_FILE = 'arwu_rankings.csv';
const ARWU_FILE_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', ARWU_CSV_FILE);

// Define the path for the local HTML file
const LOCAL_ARWU_DATA_PATH_HTML = 'Shanghai Ranking 2024 - Results _ UniversityRankings.ch.html';

// Download the latest ARWU CSV and save it to the data directory
async function downloadARWUCSV() {
    try {
        if (fs.existsSync(ARWU_FILE_PATH) && fs.statSync(ARWU_FILE_PATH).size > 0) {
            console.log(`Using existing ARWU CSV at ${ARWU_FILE_PATH}`);
            return;
        }
        console.log(`Downloading ARWU CSV from ${ARWU_CSV_DOWNLOAD_URL}...`);
        const { exec } = require('child_process');
        await new Promise((resolve, reject) => {
            exec(`curl -L -o '${ARWU_FILE_PATH}' '${ARWU_CSV_DOWNLOAD_URL}'`, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
        console.log(`Saved ARWU CSV to ${ARWU_FILE_PATH}`);
    } catch (error) {
        console.error(`Failed to download ARWU CSV: ${error.message}`);
        throw error;
    }
}

/**
 * Scrapes the Academic Ranking of World Universities (ARWU/Shanghai Rankings) from universityrankings.ch.
 * This version reads from a local CSV file.
 * @param {number} limit - The maximum number of universities to scrape.
 * @returns {Promise<Object[]>} A promise that resolves with an array of university objects, or rejects on error.
 */
async function scrapeARWURankings(limit) {
    const rankings = [];

    try {
        // Always attempt to download the latest data before parsing
        await downloadARWUCSV();
        console.log(`Reading ARWU rankings from local CSV file ${ARWU_FILE_PATH}...`);

        // --- Start of parsing logic with csv-parser ---
        await new Promise((resolve, reject) => {
            fs.createReadStream(ARWU_FILE_PATH)
                .pipe(csv({
                    // Explicitly define headers as found in the CSV file (line 5)
                    headers: ['# World Rank', ' Institution', ' Country'], 
                    skipLines: 5, // Skip the initial comment and header lines
                    mapValues: ({ header, index, value }) => value.trim() // Trim whitespace from values
                }))
                .on('data', (row) => {
                    // Removed limit check to process all data from the CSV
                    // if (rankings.length >= limit) {
                    //     return; // Stop processing if limit is reached
                    // }
                    // Use the exact header names to access data
                    const rank = parseInt(row['# World Rank'], 10);
                    const name = row[' Institution'] ? row[' Institution'].trim() : '';
                    const country = row[' Country'] ? row[' Country'].trim() : '';

                    if (name && !isNaN(rank)) {
                        rankings.push({ name, rank, country });
                    }
                })
                .on('end', () => {
                    console.log(`Successfully parsed ${rankings.length} universities from ${ARWU_FILE_PATH}.`);
                    resolve();
                })
                .on('error', (error) => {
                    console.error(`Error reading or parsing CSV: ${error.message}`);
                    reject(error); // Reject the promise on error
                });
        });
        // --- End of parsing logic with csv-parser ---

    } catch (error) {
        console.error(`Error processing ARWU CSV: ${error.message}`);
        // Re-throw the error so the main script can catch it
        throw error;
    }

    return rankings;
}

module.exports = {
    scrapeARWURankings
};
