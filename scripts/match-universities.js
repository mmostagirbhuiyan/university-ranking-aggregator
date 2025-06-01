// Script to perform fuzzy matching on university names and generate a mapping file

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createReadStream } = require('fs');
const stringSimilarity = require('string-similarity');
const readline = require('readline');
// We will now use the XLSX reading logic from the QS scraper, so this might not be needed here
// const XLSX = require('xlsx');

// Import the scraper functions (assuming they now read from the data files)
const { scrapeARWURankings } = require('./arwu-scraper');
const { scrapeTHERankings } = require('./the-scraper');
// const { scrapeUSNewsRankings } = require('./usnews-scraper'); // REMOVE this line
const { scrapeQSRankings } = require('./qs-scraper');

// We still need the basic cleaning function for consistent name formatting before fuzzy matching
function basicCleanName(name) {
    // Add a check to ensure name is a string before trimming
    if (typeof name !== 'string' || name.trim() === '') {
        return '';
    }
    let cleanedName = name.trim();
    cleanedName = cleanedName.toLowerCase();

    // Explicitly remove "the " at the beginning, case-insensitive
    cleanedName = cleanedName.replace(/^the\s+/, '');

    // Remove text within parentheses and the parentheses themselves (using a robust regex)
    cleanedName = cleanedName.replace(/\s*\([^)]*\)\s*/g, '');

    // Remove common location indicators - keep these after parentheses removal
    cleanedName = cleanedName.replace(/\s*-\s*australia/g, '');
    cleanedName = cleanedName.replace(/\s*-\s*uk/g, '');
    cleanedName = cleanedName.replace(/\s*-\s*newcastle-upon-tyne/g, '');

    // Remove common words that indicate institution type
    cleanedName = cleanedName.replace(/ university/g, '');
    cleanedName = cleanedName.replace(/ college/g, '');
    cleanedName = cleanedName.replace(/ institute/g, '');
    cleanedName = cleanedName.replace(/ of technology/g, '');
    cleanedName = cleanedName.replace(/ and/g, '');

    // Clean up any remaining extra spaces or specific punctuation after removing words/phrases
    cleanedName = cleanedName.replace(/\s+/g, ' '); // Replace multiple spaces with a single space
    cleanedName = cleanedName.replace(/[.,\-]/g, ''); // Remove periods, commas, and hyphens
    
    cleanedName = cleanedName.trim();
    return cleanedName;
}

// Function to read and process ARWU data using the scraper
async function readArwuRankings(limit) {
    console.log('Reading and cleaning ARWU data using scraper...');
    const rankings = await scrapeARWURankings(limit);
    const processedRankings = rankings
        .filter(uni => uni && typeof uni.name === 'string' && uni.name.trim() !== '') // Filter out invalid entries
        .map(uni => ({
            originalName: uni.name.trim(), // Trim original name as well
            cleanedName: basicCleanName(uni.name),
            source: 'arwu'
        }));
     console.log(`Successfully read ${processedRankings.length} universities from ARWU.`);
     return processedRankings;
}

// Function to read and process THE data using the scraper
async function readTheRankings(limit) {
    console.log('Reading and cleaning THE data using scraper...');
    const rankings = await scrapeTHERankings(limit);
     const processedRankings = rankings
        // Filter out invalid entries where the name property is missing or empty
        .filter(uni => uni && typeof uni.name === 'string' && uni.name.trim() !== '') 
        .map(uni => ({
            originalName: uni.name.trim(), // Use the correct 'name' property from the scraper output
            cleanedName: basicCleanName(uni.name),
            source: 'the'
        }));
    console.log(`Successfully read ${processedRankings.length} universities from THE.`);

    
    return processedRankings;
}

// Function to read and process US News data using direct reading
async function readUsnewsRankings(limit) {
     console.log('Reading and cleaning US News data using direct reading...');
     const dataDir = path.join(__dirname, '..', 'frontend', 'public', 'data');
     const usnewsFilePath = path.join(dataDir, 'usnews_rankings.csv');

     return new Promise((resolve, reject) => {
         const results = [];
         createReadStream(usnewsFilePath)
             .pipe(csv({
                 mapHeaders: ({ header }) => header.trim() // Trim header names for US News CSV
             }))
             .on('data', (data) => {
                 // Assuming the CSV has columns named 'University'
                 if (data.University && typeof data.University === 'string' && data.University.trim() !== '') { // Filter out invalid entries
                     results.push({
                         originalName: data.University.trim(), // Trim original name
                         cleanedName: basicCleanName(data.University),
                         source: 'usnews'
                     });
                 }
             })
             .on('end', () => {
                console.log(`Successfully read ${results.length} universities from US News.`);
                resolve(results);
            })
             .on('error', (err) => reject(err));
     });
}

// Function to read and process QS data using the scraper
async function readQsRankings(limit) {
     console.log('Reading and cleaning QS data using scraper...');
     // Call the existing QS scraper function
     // This assumes scrapeQSRankings in qs-scraper.js handles the XLSX reading.
     const rankings = await scrapeQSRankings(limit);
     const processedRankings = rankings
        .filter(uni => uni && typeof uni.name === 'string' && uni.name.trim() !== '') // Filter out invalid entries
        .map(uni => ({
            originalName: uni.name.trim(), // Trim original name
            cleanedName: basicCleanName(uni.name),
            source: 'qs'
        }));
     console.log(`Successfully read ${processedRankings.length} universities from QS.`);
     return processedRankings;
}

async function main() {
    // Define a limit for reading, similar to scrape-rankings.js
    const limit = 400; // Or read from command line arguments if needed

    let allUniversities = [];

    try {
        const arwuData = await readArwuRankings(limit);
        allUniversities = allUniversities.concat(arwuData);

        const theData = await readTheRankings(limit);
        allUniversities = allUniversities.concat(theData);

        const usnewsData = await readUsnewsRankings(limit); // Limit is not used in direct reading
        allUniversities = allUniversities.concat(usnewsData);

        const qsData = await readQsRankings(limit);
        allUniversities = allUniversities.concat(qsData);

        console.log(`Total universities loaded (before fuzzy matching): ${allUniversities.length}`);

        // --- Fuzzy Matching and Grouping ---
        const universityGroups = {};
        const similarityThreshold = 0.85; // Adjusted threshold (0 to 1)

        console.log('Starting fuzzy matching...');

        allUniversities.forEach(uni => {
            let matchedGroup = null;

            // Iterate through existing groups to find a match
            for (const groupKey in universityGroups) {
                const group = universityGroups[groupKey];
                // Compare the current university's cleaned name with the representative name of the group
                // The representative name is the cleaned name of the first university added to the group
                const representativeName = group.representativeName;
                const similarity = stringSimilarity.compareTwoStrings(uni.cleanedName, representativeName);

                if (similarity >= similarityThreshold) {
                    matchedGroup = group;
                    break;
                }
            }

            if (matchedGroup) {
                // Add the university to the matched group
                // Ensure the originalName is not undefined before pushing
                if (uni.originalName) {
                     matchedGroup.names.push({ original: uni.originalName, cleaned: uni.cleanedName, source: uni.source });
                }
            } else {
                // Create a new group with this university as the representative
                // Use the cleaned name as the initial representative name for matching purposes
                 if (uni.cleanedName && uni.originalName) { // Ensure both cleaned and original names exist for a new group
                     const newGroupKey = uni.cleanedName; // Using cleaned name as internal key for the group
                     universityGroups[newGroupKey] = {
                         representativeName: uni.cleanedName, // Internal name for comparisons
                         names: [{ original: uni.originalName, cleaned: uni.cleanedName, source: uni.source }]
                     };
                 }
            }
        });

        console.log(`Fuzzy matching complete. Found ${Object.keys(universityGroups).length} potential unique universities.`);

        // --- Generate Mapping File ---
        const suggestedMapping = [];

        for (const groupKey in universityGroups) {
            const group = universityGroups[groupKey];

            // Determine the suggested standardized name for the group.
            // Strategy: Pick the longest original name within the group.
            let suggestedStandardizedName = '';
            let longestNameLength = 0;

            // Ensure group.names is an array before iterating
            if (Array.isArray(group.names)) {
                group.names.forEach(nameInfo => {
                    // Add a check here to ensure nameInfo.original is a string before accessing length
                    if (nameInfo.original && typeof nameInfo.original === 'string' && nameInfo.original.length > longestNameLength) {
                        longestNameLength = nameInfo.original.length;
                        suggestedStandardizedName = nameInfo.original;
                    }
                });
            }

            // If no names were in the group (shouldn't happen with current logic after filtering, but as a safeguard)
            if (suggestedStandardizedName === '') {
                 // Fallback to the cleaned name if no original name found (should not be reached if filtering works)
                 suggestedStandardizedName = group.representativeName; // Use the cleaned name as a last resort
            }

            // Ensure group.names is an array before iterating for mapping
             if (Array.isArray(group.names)) {
                 group.names.forEach(nameInfo => {
                    // Add a check here to ensure nameInfo.original is defined before pushing
                    if (nameInfo.original) {
                        suggestedMapping.push({
                            originalName: nameInfo.original,
                            source: nameInfo.source,
                            suggestedStandardizedName: suggestedStandardizedName
                        });
                    }
                 });
             }
        }

        const outputMappingPath = path.join(__dirname, '..', 'frontend', 'public', 'data', 'suggested-university-mapping.json');
        await fs.writeFile(outputMappingPath, JSON.stringify(suggestedMapping, null, 2));
        console.log(`Suggested university mapping saved to ${outputMappingPath}`);

        console.log('Manual review of suggested-university-mapping.json is recommended to finalize standardized names.');

    } catch (error) {
        console.error('An error occurred during fuzzy matching and mapping generation:', error);
    }
}

main();