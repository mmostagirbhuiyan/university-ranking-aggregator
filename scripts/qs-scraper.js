// QS World University Rankings scraper (reading from local Excel file)
const XLSX = require('xlsx');
const path = require('path');

const QS_EXCEL_FILE = 'qs_rankings.xlsx';
const QS_FILE_PATH = path.join(__dirname, '..', 'data', QS_EXCEL_FILE);

/**
 * Reads QS World University Rankings from a local Excel file.
 * @param {number} limit - The maximum number of universities to read.
 * @returns {Promise<Object[]>} A promise that resolves with an array of university objects.
 */
async function scrapeQSRankings(limit) {
    const rankings = [];

    try {
        console.log(`Reading QS rankings from local file: ${QS_FILE_PATH}...`);

        // Read the Excel file
        const workbook = XLSX.readFile(QS_FILE_PATH);

        // Assuming the ranking data is in the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON. header: 1 means the first row in the *range* is headers.
        // range: 3 means start reading from the 4th row (index 3). The first element in jsonData will be headers.
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 3 });

        // Remove temporary logging
        // console.log('QS Raw Data (first 5 rows after skipping headers):', jsonData.slice(0, 5));

        // --- Start of data extraction logic --- //
        // Skip the first row of jsonData as it contains headers. Process data from the second row (index 1).
        // Based on previous run's log, rank is at index 1 and name is at index 3 in the data rows.

        // Iterate starting from the second element (index 1) of jsonData
        for (let i = 1; i < Math.min(limit + 1, jsonData.length); i++) { // limit + 1 because we skip the header row
            const row = jsonData[i];
            
            // *** IMPORTANT: Verify these column indices against the actual column positions in your Excel file after skipping headers ***
            const rank = row[1]; // Assuming rank is in the 2nd column (index 1)
            const name = row[3]; // Assuming institution name is in the 4th column (index 3)

            // Add to rankings if both name and a valid rank are found and name is a string
            // Handle potential non-numeric rank values like ranges (e.g., '101-150') by skipping for now.
            if (typeof name === 'string' && typeof rank === 'number' && !isNaN(rank)) {
                 // Ensure rank is an integer
                rankings.push({ name: name.trim(), rank: Math.floor(rank) });
            } else {
                // Log the row index in the original Excel file for easier debugging (+4 because range starts from 4th row)
                console.warn(`Skipping row ${i + 3} due to missing or invalid data: Row data:`, row);
            }
        }
        // --- End of data extraction logic --- //

        console.log(`Successfully read ${rankings.length} universities from ${QS_EXCEL_FILE}.`);

    } catch (error) {
        console.error(`Error reading QS rankings from Excel file: ${error.message}`);
        // Re-throw the error so the main script can catch it
        throw error;
    }

    return rankings;
}

// Export function for use in other scripts
module.exports = {
    scrapeQSRankings
};

// --- Local Test Execution ---
// This block will run when the script is executed directly.
if (require.main === module) {
    const testLimit = 20; // Read top 20 for local test
    console.log(`Running local test for QS scraper (limit: ${testLimit})...`);
    scrapeQSRankings(testLimit)
        .then(data => {
            console.log('-- QS Scraped Data (Read from Excel) --', data);
             console.log(`Total universities read in test: ${data.length}`);
        })
        .catch(error => {
            console.error('-- QS Scraper Test Failed --', error);
        });
} 