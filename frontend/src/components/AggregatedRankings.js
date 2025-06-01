import React, { useEffect, useState } from 'react';
// Remove the direct import of the JSON file
// import rankingsData from '../data/aggregated-rankings.json'; 

// Assuming the styles from style.css are imported or available globally
// import '../App.css'; // If you move styles into App.css or a similar file

// Receive searchTerm and rankingsData as props
const AggregatedRankings = ({ searchTerm, rankingsData }) => {
    // We will use rankingsData prop directly and keep a state for filtered rankings
    const [filteredRankings, setFilteredRankings] = useState([]);

    // Effect to initialize and filter rankings whenever rankingsData or searchTerm change
    useEffect(() => {
        if (rankingsData && rankingsData.length > 0) {
            if (searchTerm) {
                const lowercasedSearchTerm = searchTerm.toLowerCase();
                const filtered = rankingsData.filter(university =>
                    university.name.toLowerCase().includes(lowercasedSearchTerm)
                );
                setFilteredRankings(filtered);
            } else {
                setFilteredRankings(rankingsData); // Show all rankings if search term is empty
            }
        } else {
            setFilteredRankings([]); // Clear filtered rankings if no data is provided
        }
    }, [searchTerm, rankingsData]); // Rerun effect when searchTerm or rankingsData prop change

    // Remove loading and error states and their checks as parent handles fetching
    // if (loading) {
    //     return <div className="status loading">Loading aggregated rankings...</div>;
    // }
    // if (error) {
    //     return <div className="status error">Error loading rankings: {error.message}</div>;
    // }

    // Removed redundant export functions
    // const exportAsCsv = () => { /* ... */ };
    // const exportAsJson = () => { /* ... */ };

    // Check if rankingsData is available and not empty before rendering the list
    if (!rankingsData || rankingsData.length === 0) {
        // Display a message indicating data needs to be loaded, or if no data exists after loading
        return <div className="status">Load rankings to see the aggregated results.</div>;
    }

    return (
        <div id="aggregated-results" className="aggregated-ranking"> {/* Use the class from your sample */} 
            <h2>🏆 Aggregated World University Rankings</h2>
            <p style={{ textAlign: 'center', marginBottom: '20px', opacity: 0.9 }}>
                Showing {filteredRankings.length} of {rankingsData.length} universities • Based on {Object.keys(rankingsData[0]?.originalRankings || {}).length} authoritative sources
            </p>

            {
                filteredRankings.map((university, index) => {
                    const medalClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

                    return (
                        <div key={university.name} className={`top-university ${medalClass}`}> {/* Use the class from your sample */} 
                            <div>
                                <strong>{medal} #{university.aggregatedRank} {university.name}</strong>
                                <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
                                    Appears in {university.appearances}/{Object.keys(university.originalRankings).length} rankings
                                    • Score: {university.aggregatedScore.toFixed(2)}
                                </div>
                            </div>
                            <div className="individual-ranks">
                                <span className="rank-tag qs">QS: {university.originalRankings.qs?.rank || '-'}</span>
                                <span className="rank-tag the">THE: {university.originalRankings.the?.rank || '-'}</span>
                                <span className="rank-tag arwu">ARWU: {university.originalRankings.arwu?.rank || '-'}</span>
                                <span className="rank-tag usn">USN: {university.originalRankings.usnews?.rank || '-'}</span>
                            </div>
                        </div>
                    );
                })
            }
             {/* Export options are now in App.js */}
            {/* <div className="export-options">
                <button onClick={exportAsCsv}>📊 Export CSV</button>
                <button onClick={exportAsJson}>💾 Export JSON</button>
            </div> */}
        </div>
    );
};

export default AggregatedRankings; 