// Script to orchestrate scraping and aggregation 

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser'); // Import csv-parser
const { createReadStream } = require('fs'); // Import createReadStream
const stringSimilarity = require('string-similarity');
// const XLSX = require('xlsx'); // Removed as generic XLSX reading is removed

// Import individual scraper functions
const { scrapeQSRankings } = require('./qs-scraper'); // Assuming this now reads from file
const { scrapeTHERankings } = require('./the-scraper'); // Assuming this now reads from file
const { scrapeARWURankings } = require('./arwu-scraper'); // Assuming this now reads from file

// Import aggregation logic
const { aggregateRankings } = require('./aggregation');

// Define source weights and max ranks as per the markdown
const sourceWeights = {
    qs: 0.25,
    the: 0.25,
    arwu: 0.25,
    usnews: 0.25,
};

// Define estimated maximum ranks for each source based on the number of universities typically included in their latest rankings
const sourceMaxRanks = {
    qs: 1503,     // Based on QS World University Rankings 2025
    the: 2092,    // Based on Times Higher Education World University Rankings 2025
    arwu: 1000,   // Based on ARWU, which publishes the top 1000
    usnews: 2250  // Based on US News Best Global Universities Ranking 2024-2025
};

const totalSources = Object.keys(sourceWeights).length;

// Remove the old manual universityNameMap
// const universityNameMap = { ... };

// --- University Name Standardization ---

// Map to store the loaded university name mapping: Key is 'originalName@source', Value is 'suggestedStandardizedName'
let universityStandardizationMap = new Map();
let usnewsNameMap = new Map();
let usnewsCleanList = [];

// Map of known aliases that should collapse to a single canonical name
const aliasMap = new Map([
    ['purdue university west lafayette campus', 'Purdue University'],
    ['california institute of technology caltech', 'California Institute of Technology'],
    ['technik universitat munchen', 'Technical University of Munich']
]);

function canonicalizeName(name) {
    if (!name) return '';
    let cleaned = name.trim().toLowerCase();
    cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    cleaned = cleaned.replace(/^the\s+/, '');
    cleaned = cleaned.replace(/\s*\([^)]*\)\s*/g, ' ');
    cleaned = cleaned.replace(/-/g, ' ');
    cleaned = cleaned.replace(/[.,]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.trim();
    const alias = aliasMap.get(cleaned);
    return alias ? alias.toLowerCase() : cleaned;
}

async function loadUSNewsNames() {
    const filePath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'usnews_rankings.csv');
    return new Promise((resolve, reject) => {
        const map = new Map();
        const cleaned = [];
        createReadStream(filePath)
            .pipe(csv())
            .on('data', row => {
                if (row.University) {
                    const orig = row.University.trim();
                    const clean = canonicalizeName(orig);
                    if (!map.has(clean)) {
                        map.set(clean, orig);
                        cleaned.push(clean);
                    }
                }
            })
            .on('end', () => {
                usnewsNameMap = map;
                usnewsCleanList = cleaned;
                console.log(`Loaded ${map.size} canonical US News names.`);
                resolve();
            })
            .on('error', reject);
    });
}

// Function to load the university name mapping from the JSON file
async function loadUniversityMapping() {
    const mappingFilePath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'suggested-university-mapping.json');
    try {
        const data = await fs.readFile(mappingFilePath, 'utf8');
        const mappingArray = JSON.parse(data);
        universityStandardizationMap = new Map(mappingArray.map(item => [`${item.originalName}@${item.source}`, item.suggestedStandardizedName]));
        console.log(`Loaded ${universityStandardizationMap.size} mapping entries.`);
    } catch (error) {
        console.error('Error loading university mapping file:', error);
        // If the mapping file is crucial, you might want to exit or throw an error here
        // For now, we'll proceed with an empty map, meaning no standardization will occur.
    }
}

// Modify the existing standardizeUniversityName function to use the loaded map
function standardizeUniversityName(originalName, source) {
    const cleaned = canonicalizeName(originalName);
    if (source === 'usnews') {
        return usnewsNameMap.get(cleaned) || originalName.trim();
    }
    if (aliasMap.has(cleaned)) {
        return aliasMap.get(cleaned);
    }
    if (usnewsCleanList.length > 0) {
        const match = stringSimilarity.findBestMatch(cleaned, usnewsCleanList).bestMatch;
        if (match.rating >= 0.93) {
            return usnewsNameMap.get(match.target);
        }
    }

    let key = `${originalName}@${source}`;
    if (universityStandardizationMap.has(key)) {
        const mapped = universityStandardizationMap.get(key);
        if (mapped && mapped !== originalName) {
            return mapped;
        }
    }
    key = `${cleaned}@${source}`;
    if (universityStandardizationMap.has(key)) {
        const mapped = universityStandardizationMap.get(key);
        if (mapped && mapped !== cleaned) {
            return mapped;
        }
    }
    return originalName.trim();
}

// Basic country standardization to align naming conventions across sources
function standardizeCountry(country) {
    if (!country) return '';
    const map = {
        'USA': 'United States',
        'United States': 'United States',
        'UK': 'United Kingdom',
        'United Kingdom': 'United Kingdom',
        'S. Korea': 'South Korea',
    };
    return map[country.trim()] || country.trim();
}

// Removed generic file reading functions (readJsonRankings, readCsvRankings, readXlsxRankings)

/**
 * Main function to process data from each source file and aggregate rankings.
 * @param {number} limit - The number of top universities to process from each source.
 */
async function main(limit = 400) {
    // Load the university mapping first
    await loadUniversityMapping();
    await loadUSNewsNames();

    try {
        // --- 1. Read data from each source file using their respective logic ---
        console.log('Processing QS rankings...');
        // Assuming scrapeQSRankings now reads from data/qs_rankings.xlsx
        const qsRankingsRaw = await scrapeQSRankings(limit); // Call the QS scraper function
         // Apply standardization and filtering after getting data from scraper
         const qsRankings = qsRankingsRaw.map(uni => {
             if (uni.name && typeof uni.rank === 'number' && !isNaN(uni.rank)) { // Ensure rank is a valid number
                  const standardizedName = standardizeUniversityName(uni.name, 'qs');
                  return { name: standardizedName, rank: Math.floor(uni.rank), country: standardizeCountry(uni.country) }; // Ensure rank is integer
             } else {
                 console.warn('Skipping QS entry due to missing or invalid data:', uni);
                 return null; // Skip invalid entries
             }
         }).filter(uni => uni !== null).sort((a, b) => a.rank - b.rank);
        console.log(`Processed ${qsRankings.length} universities from QS.`);

        console.log('Processing THE rankings...');
        // Assuming scrapeTHERankings now reads from data/the_rankings.json
        const theRankingsRaw = await scrapeTHERankings(limit); // Call the THE scraper function
         // Apply standardization and filtering after getting data from scraper
         const theRankings = theRankingsRaw.map(uni => {
             // The scraper is expected to return objects with 'name' (string) and 'rank' (number or NaN).
             // We just need to apply standardization and filter out entries where the name is missing or the rank is invalid/NaN.

             // Remove redundant rank parsing and temporary logs
             // Attempt to parse rank as integer. THE ranks can be strings like '175' or '=176'.
             // Extract numeric part from rank string if present, then parse.
             // const rankMatch = typeof uni.rank === 'string' ? uni.rank.match(/\d+/): null;
             // const rank = rankMatch? parseInt(rankMatch[0], 10) : NaN;

             // Temporary logging to debug THE data processing
             // console.log(`THE Raw Name: ${uni.name}, Standardized Name: ${standardizedName}, Parsed Rank: ${rank}`);

             const standardizedName = standardizeUniversityName(uni.name, 'the');

             // Ensure name exists and rank is a valid number from the scraper's output
             if (uni.name && typeof uni.name === 'string' && typeof uni.rank === 'number' && !isNaN(uni.rank)) { // Ensure name is a valid string and rank is a valid number
                  return { name: standardizedName, rank: uni.rank, country: standardizeCountry(uni.country) }; // Use the rank directly from the scraper's output
             } else {
                 console.warn('Skipping THE entry due to missing data or invalid rank format:', uni);
                 return null; // Skip invalid entries
             }
         }).filter(uni => uni !== null).sort((a, b) => a.rank - b.rank);
         console.log(`Processed ${theRankings.length} universities from THE.`);

        console.log('Processing ARWU rankings...');
        // Assuming scrapeARWURankings now reads from data/arwu_rankings.csv
        const arwuRankingsRaw = await scrapeARWURankings(limit); // Call the ARWU scraper function
         // Apply standardization and filtering after getting data from scraper
         const arwuRankings = arwuRankingsRaw.map(uni => {
             // ARWU ranks are already parsed by the scraper, just ensure name exists and rank is a valid number.

             // Remove temporary logs
             // console.log('ARWU processing - inspecting uni object:', uni);
             // console.log('ARWU processing - uni.name:', uni.name);
             // console.log('ARWU processing - parsed rank:', rank);
             // console.log('ARWU processing - isNaN(rank):', isNaN(rank));
             // console.log('ARWU processing - condition (uni.name && !isNaN(rank)):', uni.name && !isNaN(rank));

             // The scraper is expected to return objects with 'name' (string) and 'rank' (number or NaN).
             // We just need to filter out entries where the name is missing or the rank is invalid/NaN.

             if (uni.name && typeof uni.name === 'string' && typeof uni.rank === 'number' && !isNaN(uni.rank)) { // Ensure name is a valid string and rank is a valid number
                  const standardizedName = standardizeUniversityName(uni.name, 'arwu');
                  // Ensure rank is an integer, although the scraper's parseInt should handle this
                  return { name: standardizedName, rank: Math.floor(uni.rank), country: standardizeCountry(uni.country) };
             } else {
                 // Keep the warning for skipped entries
                 console.warn('Skipping ARWU entry due to missing data or invalid rank format:', uni);
                 return null; // Skip invalid entries
             }
         }).filter(uni => uni !== null).sort((a, b) => a.rank - b.rank);
         console.log(`Processed ${arwuRankings.length} universities from ARWU.`);

        console.log('Reading US News rankings from file...');
        // Keep existing logic for US News CSV as it was manually provided
        const usnewsRankings = await new Promise((resolve, reject) => {
            const results = [];
            createReadStream(path.join(__dirname, '..', 'frontend', 'public', 'data', 'usnews_rankings.csv'))
                .pipe(csv())
                 .on('headers', (headers) => {
                     console.log('US News CSV Headers detected:', headers);
                 })
                .on('data', (data) => {
                    // Assuming the CSV has columns named 'University' and 'Rank'
                    // Adjust column names if your CSV uses different headers
                    if (data.University && data.Rank) {
                         // Apply standardization here
                        const standardizedName = standardizeUniversityName(data.University, 'usnews');
                        results.push({ name: standardizedName, rank: parseInt(data.Rank, 10), country: standardizeCountry(data.Country) });
                    }
                })
                .on('end', () => {
                    console.log(`Read ${results.length} universities from data/usnews_rankings.csv.`);
                    // Filter to the top 'limit' universities if necessary, matching the behavior of scrapers
                    // Assuming the CSV is already sorted by rank, or we can sort here
                    results.sort((a, b) => a.rank - b.rank);
                    resolve(results);
                })
                .on('error', (err) => {
                    console.error('Error reading US News CSV file:', err);
                    reject(err); // Reject to stop the process if the file isn't readable.
                });
        });
         console.log(`Processed ${usnewsRankings.length} universities from US News CSV.`);

        // --- 2. Consolidate data ---
        // Create a map to hold university data, keyed by standardized university name for easy merging.
        const universitiesData = {};

        // Helper function to process rankings from a source
        const processRankings = (rankings, sourceKey) => {
            rankings.forEach(uni => {
                const name = uni.name; // Name is already standardized at this point
                if (!universitiesData[name]) {
                    universitiesData[name] = { name, country: uni.country, rankings: {} };
                }
                if (!universitiesData[name].country && uni.country) {
                    universitiesData[name].country = uni.country;
                }
                universitiesData[name].rankings[sourceKey] = { rank: uni.rank };
            });
        };

        // Process data from each source
        processRankings(qsRankings, 'qs');
        processRankings(theRankings, 'the');
        processRankings(arwuRankings, 'arwu');
        processRankings(usnewsRankings, 'usnews');

        // Convert the map back to an array of universities
        const universitiesArray = Object.values(universitiesData);
        console.log(`Consolidated data for ${universitiesArray.length} unique universities after standardization.`);

        // --- 3. Aggregate rankings ---
        console.log('Aggregating rankings...');
        const aggregatedResults = aggregateRankings(universitiesArray, sourceWeights, sourceMaxRanks, totalSources);
        console.log('Ranking aggregation complete.');

        // --- 4. Save results to JSON file ---
        const outputFilePath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'aggregated-rankings.json');
        await fs.writeFile(outputFilePath, JSON.stringify(aggregatedResults, null, 2));
        console.log(`Aggregated rankings saved to ${outputFilePath}`);

    } catch (error) {
        console.error(`An error occurred during the data processing and aggregation process: ${error.message}`);
        // Exit with a non-zero code to indicate failure in GitHub Actions
        process.exit(1);
    }

    console.log('Data processing and aggregation process finished.');
}

// Allow running from command line with an optional limit argument
const limitArg = process.argv[2];
const limit = limitArg ? parseInt(limitArg, 10) : 200; // Default to 200 if no argument

if (isNaN(limit) || limit <= 0) {
    console.error('Invalid limit provided. Please provide a positive integer.');
    process.exit(1);
}

main(limit); 