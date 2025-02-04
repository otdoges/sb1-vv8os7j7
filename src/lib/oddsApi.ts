const ODDS_API_KEY = import.meta.env.VITE_ODDS_API_KEY;
const ODDS_API_HOST = import.meta.env.VITE_ODDS_API_HOST;

interface OddsResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{
        name: string;
        price: number;
      }>;
    }>;
  }>;
}

export async function fetchLiveOdds(sport = 'upcoming') {
  try {
    // Debug log to check environment variables
    console.log('API Key exists:', !!ODDS_API_KEY);
    console.log('API Host exists:', !!ODDS_API_HOST);
    
    const url = `${ODDS_API_HOST}/${sport}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals`;
    console.log('Fetching odds from:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`Failed to fetch odds: ${response.status} ${response.statusText}`);
    }
    
    const data: OddsResponse[] = await response.json();
    console.log('Received odds data:', data.length, 'matches');
    
    // Transform the data for our database
    const matches = data.map(match => {
      const mainBookmaker = match.bookmakers[0];
      const h2hMarket = mainBookmaker?.markets.find(m => m.key === 'h2h');
      const spreadsMarket = mainBookmaker?.markets.find(m => m.key === 'spreads');
      const totalsMarket = mainBookmaker?.markets.find(m => m.key === 'totals');
      
      return {
        id: match.id,
        sport_type: match.sport_title,
        team_a: match.home_team,
        team_b: match.away_team,
        odds_a: h2hMarket?.outcomes.find(o => o.name === match.home_team)?.price || 1,
        odds_b: h2hMarket?.outcomes.find(o => o.name === match.away_team)?.price || 1,
        start_time: match.commence_time,
        status: 'upcoming',
        spread_a: spreadsMarket?.outcomes.find(o => o.name === match.home_team)?.price || 0,
        spread_b: spreadsMarket?.outcomes.find(o => o.name === match.away_team)?.price || 0,
        total_points: totalsMarket?.outcomes[0]?.price || 0,
        total_over_odds: totalsMarket?.outcomes.find(o => o.name === 'Over')?.price || 1,
        total_under_odds: totalsMarket?.outcomes.find(o => o.name === 'Under')?.price || 1
      };
    });
    
    return matches;
  } catch (error) {
    console.error('Error fetching odds:', error);
    return [];
  }
}

// Start polling for odds updates
let pollInterval: NodeJS.Timeout;

export function startOddsPolling(interval = 300000) { // 5 minutes
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  
  // Initial fetch
  fetchLiveOdds();
  
  // Set up polling
  pollInterval = setInterval(() => {
    fetchLiveOdds();
  }, interval);
}

export function stopOddsPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
}