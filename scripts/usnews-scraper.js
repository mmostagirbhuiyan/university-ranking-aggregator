const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'usnews_rankings.csv');
const BASE_URL = 'https://www.usnews.com/education/best-global-universities/api/search';

async function fetchPage(offset, count) {
  const url = `${BASE_URL}?format=json&offset=${offset}&limit=${count}`;
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    }
  });
  return response.data;
}

async function scrapeUSNewsRankings(max = 1500) {
  const pageSize = 200;
  let results = [];
  for (let offset = 0; results.length < max; offset += pageSize) {
    const data = await fetchPage(offset, pageSize);
    const items = data && (data.items || data.data);
    if (!items || items.length === 0) break;
    for (const item of items) {
      const rank = item.rank || item.ranking || item.position;
      const name = item.school?.name || item.name || item.title;
      const country = item.school?.country || item.country || 'N/A';
      const score = item.overall_score || item.score || item.overall || 'N/A';
      if (rank) {
        results.push({ rank, name, country, score });
      }
    }
  }
  return results.slice(0, max);
}

async function downloadUSNewsCSV(limit = 1500) {
  const data = await scrapeUSNewsRankings(limit);
    const csvLines = ['Rank,University,Country,Score'];
    data.forEach(d => {
      const line = [d.rank, d.name.replace(/,/g, ''), d.country.replace(/,/g, ''), d.score].join(',');
      csvLines.push(line);
    });
    fs.writeFileSync(OUTPUT_PATH, csvLines.join('\n'), 'utf8');
    console.log(`Saved ${data.length} rows to ${OUTPUT_PATH}`);
  return data;
}

if (require.main === module) {
  downloadUSNewsCSV().catch(err => {
    console.error('Failed to scrape US News:', err.message);
  });
}

module.exports = { scrapeUSNewsRankings, downloadUSNewsCSV };
