import React, { useState, useEffect } from 'react';
import './App.css';
import AggregatedRankings from './components/AggregatedRankings';
import { TextField, Button, Typography, Box, Container } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GetAppIcon from '@mui/icons-material/GetApp';

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isMethodologyExpanded, setIsMethodologyExpanded] = useState(false);
  const [isReferencesExpanded, setIsReferencesExpanded] = useState(false);
  const [aggregatedData, setAggregatedData] = useState([]);

  const loadRankings = async () => {
    console.log('Loading aggregated rankings data...');
    try {
      const response = await fetch(`${process.env.PUBLIC_URL}/data/aggregated-rankings.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAggregatedData(data);
      console.log('Aggregated rankings data loaded successfully.');
    } catch (error) {
      console.error('Error loading aggregated rankings data:', error);
    }
  };

  useEffect(() => {
    loadRankings();
  }, []);

  const exportResults = (format) => {
    console.log(`Exporting as ${format}...`);

    if (!aggregatedData || aggregatedData.length === 0) {
        alert("No data to export.");
        return;
    }

    if (format === 'csv') {
        const headers = ["Aggregated Rank", "University Name", "QS Rank", "THE Rank", "ARWU Rank", "USN Rank", "Appearances", "Aggregated Score"];
        const rows = aggregatedData.map(uni => {
            return [
                uni.aggregatedRank,
                `"${uni.name.replace(/"/g, '""')}"`,
                uni.originalRankings.qs?.rank || '-',
                uni.originalRankings.the?.rank || '-',
                uni.originalRankings.arwu?.rank || '-',
                uni.originalRankings.usnews?.rank || '-',
                uni.appearances,
                uni.aggregatedScore.toFixed(2)
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'aggregated_rankings.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } else if (format === 'json') {
        const jsonContent = JSON.stringify(aggregatedData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'aggregated_rankings.json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  return (
    <div className="App">
      <Container maxWidth="lg" sx={{ mb: 4, p: 4, bgcolor: 'rgba(255, 255, 255, 0.95)', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)', backdropFilter: 'blur(10px)' }}>
        <Typography variant="h3" component="h1" align="center" gutterBottom sx={{
          background: 'linear-gradient(45deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: '#333',
        }}>
          🎓 University Ranking Aggregator
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
          Comprehensive aggregation using multiple credible sources and advanced statistical methodology
        </Typography>

        <div id="methodology-section" className="methodology">
          <h2>Our Methodology <button onClick={() => setIsMethodologyExpanded(!isMethodologyExpanded)}>{isMethodologyExpanded ? '▲' : '▼'}</button></h2>
          <h3>Advanced Borda Count with Penalized Absence</h3>
          <p>
            Our aggregation method is based on an advanced form of the Borda Count with Penalized Absence.
            This approach is more sophisticated than simple averaging methods like the one used by ARWU.
            It is based on established research in rank aggregation theory.
          </p>

          {isMethodologyExpanded && (
            <>
              <div className="methodology-section-block">
                <h3>Why This Methodology is Superior:</h3>
                <ul>
                  <li><strong>Borda Count:</strong> Each ranking position contributes proportionally to the final score, providing a nuanced view compared to methods that only consider top tiers.</li>
                  <li><strong>Penalized Absence:</strong> Universities missing from some sources are not simply ignored. Instead, we calculate penalties based on their likely rank in those sources, providing a more accurate overall score.</li>
                  <li><strong>Confidence Weighting:</strong> Universities appearing in more credible sources receive higher confidence scores, reflecting the robustness of their ranking data.</li>
                  <li><strong>Weighted Sources:</strong> Each ranking source can be assigned a different importance weight based on its perceived credibility or relevance.</li>
                </ul>
              </div>

              <div className="methodology-section-block">
                <h3>Data Sources (Top 4 Most Credible):</h3>
                <ul>
                  <li><strong>QS World University Rankings:</strong> One of the most globally recognized rankings.</li>
                  <li><strong>Times Higher Education:</strong> Known for its strong focus on research and teaching metrics.</li>
                  <li><strong>Academic Ranking of World Universities (ARWU):</strong> Also known as Shanghai Rankings, heavily focused on research output and academic staff achievements.</li>
                  <li><strong>US News Global Universities:</strong> Provides comprehensive global coverage and a broad set of indicators.</li>
                </ul>
              </div>

              <div className="methodology-section-block">
                <h3>Advanced Statistical Features:</h3>
                <ul>
                  <li><strong>Normalization:</strong> Accounts for different ranking scales and methodologies used by individual sources.</li>
                  <li><strong>Confidence Scoring:</strong> Weights universities appearing in multiple sources higher.</li>
                  <li><strong>Outlier Detection:</strong> Implements penalties for inconsistent rankings across sources.</li>
                  <li><strong>Export Options:</strong> Provides data in convenient formats like CSV and JSON with metadata.</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div id="references-section">
          <h2>References <button onClick={() => setIsReferencesExpanded(!isReferencesExpanded)}>{isReferencesExpanded ? '▲' : '▼'}</button></h2>
          {isReferencesExpanded && (
            <ul>
              <li>Fox, N. B., & Bruyns, B. (2024). <em>An Evaluation of Borda Count Variations Using Ranked Choice Voting Data</em>. arXiv preprint arXiv:2501.00618.</li>
            </ul>
          )}
        </div>

        <div id="status"></div>

        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: 2,
          width: '100%',
          maxWidth: '800px',
          margin: 'auto',
        }}>
          <TextField
            label="Search University"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ mr: 1 }} />
              ),
            }}
            sx={{ width: '100%' }}
          />
        </Box>

        <AggregatedRankings searchTerm={searchTerm} rankingsData={aggregatedData} />

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="contained"
            color="success"
            startIcon={<GetAppIcon />}
            onClick={() => exportResults('csv')}
            sx={{ mr: 2 }}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<GetAppIcon />}
            onClick={() => exportResults('json')}
          >
            Export JSON
          </Button>
        </Box>
      </Container>
    </div>
  );
}

export default App;
