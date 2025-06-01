import React, { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, Star, Globe, BookOpen, Award, ChevronDown, ChevronUp } from 'lucide-react';

function App() {
  const [universities, setUniversities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('aggregatedRank');
  const [expandedCard, setExpandedCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const universitiesPerPage = 50;
  const [showMethodology, setShowMethodology] = useState(false);

  useEffect(() => {
    const loadRankings = async () => {
      try {
        const response = await fetch(process.env.PUBLIC_URL + '/data/aggregated-rankings.json');
        if (!response.ok) {
          throw new Error('Failed to load rankings data');
        }
        const data = await response.json();
        setUniversities(data);
      } catch (error) {
        console.error('Error loading rankings:', error);
        // You might want to show an error message to the user here
      } finally {
        setIsLoading(false);
      }
    };

    loadRankings();
  }, []);

  const filteredAndSortedUniversities = useMemo(() => {
    const normalize = str => str.toLowerCase().replace(/\s+/g, '');
    const term = normalize(searchTerm.trim());
    let filtered = term
      ? universities.filter(uni => normalize(uni.name).includes(term))
      : universities;

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'aggregatedScore') return b.aggregatedScore - a.aggregatedScore;
      if (sortBy === 'aggregatedRank') return a.aggregatedRank - b.aggregatedRank;
      if (sortBy === 'appearances') return b.appearances - a.appearances;
      
      // Sort by specific ranking source
      if (a.originalRankings[sortBy] && b.originalRankings[sortBy]) {
        return a.originalRankings[sortBy].rank - b.originalRankings[sortBy].rank;
      }
      return 0;
    });
  }, [universities, searchTerm, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndSortedUniversities.length / universitiesPerPage);
  const paginatedUniversities = filteredAndSortedUniversities.slice(
    (currentPage - 1) * universitiesPerPage,
    currentPage * universitiesPerPage
  );

  // Pagination window logic
  const getPaginationWindow = () => {
    const windowSize = 5;
    const pages = [];
    if (totalPages <= windowSize + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const start = Math.max(2, currentPage - Math.floor(windowSize / 2));
      const end = Math.min(totalPages - 1, currentPage + Math.floor(windowSize / 2));
      pages.push(1);
      if (start > 2) pages.push('ellipsis-prev');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('ellipsis-next');
      pages.push(totalPages);
    }
    return pages;
  };
  const paginationWindow = getPaginationWindow();

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const getRankingBadgeColor = (rank) => {
    if (rank <= 3) return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
    if (rank <= 10) return 'bg-gradient-to-r from-blue-500 to-purple-600 text-white';
    if (rank <= 25) return 'bg-gradient-to-r from-green-500 to-teal-500 text-white';
    return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
  };

  const getScoreBadgeColor = (score) => {
    if (score >= 1710) return 'bg-gradient-to-r from-pink-500 to-rose-500 text-white';
    if (score >= 1700) return 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white';
    if (score >= 1650) return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
    return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
  };

  const getBestRanking = (originalRankings) => {
    const ranks = Object.values(originalRankings).map(r => r.rank);
    return Math.min(...ranks);
  };

  const getWorstRanking = (originalRankings) => {
    const ranks = Object.values(originalRankings).map(r => r.rank);
    return Math.max(...ranks);
  };

  const getRankingConsistency = (originalRankings) => {
    const ranks = Object.values(originalRankings).map(r => r.rank);
    const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    const variance = ranks.reduce((acc, rank) => acc + Math.pow(rank - avg, 2), 0) / ranks.length;
    return Math.sqrt(variance);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Universities</h2>
          <p className="text-purple-200">Aggregating global rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse"></div>
          <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-400/10 rounded-full blur-3xl animate-bounce"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-pink-400/10 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        <div className="relative container mx-auto px-6 py-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-6 py-2 mb-6 text-base md:text-lg" style={{ fontSize: '95%' }}>
              <Globe className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Global University Rankings</span>
            </div>
            
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center transform rotate-12 shadow-lg">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 leading-tight">
                UniRank
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                  Global
                </span>
              </h1>
            </div>
            
            <p className="text-xl text-purple-200 max-w-2xl mx-auto leading-relaxed" style={{ fontSize: '95%' }}>
              Your comprehensive guide to global university rankings, aggregating data from QS, Times Higher Education, ARWU, and US News
            </p>
          </div>

          {/* Search and Filter Section */}
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search universities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all"
                  />
                </div>
                
                <div className="relative">
                  <TrendingUp className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all appearance-none"
                  >
                    <option value="aggregatedRank" className="bg-gray-800">Aggregated Rank</option>
                    <option value="aggregatedScore" className="bg-gray-800">Aggregated Score</option>
                    <option value="qs" className="bg-gray-800">QS Ranking</option>
                    <option value="the" className="bg-gray-800">THE Ranking</option>
                    <option value="arwu" className="bg-gray-800">ARWU Ranking</option>
                    <option value="usnews" className="bg-gray-800">US News Ranking</option>
                    <option value="name" className="bg-gray-800">Name (A-Z)</option>
                    <option value="appearances" className="bg-gray-800">Appearances</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <span className="text-purple-200">
                  Found {filteredAndSortedUniversities.length} universities
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* University Cards */}
      <div className="container mx-auto px-6 pb-20">
        <div className="grid gap-8">
          {paginatedUniversities.map((university, index) => (
            <div
              key={index}
              className="group bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 overflow-hidden hover:bg-white/15 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className="p-8">
                <div className="flex flex-wrap items-start gap-6">
                  {/* Ranking Badge */}
                  <div className={`${getRankingBadgeColor(university.aggregatedRank)} rounded-2xl px-6 py-3 shadow-lg`}>
                    <div className="text-center">
                      <div className="text-3xl font-black">#{university.aggregatedRank}</div>
                      <div className="text-xs opacity-90">OVERALL</div>
                    </div>
                  </div>
                  
                  {/* Score Badge */}
                  <div className={`${getScoreBadgeColor(university.aggregatedScore)} rounded-2xl px-6 py-3 shadow-lg`}>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{university.aggregatedScore.toFixed(1)}</div>
                      <div className="text-xs opacity-90">SCORE</div>
                    </div>
                  </div>
                  
                  {/* University Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">
                          {university.name}
                        </h3>
                        <div className="flex items-center gap-4 text-purple-200 mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            <span>{university.appearances} rankings</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4" />
                            <span>Best: #{getBestRanking(university.originalRankings)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setExpandedCard(expandedCard === index ? null : index)}
                        className="text-white/60 hover:text-white transition-colors"
                      >
                        {expandedCard === index ? <ChevronUp /> : <ChevronDown />}
                      </button>
                    </div>
                    
                    {/* Rankings Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {Object.entries(university.originalRankings).map(([source, data]) => (
                        <div key={source} className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
                          <div className="text-lg font-bold text-white">#{data.rank}</div>
                          <div className="text-xs text-purple-200 uppercase tracking-wide">
                            {source === 'qs' ? 'QS World' : 
                             source === 'the' ? 'THE' :
                             source === 'arwu' ? 'ARWU' : 
                             source === 'usnews' ? 'US News' : source}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Expanded Content */}
                {expandedCard === index && (
                  <div className="mt-8 pt-8 border-t border-white/20 animate-in slide-in-from-top duration-300">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Ranking Analysis
                        </h4>
                        
                        <div className="space-y-4">
                          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-purple-200">Best Ranking</span>
                              <span className="text-green-400 font-bold">#{getBestRanking(university.originalRankings)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-purple-200">Worst Ranking</span>
                              <span className="text-orange-400 font-bold">#{getWorstRanking(university.originalRankings)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-purple-200">Consistency</span>
                              <span className="text-blue-400 font-bold">
                                {getRankingConsistency(university.originalRankings) < 2 ? 'Very High' :
                                 getRankingConsistency(university.originalRankings) < 5 ? 'High' :
                                 getRankingConsistency(university.originalRankings) < 10 ? 'Medium' : 'Variable'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                            <h5 className="text-white font-semibold mb-3">Ranking Sources</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-purple-200">QS World University Rankings</span>
                                <span className="text-white">Global</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-200">Times Higher Education</span>
                                <span className="text-white">Global</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-200">ARWU (Shanghai)</span>
                                <span className="text-white">Global</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-200">US News Global</span>
                                <span className="text-white">Global</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5" />
                          Performance Metrics
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                            <div className="text-2xl font-bold text-yellow-400 mb-1">
                              {university.aggregatedScore.toFixed(2)}
                            </div>
                            <div className="text-xs text-purple-200">Aggregated Score</div>
                          </div>
                          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                            <div className="text-2xl font-bold text-green-400 mb-1">
                              {university.appearances}
                            </div>
                            <div className="text-xs text-purple-200">Rankings Featured</div>
                          </div>
                        </div>
                        
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <h5 className="text-white font-semibold mb-3">Ranking Distribution</h5>
                          <div className="space-y-3">
                            {Object.entries(university.originalRankings).map(([source, data]) => {
                              const percentage = Math.max(10, 100 - (data.rank - 1) * 2);
                              return (
                                <div key={source} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-purple-200 uppercase">{source}</span>
                                    <span className="text-white font-semibold">#{data.rank}</span>
                                  </div>
                                  <div className="w-full bg-white/10 rounded-full h-2">
                                    <div 
                                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-1000"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-12 gap-2 flex-wrap">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition"
            >
              Previous
            </button>
            {paginationWindow.map((page, idx) =>
              page === 'ellipsis-prev' || page === 'ellipsis-next' ? (
                <span key={page + idx} className="px-3 py-2 text-white/60">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-4 py-2 rounded-lg border border-white/20 mx-1 ${
                    page === currentPage
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold shadow-lg'
                      : 'bg-white/10 text-white hover:bg-white/20 transition'
                  }`}
                  disabled={page === currentPage}
                >
                  {page}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition"
            >
              Next
            </button>
          </div>
        )}
        
        {filteredAndSortedUniversities.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎓</div>
            <h3 className="text-2xl font-bold text-white mb-2">No universities found</h3>
            <p className="text-purple-200">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center transform rotate-12">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-lg">UniRank Global</span>
            </div>
            <p className="text-purple-200 mb-6">
              Aggregating university rankings from QS, Times Higher Education, ARWU, and US News
            </p>
            {/* Methodology Collapsible Section */}
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => setShowMethodology((v) => !v)}
                className="w-full flex items-center justify-between px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white font-semibold text-lg hover:bg-white/20 transition mb-2"
                aria-expanded={showMethodology}
              >
                <span>Our Methodology</span>
                <span className="ml-2">{showMethodology ? '▲' : '▼'}</span>
              </button>
              {showMethodology && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-left text-purple-100 text-base animate-in mt-2">
                  <div className="mb-4">
                    <span className="block text-white font-bold mb-2">Advanced Borda Count with Penalized Absence</span>
                    <span>
                      Our aggregation uses an advanced Borda Count with Penalized Absence, based on research in rank aggregation theory.
                    </span>
                  </div>
                  <ul className="list-disc list-inside mb-4 space-y-1">
                    <li><b>Borda Count:</b> Each ranking position contributes proportionally to the final score.</li>
                    <li><b>Penalized Absence:</b> Missing universities are penalized based on likely rank, not ignored.</li>
                    <li><b>Confidence Weighting:</b> More credible sources and universities appearing in more sources are weighted higher.</li>
                    <li><b>Weighted Sources:</b> Each ranking source can be assigned a different importance.</li>
                  </ul>
                  <div className="mb-4">
                    <span className="block text-white font-semibold mb-1">Data Sources:</span>
                    <span>QS, Times Higher Education (THE), ARWU, US News Global Universities</span>
                  </div>
                  <ul className="list-disc list-inside mb-4 space-y-1">
                    <li>Normalization for different scales</li>
                    <li>Confidence scoring</li>
                    <li>Outlier detection</li>
                    <li>Export options (CSV, JSON)</li>
                  </ul>
                  <div className="mt-4">
                    <span className="block text-white font-semibold mb-1">References:</span>
                    <span>Fox, N. B., & Bruyns, B. (2024). An Evaluation of Borda Count Variations Using Ranked Choice Voting Data. arXiv:2501.00618.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
