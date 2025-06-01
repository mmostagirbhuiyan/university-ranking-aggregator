// QS World University Rankings scraper (reading from local Excel file)
const XLSX = require('xlsx');
const path = require('path');

const QS_EXCEL_FILE = 'qs_rankings.xlsx';
const QS_FILE_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', QS_EXCEL_FILE);

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
        // Iterate through all data in jsonData, ignoring the 'limit' parameter here
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            
            // *** IMPORTANT: Verify these column indices against the actual column positions in your Excel file after skipping headers ***
            const rawRank = row[1];
            const name = row[3]; // Assuming institution name is in the 4th column (index 3)

            let rank = null;

            // Try to parse rank as integer
            if (typeof rawRank === 'number') {
                rank = Math.floor(rawRank);
            } else if (typeof rawRank === 'string') {
                // Handle rank ranges like '101-150' or '501+'
                const match = rawRank.match(/^(\d+)/); // Extract leading digits
                if (match && match[1]) {
                    rank = parseInt(match[1], 10);
                }
            }

            // Add to rankings if name is a string and a valid rank (number) was extracted
            if (typeof name === 'string' && typeof rank === 'number' && !isNaN(rank)) {
                 rankings.push({ name: name.trim(), rank: rank }); // Use the parsed integer rank
            } else {
                // Log the row index and the full row data for debugging skipped entries
                console.warn(`Skipping row ${i + 3} due to missing or invalid data: Raw Rank: ${rawRank}, Raw Name: ${name}. Full row:`, row);
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