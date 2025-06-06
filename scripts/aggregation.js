/**
 * Calculates the Borda score for a university in a specific ranking.
 * BordaScore(i,j) = max(0, N_j - rank(i,j) + 1)
 * Where N_j is the maximum rank in system j.
 * @param {number} rank - The rank of the university in the current system (1-indexed).
 * @param {number} maxRank - The maximum rank in the current system.
 * @returns {number} The calculated Borda score.
 */
function calculateBordaScore(rank, maxRank) {
    if (rank === null || rank === undefined) {
        // This case should ideally be handled by penalized absence, but adding a safeguard.
        return 0; 
    }
    // The markdown states max(0, Nj - rank(i,j) + 1). 
    // If rank is 1, score is Nj. If rank is Nj, score is 1. If rank is > Nj, score is 0 or negative (max 0).
    return Math.max(0, maxRank - rank + 1);
}

/**
 * Calculates the penalty score for a university missing from a ranking.
 * PenaltyScore(i,j) = N_j × 0.1 (10% penalty)
 * @param {number} maxRank - The maximum rank in the current system.
 * @returns {number} The calculated penalty score.
 */
function calculatePenaltyScore(maxRank) {
    return maxRank * 0.1;
}

/**
 * Calculates the aggregated score for a university across multiple ranking sources.
 * FinalScore(i) = (∑[w_j × Score(i,j)]) / ∑w_j × ConfidenceMultiplier(i)
 * Score(i,j) is either BordaScore(i,j) or -PenaltyScore(i,j) if missing.
 * @param {Object} universityData - Data for a single university across all sources.
 * @param {Object} sourceWeights - Weights for each ranking source (e.g., { 'qs': 0.25, ... }).
 * @param {Object} sourceMaxRanks - Maximum ranks for each ranking source (e.g., { 'qs': 1400, ... }).
 * @param {number} totalSources - The total number of ranking sources considered.
 * @returns {number} The calculated final aggregated score.
 */
function calculateAggregatedScore(universityData, sourceWeights, sourceMaxRanks, totalSources) {
    let weightedScoreSum = 0;
    let weightSum = 0;
    let appearances = 0;

    for (const source in sourceWeights) {
        const weight = sourceWeights[source];
        const maxRank = sourceMaxRanks[source];
        const rank = universityData.rankings[source] ? universityData.rankings[source].rank : null; // Assuming universityData has rankings organized by source

        if (rank !== null) {
            const bordaScore = calculateBordaScore(rank, maxRank);
            weightedScoreSum += weight * bordaScore;
            appearances++;
        } else {
            // Apply penalty for missing rank
            // The markdown says PenaltyScore = Nj * 0.1, and FinalScore uses Score(i,j).
            // Based on common rank aggregation practices, penalties usually *reduce* the score.
            // It's not explicitly stated in the markdown how to integrate the penalty into the sum.
            // A reasonable approach is to subtract the penalty score or add a negative penalty.
            // Let's interpret Score(i,j) as BordaScore if present, and -PenaltyScore if missing.
            const penalty = calculatePenaltyScore(maxRank);
            weightedScoreSum -= weight * penalty; // Subtracting the weighted penalty
        }

        weightSum += weight; // Summing up weights regardless of presence, as per formula structure
    }

    // Confidence Multiplier: 0.5 + 0.5 × (appearances(i) / total_sources)
    const confidenceMultiplier = 0.5 + 0.5 * (appearances / totalSources);

    // Final Score calculation, ensuring we don't divide by zero if weights are zero (though unlikely with given weights)
    const finalScore = weightSum > 0 ? (weightedScoreSum / weightSum) * confidenceMultiplier : 0;

    return finalScore;
}

/**
 * Aggregates rankings for multiple universities.
 * @param {Object[]} universitiesData - Array of university data objects.
 * Each object is expected to have a structure like: { name: 'University Name', rankings: { qs: { rank: 10 }, the: { rank: null }, ... } }
 * @param {Object} sourceWeights - Weights for each ranking source.
 * @param {Object} sourceMaxRanks - Maximum ranks for each ranking source.
 * @param {number} totalSources - The total number of ranking sources considered.
 * @returns {Object[]} An array of universities with their calculated aggregated scores, sorted by score descending.
 */
function aggregateRankings(universitiesData, sourceWeights, sourceMaxRanks, totalSources) {
    // Placeholder maximum ranks - ideally, these should come from successful scraping results
    const estimatedMaxRanks = {
        qs: 1500,    // QS World University Rankings often lists over 1000
        the: 1000,   // Times Higher Education World University Rankings often lists around 1000
        arwu: 1000,  // Academic Ranking of World Universities often lists around 1000
        usnews: 1500 // US News Best Global Universities often lists over 1000
    };

    // Use the provided sourceMaxRanks if available, otherwise use the estimated ones
    const finalSourceMaxRanks = sourceMaxRanks || estimatedMaxRanks;

    const aggregatedResults = universitiesData.map(university => {
        // Pass the finalSourceMaxRanks to calculateAggregatedScore
        const finalScore = calculateAggregatedScore(university, sourceWeights, finalSourceMaxRanks, totalSources);
        return {
            name: university.name,
            country: university.country,
            aggregatedScore: finalScore,
            // Potentially add other relevant info like original ranks, appearances, etc.
            originalRankings: university.rankings, // Keeping original ranks for context
            appearances: Object.values(university.rankings).filter(r => r !== null && r.rank !== null).length
        };
    });

    // Sort by aggregated score in descending order
    aggregatedResults.sort((a, b) => b.aggregatedScore - a.aggregatedScore);

    // Assign final aggregated rank
    aggregatedResults.forEach((university, index) => {
        university.aggregatedRank = index + 1;
    });

    // Calculate country-specific ranks based on the global ordering
    const countryCounters = {};
    aggregatedResults.forEach(university => {
        const country = university.country || 'Unknown';
        if (!countryCounters[country]) {
            countryCounters[country] = 0;
        }
        countryCounters[country]++;
        university.countryRank = countryCounters[country];
    });

    return aggregatedResults;
}

// Export functions for use in other scripts (like scrape-rankings.js)
module.exports = {
    calculateBordaScore,
    calculatePenaltyScore,
    calculateAggregatedScore,
    aggregateRankings
}; 