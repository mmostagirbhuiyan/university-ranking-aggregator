// scripts/the-scraper.js
// const axios = require('axios'); // Removed axios dependency
const fs = require('fs').promises; // Import the file system module
// const cheerio = require('cheerio'); // Removed cheerio dependency
const path = require('path');

// Updated URL to fetch JSON data directly
// const THE_RANKINGS_URL = 'https://www.timeshighereducation.com/sites/default/files/the_data_rankings/world_university_rankings_2025_0__ba2fbd3409733a83fb62c3ee4219487c.json'; // Removed URL

// Define the path for the local JSON file
const LOCAL_THE_DATA_PATH = 'frontend/public/data/the_rankings.json';
const THE_JSON_FILE = 'the_rankings.json';
const THE_FILE_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', THE_JSON_FILE);

/**
 * Reads the Times Higher Education World University Rankings from a local JSON file.
 * @param {number} limit - The maximum number of universities to read.
 * @returns {Promise<Object[]>} A promise that resolves with an array of university objects, or rejects on error.
 */
async function scrapeTHERankings(limit) {
    let universities = [];

    try {
        console.log(`Reading data from local JSON file ${THE_FILE_PATH}...`);
        // Read the JSON file
        const jsonData = await fs.readFile(THE_FILE_PATH, 'utf8');
        // Parse the JSON data
        const data = JSON.parse(jsonData);

        console.log(`Parsed JSON data array length: ${data.length}`);

        // Assuming the data is a direct array at the top level
        universities = data; // Assign the parsed data directly (should be an array)

        if (!universities || !Array.isArray(universities)) {
            throw new Error('Invalid JSON data format in local file: Expected a top-level array.');
        }

        // Manually count valid university entries after reading
        let validUniversityCount = 0;
        console.log('Valid universities read from THE:');
        for (const uni of universities) {
            // Perform a basic check for a required field like 'name' to consider it a valid entry
            if (uni && typeof uni.name === 'string') {
                validUniversityCount++;
                console.log(`  ${validUniversityCount}: ${uni.name}`);
            }
        }

        console.log(`Successfully read and validated ${validUniversityCount} universities from local JSON file.`);

    } catch (error) {
        console.error(`Error reading THE rankings local JSON file: ${error.message}`);
        // Re-throw the error so the main script can catch it
        throw error;
    }

    // Return the full data read from the file, ignoring the 'limit' parameter here
    return universities;
}

// Export function for use in other scripts
module.exports = {
    scrapeTHERankings
};
