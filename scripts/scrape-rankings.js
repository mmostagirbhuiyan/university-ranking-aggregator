// Script to orchestrate scraping and aggregation 

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser'); // Import csv-parser
const { createReadStream } = require('fs'); // Import createReadStream
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

// Placeholder for university name standardization mapping
const universityNameMap = {
    // Existing mappings
    "Massachusetts Institute of Technology (MIT) ": "Massachusetts Institute of Technology",
    "MIT": "Massachusetts Institute of Technology",
    "Univ. of Oxford": "University of Oxford",
    "Peking University": "Peking University (Beijing)",
    "Tsinghua University": "Tsinghua University (Beijing)",
    "The University of Tokyo": "University of Tokyo",
    "ETH Zurich": "Swiss Federal Institute of Technology Zurich (ETH Zurich)",
    "EPFL": "Swiss Federal Institute of Technology Lausanne (EPFL)",
    "National University of Singapore (NUS)": "National University of Singapore",
    "Nanyang Technological University (NTU)": "Nanyang Technological University",
    "The Hong Kong University of Science and Technology": "Hong Kong University of Science and Technology",
    "The Chinese University of Hong Kong (CUHK)": "Chinese University of Hong Kong",
    "University of Melbourne": "University of Melbourne",
    "University of Sydney": "University of Sydney",
    "Australian National University (ANU)": "Australian National University",
    "Delft University of Technology": "Delft University of Technology",
    "Leiden University": "Leiden University",
    "University of Amsterdam": "University of Amsterdam",
    "Utrecht University": "Utrecht University",
    "University of Copenhagen": "University of Copenhagen",
    "Aarhus University": "Aarhus University",
    "University of Helsinki": "University of Helsinki",
    "University of Oslo": "University of Oslo",
    "Lund University": "Lund University",
    "Stockholm University": "Stockholm University",
    "Karolinska Institute": "Karolinska Institute",
    "Heidelberg University": "Heidelberg University",
    "Ludwig Maximilian University of Munich": "Ludwig Maximilian University of Munich",
    "Technical University of Munich": "Technical University of Munich",
    "Free University of Berlin": "Free University of Berlin",
    "Humboldt University of Berlin": "Humboldt University of Berlin",
    "RWTH Aachen University": "RWTH Aachen University",
    "Technical University of Berlin": "Technical University of Berlin",
    "University of Bonn": "University of Bonn",
    "University of Cologne": "University of Cologne",
    "University of Frankfurt": "University of Frankfurt",
    "University of Hamburg": "University of Hamburg",
    "University of Mannheim": "University of Mannheim",
    "University of Tübingen": "University of Tübingen",
    "University of Würzburg": "University of Würzburg",
    "Sorbonne University": "Sorbonne University",
    "Paris Sciences et Lettres University (PSL Research University Paris)": "PSL Research University Paris",
    "Aix-Marseille University": "Aix-Marseille University",
    "University of Strasbourg": "University of Strasbourg",
    "University of Toulouse": "University of Toulouse",
    "UCL": "University College London",
    "LSE": "London School of Economics and Political Science",
    "London School of Economics": "London School of Economics and Political Science",
    "King's College London": "King's College London",
    "University of Edinburgh": "University of Edinburgh",
    "University of Manchester": "University of Manchester",
    "University of Bristol": "University of Bristol",
    "University of Glasgow": "University of Glasgow",
    "University of Birmingham": "University of Birmingham",
    "University of Warwick": "University of Warwick",
    "University of Southampton": "University of Southampton",
    "University of Leeds": "University of Leeds",
    "University of Sheffield": "University of Sheffield",
    "University of Nottingham": "University of Nottingham",
    "Durham University": "Durham University",
    "University of St Andrews": "University of St Andrews",
    "University of Exeter": "University of Exeter",
    "Queen Mary University of London": "Queen Mary University of London",
    "Cardiff University": "Cardiff University",
    "Newcastle University": "Newcastle University",
    "University of East Anglia": "University of East Anglia",
    "University of York": "University of York",
    "University of Leicester": "University of Leicester",
    "University of Sussex": "University of Sussex",
    "Loughborough University": "Loughborough University",
    "University of Kent": "University of Kent",
    "University of Reading": "University of Reading",
    "University of Surrey": "University of Surrey",
    "University of Liverpool": "University of Liverpool",
    "Queen's University Belfast": "Queen's University Belfast",
    "University of Aberdeen": "University of Aberdeen",
    "University of Dundee": "University of Dundee",
    "University of Essex": "University of Essex",
    "University of Hull": "University of Hull",
    "University of Keele": "University of Keele",
    "Lancaster University": "Lancaster University",
    "Heriot-Watt University": "Heriot-Watt University",
    "Brunel University London": "Brunel University London",
    "City, University of London": "City, University of London",
    "Royal Holloway, University of London": "Royal Holloway, University of London",
    "University of Greenwich": "University of Greenwich",
    "University of Westminster": "University of Westminster",
    "Coventry University": "Coventry University",
    "Oxford Brookes University": "Oxford Brookes University",
    "University of Portsmouth": "University of Portsmouth",
    "University of South Wales": "University of South Wales",
    "University of the West of England": "University of the West of England",
    "University of Ulster": "University of Ulster",
    "Edinburgh Napier University": "Edinburgh Napier University",
    "Glasgow Caledonian University": "Glasgow Caledonian University",
    "Robert Gordon University": "Robert Gordon University",
    "University of the Highlands and Islands": "University of the Highlands and Islands",
    "Liverpool John Moores University": "Liverpool John Moores University",
    "Manchester Metropolitan University": "Manchester Metropolitan University",
    "Sheffield Hallam University": "Sheffield Hallam University",
    "Birmingham City University": "Birmingham City University",
    "Coventry University London": "Coventry University London",
    "Leeds Beckett University": "Leeds Beckett University",
    "London South Bank University": "London South Bank University",
    "Middlesex University": "Middlesex University",
    "University of Brighton": "University of Brighton",
    "University of Central Lancashire": "University of Central Lancashire",
    "University of Derby": "University of Derby",
    "University of East London": "University of East London",
    "University of Gloucestershire": "University of Gloucestershire",
    "University of Hertfordshire": "University of Hertfordshire",
    "University of Huddersfield": "University of Huddersfield",
    "University of Lincoln": "University of Lincoln",
    "University of Northampton": "University of Northampton",
    "University of Plymouth": "University of Plymouth",
    "University of Salford": "University of Salford",
    "University of Sunderland": "University of Sunderland",
    "University of Wolverhampton": "University of Wolverhampton",
    "Wrexham Glyndwr University": "Wrexham Glyndwr University",
    "Arts University Bournemouth": "Arts University Bournemouth",
    "Bath Spa University": "Bath Spa University",
    "Buckinghamshire New University": "Buckinghamshire New University",
    "Canterbury Christ Church University": "Canterbury Christ Church University",
    "University of Chester": "University of Chester",
    "University of Cumbria": "University of Cumbria",
    "De Montfort University": "De Montfort University",
    "University of Chichester": "University of Chichester",
    "University of Bolton": "University of Bolton",
    "University of Bedfordshire": "University of Bedfordshire",
    "Bishop Grosseteste University": "Bishop Grosseteste University",
    "Aberystwyth University": "Aberystwyth University",
    "Bangor University": "Bangor University",
    "Swansea University": "Swansea University",
    "University of South-Eastern Norway": "University of South-Eastern Norway",
    "OsloMet - Oslo Metropolitan University": "OsloMet - Oslo Metropolitan University",
    "Norwegian University of Life Sciences": "Norwegian University of Life Sciences",
    "University of Stavanger": "University of Stavanger",
    "UiT The Arctic University of Norway": "UiT The Arctic University of Norway",
    "University of Agder": "University of Agder",
    "Nord University": "Nord University",
    "Norwegian School of Economics": "Norwegian School of Economics",
    "NHH Norwegian School of Economics": "Norwegian School of Economics",
    "BI Norwegian Business School": "BI Norwegian Business School",
    "Norwegian University of Sport and Physical Education": "Norwegian University of Sport and Physical Education",
    "The Arctic University of Norway": "UiT The Arctic University of Norway",
    "Oslo and Akershus University College of Applied Sciences": "OsloMet - Oslo Metropolitan University",
    "Vestfold and Telemark University College": "University of South-Eastern Norway",
    "Norwegian University of Science and Technology (NTNU)": "Norwegian University of Science and Technology",
    "NTNU": "Norwegian University of Science and Technology",
    "University of Gothenburg": "University of Gothenburg",
    "Stockholm School of Economics": "Stockholm School of Economics",
    "KTH Royal Institute of Technology": "KTH Royal Institute of Technology",
    "Chalmers University of Technology": "Chalmers University of Technology",
    "Linköping University": "Linköping University",
    "Umeå University": "Umeå University",
    "Örebro University": "Örebro University",
    "Karlstad University": "Karlstad University",
    "Linnaeus University": "Linnaeus University",
    "Mid Sweden University": "Mid Sweden University",
    "University of Gävle": "University of Gävle",
    "Kristianstad University": "Kristianstad University",
    "Mälardalen University": "Mälardalen University",
    "University West": "University West",
    "Dalarna University": "Dalarna University",
    "World Maritime University": "World Maritime University",
    "The Swedish University of Agricultural Sciences": "Swedish University of Agricultural Sciences",
    "Swedish University of Agricultural Sciences": "Swedish University of Agricultural Sciences",
    "Konstfack University of Arts, Crafts and Design": "Konstfack University of Arts, Crafts and Design",
    "Royal Institute of Art": "Royal Institute of Art",
    "University College of Arts, Crafts and Design": "Konstfack University of Arts, Crafts and Design",
    "University of Arts, Crafts and Design": "Konstfack University of Arts, Crafts and Design",
    "University College of Music in Stockholm": "Royal College of Music in Stockholm",
    "Royal College of Music in Stockholm": "Royal College of Music in Stockholm",
    "Stockholm University of the Arts": "Stockholm University of the Arts",
    "Karolinska Institutet": "Karolinska Institute", // Another variation

    // Additional mappings based on THE data discrepancies
    "LMU Munich": "Ludwig Maximilian University of Munich",
    "Paris Sciences et Lettres – PSL Research University Paris": "PSL Research University Paris",
    "KU Leuven": "Catholic University of Leuven",
    "The Chinese University of Hong Kong": "Chinese University of Hong Kong",
    "Universität Heidelberg": "Heidelberg University",
    "Nanyang Technological University, Singapore": "Nanyang Technological University",
    "National Taiwan University (NTU)": "National Taiwan University",
    "King's College London": "King's College London", // Ensure consistent apostrophe
    "The University of Chicago": "University of Chicago",
    "University of California, Berkeley": "University of California - Berkeley",
    "University of California, Los Angeles": "University of California - Los Angeles",
    "University of Toronto": "University of Toronto",
    "University of Michigan-Ann Arbor": "University of Michigan-Ann Arbor",
    "Carnegie Mellon University": "Carnegie Mellon University",
    "University of Washington": "University of Washington",
    "Duke University": "Duke University",
    "The University of Tokyo": "University of Tokyo",
    "Northwestern University": "Northwestern University",
    "École Polytechnique Fédérale de Lausanne": "Swiss Federal Institute of Technology Lausanne (EPFL)", // Mapping to EPFL standardized name
    "New York University": "New York University",
    "University of California, San Diego": "University of California - San Diego",
    "University of Hong Kong": "University of Hong Kong",
    "Fudan University": "Fudan University",
    "LMU Munich": "Ludwig Maximilian University of Munich", // Re-adding for clarity
    "University of Melbourne": "University of Melbourne",
    "Georgia Institute of Technology": "Georgia Institute of Technology",
    "University of British Columbia": "University of British Columbia",
    "Institut Polytechnique de Paris": "Institut Polytechnique de Paris",
    "University of Southern California": "University of Southern California",
    "The University of Queensland": "University of Queensland",
    "City University of Hong Kong": "City University of Hong Kong",
    "Purdue University West Lafayette": "Purdue University - West Lafayette",
    "University of Groningen": "University of Groningen",
    "Korea Advanced Institute of Science and Technology (KAIST)": "KAIST",
    "UNSW Sydney": "University of New South Wales (UNSW Sydney)", // Mapping to UNSW Sydney standardized name
    "The Hong Kong Polytechnic University": "Hong Kong Polytechnic University",
    "University of Massachusetts": "University of Massachusetts Amherst",
    "University of Minnesota": "University of Minnesota, Twin Cities",
    "University of Bonn": "University of Bonn",
    "University of California, Irvine": "University of California - Irvine",
    "Vanderbilt University": "Vanderbilt University",
    "Charité - Universitätsmedizin Berlin": "Charité - Universitätsmedizin Berlin",
    "KTH Royal Institute of Technology": "KTH Royal Institute of Technology",
    "Lund University": "Lund University",
    "University of Copenhagen": "University of Copenhagen",
    "Emory University": "Emory University",
    "Penn State (Main campus)": "Pennsylvania State University",
    "University of Bern": "University of Bern",
    "Erasmus University Rotterdam": "Erasmus University Rotterdam",
    "Lomonosov Moscow State University": "Lomonosov Moscow State University",
    "University of Vienna": "University of Vienna",
    "Ghent University": "Ghent University",
    "Rice University": "Rice University",
    "University of Maryland, College Park": "University of Maryland - College Park",
    "McMaster University": "McMaster University",
    "Ohio State University (Main campus)": "Ohio State University",
    "University of Alberta": "University of Alberta",
    "Tohoku University": "Tohoku University",
    "University of Göttingen": "University of Göttingen",
    "Michigan State University": "Michigan State University",
    "Technical University of Denmark": "Technical University of Denmark",
    "Université de Montréal": "University of Montreal",
    "University of Basel": "University of Basel",
    "University of Rochester": "University of Rochester",
    "University of Adelaide": "University of Adelaide",
    "University of Freiburg": "University of Freiburg",
    "University of Florida": "University of Florida",
    "Uppsala University": "Uppsala University",
    "Maastricht University": "Maastricht University",
    "University of Lausanne": "University of Lausanne",
    "Wuhan University": "Wuhan University",
    "University of Arizona": "University of Arizona",
    "Vrije Universiteit Amsterdam": "Vrije Universiteit Amsterdam",
    "Trinity College Dublin": "Trinity College Dublin",
    "University of Pittsburgh-Pittsburgh campus": "University of Pittsburgh",
    "Radboud University Nijmegen": "Radboud University Nijmegen",
    "Texas A&M University": "Texas A&M University",
    "University of Colorado Boulder": "University of Colorado Boulder",
    "Beijing Normal University": "Beijing Normal University",
    "University of Bologna": "University of Bologna",
    "The University of Western Australia": "University of Western Australia",
    "Pohang University of Science and Technology (POSTECH)": "POSTECH",
    "Harbin Institute of Technology": "Harbin Institute of Technology",
    "University of Auckland": "University of Auckland",
    "Scuola Normale Superiore di Pisa": "Scuola Normale Superiore di Pisa",
    "Tongji University": "Tongji University",
    "University of Technology Sydney": "University of Technology Sydney (UTS)", // Mapping to UTS standardized name
    "Case Western Reserve University": "Case Western Reserve University",
    "TU Dresden": "TU Dresden",
    "The University of Osaka": "Osaka University",
    "University of Virginia (Main campus)": "University of Virginia",
    "University of Waterloo": "University of Waterloo",
    "Huazhong University of Science and Technology": "Huazhong University of Science and Technology",
    "Karlsruhe Institute of Technology": "Karlsruhe Institute of Technology (KIT)", // Mapping to KIT standardized name
    "Dartmouth College": "Dartmouth College",
    "University of Geneva": "University of Geneva",
    "Université Catholique de Louvain": "Catholic University of Louvain, Louvain-la-Neuve",
    "King Fahd University of Petroleum and Minerals": "King Fahd University of Petroleum and Minerals",
    "Pompeu Fabra University": "Pompeu Fabra University",
    "Macquarie University": "Macquarie University",
    "Tufts University": "Tufts University",
    "University of Cape Town": "University of Cape Town",
    "University of Macau": "University of Macau",
    "University of Twente": "University of Twente",
    "Southern University of Science and Technology (SUSTech)": "Southern University of Science and Technology (SUSTech)",
    "Université Paris Cité": "Université Paris Cité",
    "Eindhoven University of Technology": "Eindhoven University of Technology",
    "Sapienza University of Rome": "Sapienza University of Rome",
    "University of Münster": "University of Münster",
    "Indiana University": "Indiana University Bloomington",
    "Korea University": "Korea University",
    "Abu Dhabi University": "Abu Dhabi University",
    "Ulm University": "Ulm University",
    "Universitat Autònoma de Barcelona (UAB)": "Universitat Autònoma de Barcelona"
};

/**
 * Standardizes a university name based on a predefined mapping.
 * @param {string} name - The university name to standardize.
 * @returns {string} The standardized university name, or the original name if no mapping is found.
 */
function standardizeUniversityName(name) {
    // Perform basic trimming and handle potential extra spaces/invisible characters
    const cleanedName = name.trim().replace(/\s+/g, ' ');
    // Look up the cleaned name in the map.
    // Using a direct lookup for now. More complex matching (e.g., fuzzy) could be added later.
    return universityNameMap[cleanedName] || cleanedName;
}

// Removed generic file reading functions (readJsonRankings, readCsvRankings, readXlsxRankings)

/**
 * Main function to process data from each source file and aggregate rankings.
 * @param {number} limit - The number of top universities to process from each source.
 */
async function main(limit = 200) {
    console.log(`Starting ranking data processing and aggregation for top ${limit} universities.`);

    try {
        // --- 1. Read data from each source file using their respective logic ---
        console.log('Processing QS rankings...');
        // Assuming scrapeQSRankings now reads from data/qs_rankings.xlsx
        const qsRankingsRaw = await scrapeQSRankings(limit); // Call the QS scraper function
         // Apply standardization and filtering after getting data from scraper
         const qsRankings = qsRankingsRaw.map(uni => {
             if (uni.name && typeof uni.rank === 'number' && !isNaN(uni.rank)) { // Ensure rank is a valid number
                  const standardizedName = standardizeUniversityName(uni.name);
                  return { name: standardizedName, rank: Math.floor(uni.rank) }; // Ensure rank is integer
             } else {
                 console.warn('Skipping QS entry due to missing or invalid data:', uni);
                 return null; // Skip invalid entries
             }
         }).filter(uni => uni !== null).sort((a, b) => a.rank - b.rank).slice(0, limit);
        console.log(`Processed ${qsRankings.length} universities from QS.`);

        console.log('Processing THE rankings...');
        // Assuming scrapeTHERankings now reads from data/the_rankings.json
        const theRankingsRaw = await scrapeTHERankings(limit); // Call the THE scraper function
         // Apply standardization and filtering after getting data from scraper
         const theRankings = theRankingsRaw.map(uni => {
             // Attempt to parse rank as integer. THE ranks can be strings like '175' or '=176'.
             // Extract numeric part from rank string if present, then parse.
             const rankMatch = typeof uni.rank === 'string' ? uni.rank.match(/\d+/) : null;
             const rank = rankMatch ? parseInt(rankMatch[0], 10) : NaN;

             const standardizedName = standardizeUniversityName(uni.name);

             // Temporary logging to debug THE data processing
             console.log(`THE Raw Name: ${uni.name}, Standardized Name: ${standardizedName}, Parsed Rank: ${rank}`);

             if (uni.name && !isNaN(rank) && typeof rank === 'number') { // Ensure name exists and rank is a valid number
                  return { name: standardizedName, rank: rank }; // Use the parsed integer rank
             } else {
                 console.warn('Skipping THE entry due to missing or invalid data:', uni);
                 return null; // Skip invalid entries
             }
         }).filter(uni => uni !== null).sort((a, b) => a.rank - b.rank).slice(0, limit);
         console.log(`Processed ${theRankings.length} universities from THE.`);

        console.log('Processing ARWU rankings...');
        // Assuming scrapeARWURankings now reads from data/arwu_rankings.csv
        const arwuRankingsRaw = await scrapeARWURankings(limit); // Call the ARWU scraper function
         // Apply standardization and filtering after getting data from scraper
         const arwuRankings = arwuRankingsRaw.map(uni => {
             // ARWU ranks can be strings (e.g., '101-150'). We need to handle this.
             // For simplicity, we'll try to parse to integer and skip if it's a range.
             const rank = parseInt(uni.rank, 10);
             if (uni.name && !isNaN(rank)) { // Check if rank is a valid number after parsing
                  const standardizedName = standardizeUniversityName(uni.name);
                  return { name: standardizedName, rank: rank }; // Use parsed integer rank
             } else {
                 console.warn('Skipping ARWU entry due to missing or invalid data or range rank:', uni);
                 return null; // Skip invalid entries or range ranks for now
             }
         }).filter(uni => uni !== null).sort((a, b) => a.rank - b.rank).slice(0, limit);
         console.log(`Processed ${arwuRankings.length} universities from ARWU.`);

        console.log('Reading US News rankings from file...');
        // Keep existing logic for US News CSV as it was manually provided
        const usnewsRankings = await new Promise((resolve, reject) => {
            const results = [];
            createReadStream(path.join(__dirname, '..', 'data', 'usnews_rankings.csv'))
                .pipe(csv())
                 .on('headers', (headers) => {
                     console.log('US News CSV Headers detected:', headers);
                 })
                .on('data', (data) => {
                    // Assuming the CSV has columns named 'University' and 'Rank'
                    // Adjust column names if your CSV uses different headers
                    if (data.University && data.Rank) {
                         // Apply standardization here
                        const standardizedName = standardizeUniversityName(data.University);
                        results.push({ name: standardizedName, rank: parseInt(data.Rank, 10) });
                    }
                })
                .on('end', () => {
                    console.log(`Read ${results.length} universities from data/usnews_rankings.csv.`);
                    // Filter to the top 'limit' universities if necessary, matching the behavior of scrapers
                    // Assuming the CSV is already sorted by rank, or we can sort here
                    results.sort((a, b) => a.rank - b.rank);
                    resolve(results.slice(0, limit));
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
                    universitiesData[name] = { name, rankings: {} };
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
        const outputFilePath = path.join(__dirname, '..', 'data', 'aggregated-rankings.json');
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