// scripts/the-scraper.js
// const axios = require('axios'); // Removed axios dependency
const fs = require('fs').promises; // Import the file system module
// const cheerio = require('cheerio'); // Removed cheerio dependency

// Updated URL to fetch JSON data directly
// const THE_RANKINGS_URL = 'https://www.timeshighereducation.com/sites/default/files/the_data_rankings/world_university_rankings_2025_0__ba2fbd3409733a83fb62c3ee4219487c.json'; // Removed URL

// Define the path for the local JSON file
const LOCAL_THE_DATA_PATH = 'data/the_rankings.json';

/**
 * Reads the Times Higher Education World University Rankings from a local JSON file.
 * @param {number} limit - The maximum number of universities to read.
 * @returns {Promise<Object[]>} A promise that resolves with an array of university objects, or rejects on error.
 */
async function scrapeTHERankings(limit) {
    let universities = [];

    try {
        console.log(`Reading data from local JSON file ${LOCAL_THE_DATA_PATH}...`);
        // Read the JSON file
        const jsonData = await fs.readFile(LOCAL_THE_DATA_PATH, 'utf8');
        // Parse the JSON data
        const data = JSON.parse(jsonData);
        // Assuming the data is in the 'data' field of the JSON structure
        universities = data; // Assign to the outer scope variable, assuming data is a direct array

        if (!universities || !Array.isArray(universities)) {
            throw new Error('Invalid JSON data format in local file.');
        }

        console.log(`Successfully read ${universities.length} universities from local JSON file.`);

    } catch (error) {
        console.error(`Error reading THE rankings local JSON file: ${error.message}`);
        // Re-throw the error so the main script can catch it
        throw error;
    }

    // Return the potentially limited data based on the requested limit
    return universities.slice(0, limit);
}

// Export function for use in other scripts
module.exports = {
    scrapeTHERankings
};

// --- Local Test Execution ---
// This block will run when the script is executed directly.
// Removed local test execution block as it is no longer needed with local file reading. 