# World University Rankings Aggregator

This project aggregates university rankings from multiple sources (QS, THE, ARWU, US News) using a Borda Count with Penalized Absence method.

[![Deploy to GitHub Pages](https://github.com/mmostagirbhuiyan/university-ranking-aggregator/actions/workflows/deploy.yml/badge.svg)](https://github.com/mmostagirbhuiyan/university-ranking-aggregator/actions/workflows/deploy.yml)

## Setup

Make sure you have Node.js and npm installed.

1. Clone this repository.
2. Install dependencies for the frontend:

   ```bash
   cd frontend
   npm install
   ```

3. Install dependencies for the data processing scripts:

   ```bash
   cd ..
   npm install csv-parser axios cheerio puppeteer
   # Note: Puppeteer might require additional system dependencies depending on your OS.
   ```

## Updating Ranking Data and Regenerating Aggregated Data

To update the aggregated rankings:

1. The scrapers for QS, THE and ARWU now automatically download the latest CSV files from [universityrankings.ch](https://www.universityrankings.ch) whenever you run the aggregation script. You only need to manually supply the US News CSV if you wish to include that source.
2. If you do need to replace any files manually, drop them in `frontend/public/data/` using the same filenames (`qs_rankings.csv`, `the_rankings.csv`, `arwu_rankings.csv`, `usnews_rankings.csv`).

3. **Generate University Name Mapping (Data Sanitation)**
   Before aggregating, run the matching script to generate or update the university name mapping. This script uses fuzzy matching to identify variations of the same university name across different sources and suggests a standardized name.

   ```bash
   node scripts/match-universities.js
   ```

   This will generate `frontend/public/data/suggested-university-mapping.json`. This file contains suggested mappings between original names from each source and a standardized name. It is crucial to **manually review and edit** this file to correct any incorrect matches or add missing ones.

4. **Review and Refine Mapping**
   Open `frontend/public/data/suggested-university-mapping.json` and carefully check the suggested mappings. Edit the `suggestedStandardizedName` for any entries that are incorrectly grouped or standardized. You can also add new entries to the `manualMapping` section at the beginning of the file for specific cases you want to hardcode.

5. **Run Aggregation Script**
   After you are satisfied with the university name mapping, run the main scraping and aggregation script from the project root directory:

   ```bash
   node scripts/scrape-rankings.js
   ```

   This script now reads the mapping from `frontend/public/data/suggested-university-mapping.json` to standardize university names before consolidating and aggregating the rankings. It will then save the new aggregated rankings to `frontend/public/data/aggregated-rankings.json`.

## Running the Frontend

To view the aggregated rankings in the web browser:

1. Navigate to the `frontend` directory:

   ```bash
   cd frontend
   ```

2. Start the React development server:

   ```bash
   npm start
   ```

   This will open the application in your default web browser (usually at `http://localhost:3000`). The frontend reads the data from `frontend/src/data/aggregated-rankings.json`. 
