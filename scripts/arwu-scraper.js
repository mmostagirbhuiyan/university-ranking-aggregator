// Academic Ranking of World Universities (ARWU) scraper 
const axios = require('axios');
const fs = require('fs'); // Import the file system module
const cheerio = require('cheerio');
const csv = require('csv-parser'); // Import the csv-parser library

// Updated URL to universityrankings.ch - This is no longer used for fetching, but kept for reference
// Updated URL to universityrankings.ch
const ARWU_RANKINGS_URL = 'https://www.universityrankings.ch/results/Shanghai/2024';

// Define the path for the local CSV file
const LOCAL_ARWU_DATA_PATH = 'data/arwu_rankings.csv';

// Define the path for the local HTML file
const LOCAL_ARWU_DATA_PATH_HTML = 'Shanghai Ranking 2024 - Results _ UniversityRankings.ch.html';

/**
 * Scrapes the Academic Ranking of World Universities (ARWU/Shanghai Rankings) from universityrankings.ch.
 * This version reads from a local CSV file.
 * @param {number} limit - The maximum number of universities to scrape.
 * @returns {Promise<Object[]>} A promise that resolves with an array of university objects, or rejects on error.
 */
async function scrapeARWURankings(limit) {
    const rankings = [];

    try {
        console.log(`Reading ARWU rankings from local CSV file ${LOCAL_ARWU_DATA_PATH}...`);

        // --- Start of parsing logic with csv-parser ---
        await new Promise((resolve, reject) => {
            fs.createReadStream(LOCAL_ARWU_DATA_PATH)
                .pipe(csv({
                    // Explicitly define headers as found in the CSV file (line 5)
                    headers: ['# World Rank', ' Institution', ' Country'], 
                    skipLines: 5, // Skip the initial comment and header lines
                    mapValues: ({ header, index, value }) => value.trim() // Trim whitespace from values
                }))
                .on('data', (row) => {
                    if (rankings.length >= limit) {
                        return; // Stop processing if limit is reached
                    }
                    // Use the exact header names to access data
                    const rank = parseInt(row['# World Rank'], 10);
                    const name = row[' Institution'] ? row[' Institution'].trim() : '';

                    if (name && !isNaN(rank)) {
                        rankings.push({ name, rank });
                    }
                })
                .on('end', () => {
                    console.log(`Successfully parsed ${rankings.length} universities from ${LOCAL_ARWU_DATA_PATH}.`);
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

// --- Local Test Execution ---
// This block will run when the script is executed directly.
if (require.main === module) {
    const testLimit = 250; // Scrape more universities for local test
    console.log(`Running local test for ARWU scraper (limit: ${testLimit})...`);
    scrapeARWURankings(testLimit)
        .then(data => {
            console.log('-- ARWU Scraped Data (Filtered) --', data);
             console.log(`Total universities scraped in test: ${data.length}`);
        })
        .catch(error => {
             console.error('-- ARWU Scraper Test Failed --', error);
        });
} 