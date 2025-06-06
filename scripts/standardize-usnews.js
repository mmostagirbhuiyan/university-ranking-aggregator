const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const stringSimilarity = require('string-similarity');

// Reuse the basicCleanName function from match-universities.js
function basicCleanName(name) {
    if (typeof name !== 'string' || name.trim() === '') {
        return '';
    }
    let cleanedName = name.trim();
    cleanedName = cleanedName.toLowerCase();
    cleanedName = cleanedName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    cleanedName = cleanedName.replace(/^the\s+/, '');
    cleanedName = cleanedName.replace(/\s*\([^)]*\)\s*/g, '');
    cleanedName = cleanedName.replace(/\s*-\s*australia/g, '');
    cleanedName = cleanedName.replace(/\s*-\s*uk/g, '');
    cleanedName = cleanedName.replace(/\s*-\s*newcastle-upon-tyne/g, '');
    cleanedName = cleanedName.replace(/ university/g, '');
    cleanedName = cleanedName.replace(/ college/g, '');
    cleanedName = cleanedName.replace(/ institute/g, '');
    cleanedName = cleanedName.replace(/ of technology/g, '');
    cleanedName = cleanedName.replace(/ and/g, '');
    cleanedName = cleanedName.replace(/\s+/g, ' ');
    cleanedName = cleanedName.replace(/[.,\-]/g, '');
    cleanedName = cleanedName.trim();
    return cleanedName;
}

async function loadOtherNames() {
    const { scrapeQSRankings } = require('./qs-scraper');
    const { scrapeTHERankings } = require('./the-scraper');
    const { scrapeARWURankings } = require('./arwu-scraper');
    const results = [];
    const qs = await scrapeQSRankings();
    qs.forEach(u => results.push(u.name));
    const the = await scrapeTHERankings();
    the.forEach(u => results.push(u.name));
    const arwu = await scrapeARWURankings();
    arwu.forEach(u => results.push(u.name));
    const map = new Map();
    results.forEach(name => {
        const cleaned = basicCleanName(name);
        if (!map.has(cleaned)) {
            map.set(cleaned, name);
        }
    });
    return map;
}

async function loadUSNews(filePath) {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', row => rows.push(row))
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}

async function saveUSNews(filePath, rows) {
    const header = 'Rank,University,Country,Score,Enrollment\n';
    const lines = rows.map(r => {
        return `${r.Rank},${r.University},${r.Country},${r.Score},${r.Enrollment}`;
    });
    await fs.promises.writeFile(filePath, header + lines.join('\n'));
}

async function main() {
    const dataDir = path.join(__dirname, '..', 'frontend', 'public', 'data');
    const usnewsPath = path.join(dataDir, 'usnews_rankings.csv');
    const cleanedPath = path.join(dataDir, 'usnews_rankings.csv');

    const standardMap = await loadOtherNames();
    const usRows = await loadUSNews(usnewsPath);
    const otherCleaned = Array.from(standardMap.keys());

    usRows.forEach(row => {
        const cleaned = basicCleanName(row.University);
        if (standardMap.has(cleaned)) {
            row.University = standardMap.get(cleaned);
        } else {
            const best = stringSimilarity.findBestMatch(cleaned, otherCleaned);
            if (best.bestMatch.rating > 0.9) {
                row.University = standardMap.get(best.bestMatch.target);
            }
        }
    });

    await saveUSNews(cleanedPath, usRows);
    console.log('US News names standardized.');
}

main().catch(err => { console.error(err); process.exit(1); });
