import React, { useState, useEffect } from 'react';
import './App.css';
import AggregatedRankings from './components/AggregatedRankings';
import { TextField, Button, Typography, Box, Container, IconButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import GetAppIcon from '@mui/icons-material/GetApp';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// Function to create MUI theme based on current mode, providing explicit colors
const getAppTheme = (mode) => {
  // Define color palettes for light and dark modes
  const lightPalette = {
    primary: {
      main: '#5A67D8',
    },
    secondary: {
      main: '#4299E1',
    },
    text: {
      primary: '#2D3748',
      secondary: '#718096',
    },
    background: {
      default: '#f5f7fa', // Body background approximation
      paper: '#ffffff', // Container background
      alt: '#f8f9fa', // Alt background for sections
    },
    status: { // Custom status colors
       loading: {
           main: '#2B6CB0',
           light: '#EBF8FF',
           dark: '#BEE3F8',
       },
       success: {
           main: '#38A169',
           light: '#F0FFF4',
           dark: '#68D391',
       },
       error: {
           main: '#E53E3E',
           light: '#FED7D7',
           dark: '#FC8181',
       },
    },
    medal: { // Custom medal colors
       gold: {
           main: '#B7950B',
           light: '#FCF4A1',
           dark: '#F6E05E',
       },
       silver: {
           main: '#718096',
           light: '#E2E4E6',
           dark: '#CBD5E0',
       },
       bronze: {
           main: '#805AD5',
           light: '#E9D8FD',
           dark: '#D6BCFA',
       },
    }
  };

  const darkPalette = {
    primary: {
      main: '#63b3ed',
    },
    secondary: {
      main: '#9f7aea',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#a0aec0',
    },
    background: {
      default: '#1a202c', // Body background
      paper: '#2d3748', // Container background
      alt: '#4a5568', // Alt background for sections
    },
    status: { // Custom status colors
       loading: {
           main: '#A0AEC0', // Using secondary text color
           light: '#2a4365',
           dark: '#4299E1',
       },
       success: {
           main: '#C6F6D5',
           light: '#2F855A',
           dark: '#68D391',
       },
       error: {
           main: '#FED7D7', // Using error light color
           light: '#C53030',
           dark: '#FC8181',
       },
    },
     medal: { // Custom medal colors (Adjusted for dark background)
        gold: {
            main: '#FEFCBF',
            light: '#B7950B',
            dark: '#F6E05E',
        },
        silver: {
            main: '#E2E8F0',
            light: '#718096',
            dark: '#CBD5E0',
        },
        bronze: {
            main: '#E9D8FD',
            light: '#805AD5',
            dark: '#D6BCFA',
        },
    }
  };

  // Select the palette based on the current mode
  const palette = mode === 'light' ? lightPalette : darkPalette;

  return createTheme({
    palette: {
      mode,
      ...palette, // Spread the selected palette colors
       // Define shades for main colors if needed, MUI does this automatically
    },
    typography: {
        fontFamily: 'Poppins, sans-serif',
        // Define typography variants to match App.css where necessary
        h1: {
            fontSize: '2em',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '10px',
             // Color is handled by CSS variable in App.css for smooth transition
        },
         h3: {
            // Existing h3 styles from App.js Typography variant
             fontSize: '1.6em',
             fontWeight: 700,
             textAlign: 'center',
             marginBottom: '20px',
              // Color is handled by CSS variable in App.css
         },
        subtitle1: {
             fontSize: '0.9em',
             fontWeight: 400,
             textAlign: 'center',
             // Color is handled by CSS variable in App.css
             marginBottom: '50px',
        },
        // Add other typography variants used in App.js or AggregatedRankings.js
    },
     components: {
          MuiButton: {
              styleOverrides: {
                  root: {
                       // Removing styles that are now handled by the MUI theme palette and default button styles
                       // fontFamily: 'Poppins, sans-serif',
                       // fontWeight: 500,
                       // textTransform: 'none',
                       // borderRadius: '20px', // Keep custom border radius
                       // padding: '10px 25px', // Keep custom padding
                       // boxShadow: 'none', // Keep custom shadow handling
                       // transition is handled by CSS
                  },
                   contained: {
                       borderRadius: '20px', // Apply pill shape to contained buttons
                       padding: '10px 25px', // Apply custom padding
                       // MUI handles background-color and color based on palette.primary/secondary
                   },
              },
          },
          MuiTextField: {
              styleOverrides: {
                  root: {
                      fontSize: '0.9em',
                       // Color is handled by MUI theme text.primary/secondary
                  }
              }
          },
           MuiContainer: {
                styleOverrides: {
                    root: {
                        marginBottom: '4rem', // Use rem for consistent spacing
                        padding: '4rem', // Use rem
                         // Background, border-radius, box-shadow, backdrop-filter are handled by CSS class for theme transition
                         // bgcolor is handled by CSS variable in App.js component usage now
                    }
                }
           },
            MuiBox: {
               styleOverrides: {
                   root: {
                       // Remove flex properties from here if using a separate Box for layout
                   }
               }
            }
     },
      // Define custom colors here if needed outside palette
      // customColors: {
      //   qs: '#4299E1',
      //   the: '#F6AD55',
      //   arwu: '#63B3ED',
      //   usn: '#9F7AEA',
      // }
  });
};

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isMethodologyExpanded, setIsMethodologyExpanded] = useState(false);
  const [isReferencesExpanded, setIsReferencesExpanded] = useState(false);
  const [aggregatedData, setAggregatedData] = useState([]);
  const [themeMode, setThemeMode] = useState('light');

  // Use getAppTheme to create the theme object whenever themeMode changes
  const theme = getAppTheme(themeMode);

  // Effect to set initial theme from local storage and listen for system preference changes
  useEffect(() => {
    const savedTheme = localStorage.getItem('themeMode');
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      setThemeMode(savedTheme);
    } else if (prefersDarkMode) {
      setThemeMode('dark');
    }

    // Apply the theme class to the body
    // No longer need to add light-mode class here, as dark-mode handles override
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkMode)) {
         document.body.classList.add('dark-mode');
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
        if (!localStorage.getItem('themeMode')) { // Only react to system changes if no explicit preference is saved
            setThemeMode(e.matches ? 'dark' : 'light');
        }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);

  }, []); // Empty dependency array ensures this runs only once on mount

  // Effect to update the body class and local storage when themeMode changes
  useEffect(() => {
    // Toggle the dark-mode class on the body
    if (themeMode === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]); // Rerun effect when themeMode state changes


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

  const toggleThemeMode = () => {
    setThemeMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
        <div className={`App ${themeMode}-mode`}>
            <Container maxWidth={800} sx={{
                 mb: '4rem', 
                 px: '2rem',
                 pt: 0,
                 pb: '2rem',
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <IconButton onClick={toggleThemeMode} color="inherit">
                        {themeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
                    </IconButton>
                </Box>

                <Typography variant="h3" component="h1" gutterBottom sx={{
                     background: 'none', 
                     WebkitBackgroundClip: 'unset',
                     WebkitTextFillColor: 'unset',
                }}>
                  🎓 University Ranking Aggregator
                </Typography>
                <Typography variant="subtitle1" paragraph>
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
                  mb: 2,
                  width: '100%',
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
                    sx={{ width: '100%', minWidth: 0 }}
                  />
                </Box>

                <AggregatedRankings searchTerm={searchTerm} rankingsData={aggregatedData} />

                <Box sx={{ textAlign: 'center', mt: 4, display: 'flex', justifyContent: 'center' }}>
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
    </ThemeProvider>
  );
}

export default App;
