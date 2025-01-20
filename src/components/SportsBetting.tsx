import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, ArrowDownUp } from 'lucide-react';
import { supabase, fetchLiveMatches, placeSportsBet } from '../lib/supabase';

type BetType = 'moneyline' | 'spread' | 'total';

export default function SportsBetting() {
  const [betAmount, setBetAmount] = useState(10);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'teamA' | 'teamB' | null>(null);
  const [selectedBetType, setSelectedBetType] = useState<BetType>('moneyline');
  const [selectedTotal, setSelectedTotal] = useState<'over' | 'under' | null>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSport, setActiveSport] = useState<string>('all');

  useEffect(() => {
    loadBets();
    loadMatches();
    // Refresh matches every 5 minutes
    const interval = setInterval(loadMatches, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadBets = async () => {
    const { data } = await supabase
      .from('sports_bets')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setBets(data);
  };

  const loadMatches = async () => {
    try {
      const matches = await fetchLiveMatches();
      setMatches(matches);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBet = async () => {
    if (!selectedMatch || (!selectedTeam && !selectedTotal)) return;

    try {
      let prediction, odds, points;

      if (selectedBetType === 'moneyline') {
        prediction = selectedTeam === 'teamA' ? selectedMatch.teamA : selectedMatch.teamB;
        odds = selectedMatch.odds[selectedTeam!];
      } else if (selectedBetType === 'spread') {
        prediction = selectedTeam === 'teamA' ? selectedMatch.teamA : selectedMatch.teamB;
        odds = selectedMatch.spreads[selectedTeam!].odds;
        points = selectedMatch.spreads[selectedTeam!].points;
      } else {
        prediction = selectedTotal === 'over' ? 'Over' : 'Under';
        odds = selectedMatch.totals[selectedTotal!].odds;
        points = selectedMatch.totals[selectedTotal!].points;
      }

      await placeSportsBet({
        matchId: selectedMatch.id,
        betAmount,
        odds,
        prediction,
        teamA: selectedMatch.teamA,
        teamB: selectedMatch.teamB,
        sportType: selectedMatch.sport,
        betType: selectedBetType,
        points
      });

      await loadBets();
      setSelectedMatch(null);
      setSelectedTeam(null);
      setSelectedTotal(null);
    } catch (error) {
      console.error('Error placing bet:', error);
    }
  };

  const filteredMatches = activeSport === 'all' 
    ? matches 
    : matches.filter(match => match.sport === activeSport);

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="mb-6">
          <div className="flex gap-4 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveSport('all')}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                activeSport === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Sports
            </button>
            {Array.from(new Set(matches.map(m => m.sport))).map(sport => (
              <button
                key={sport}
                onClick={() => setActiveSport(sport)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  activeSport === sport
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {sport}
              </button>
            ))}
          </div>

          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setSelectedBetType('moneyline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                selectedBetType === 'moneyline'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Moneyline
            </button>
            <button
              onClick={() => setSelectedBetType('spread')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                selectedBetType === 'spread'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <ArrowDownUp className="w-4 h-4" />
              Spread
            </button>
            <button
              onClick={() => setSelectedBetType('total')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                selectedBetType === 'total'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Totals
            </button>
          </div>

          <div className="space-y-4">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className={`p-4 rounded-lg transition-all duration-200 ${
                  selectedMatch?.id === match.id
                    ? 'bg-indigo-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => {
                  setSelectedMatch(match);
                  setSelectedTeam(null);
                  setSelectedTotal(null);
                }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{match.sport}</p>
                    <p className="text-white font-medium">{match.teamA}</p>
                    <p className="text-gray-300">vs</p>
                    <p className="text-white font-medium">{match.teamB}</p>
                    <p className="text-sm text-gray-300">
                      {new Date(match.time).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {selectedBetType === 'moneyline' && (
                      <>
                        <p className="text-green-400">{match.odds.teamA}x</p>
                        <p className="text-green-400">{match.odds.teamB}x</p>
                      </>
                    )}
                    {selectedBetType === 'spread' && (
                      <>
                        <p className="text-green-400">
                          {match.spreads.teamA.points > 0 ? '+' : ''}
                          {match.spreads.teamA.points} ({match.spreads.teamA.odds}x)
                        </p>
                        <p className="text-green-400">
                          {match.spreads.teamB.points > 0 ? '+' : ''}
                          {match.spreads.teamB.points} ({match.spreads.teamB.odds}x)
                        </p>
                      </>
                    )}
                    {selectedBetType === 'total' && (
                      <>
                        <p className="text-green-400">
                          O {match.totals.over.points} ({match.totals.over.odds}x)
                        </p>
                        <p className="text-green-400">
                          U {match.totals.under.points} ({match.totals.under.odds}x)
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedMatch && (
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white mb-4">Place Your Bet</h3>
            <div className="space-y-4">
              {selectedBetType === 'total' ? (
                <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedTotal('over')}
                    className={`flex-1 p-4 rounded-lg ${
                      selectedTotal === 'over'
                        ? 'bg-green-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <p className="text-white font-medium">
                      Over {selectedMatch.totals.over.points}
                    </p>
                    <p className="text-green-400">{selectedMatch.totals.over.odds}x</p>
                  </button>
                  <button
                    onClick={() => setSelectedTotal('under')}
                    className={`flex-1 p-4 rounded-lg ${
                      selectedTotal === 'under'
                        ? 'bg-green-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <p className="text-white font-medium">
                      Under {selectedMatch.totals.under.points}
                    </p>
                    <p className="text-green-400">{selectedMatch.totals.under.odds}x</p>
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedTeam('teamA')}
                    className={`flex-1 p-4 rounded-lg ${
                      selectedTeam === 'teamA'
                        ? 'bg-green-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <p className="text-white font-medium">{selectedMatch.teamA}</p>
                    {selectedBetType === 'moneyline' ? (
                      <p className="text-green-400">{selectedMatch.odds.teamA}x</p>
                    ) : (
                      <p className="text-green-400">
                        {selectedMatch.spreads.teamA.points > 0 ? '+' : ''}
                        {selectedMatch.spreads.teamA.points} ({selectedMatch.spreads.teamA.odds}x)
                      </p>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedTeam('teamB')}
                    className={`flex-1 p-4 rounded-lg ${
                      selectedTeam === 'teamB'
                        ? 'bg-green-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <p className="text-white font-medium">{selectedMatch.teamB}</p>
                    {selectedBetType === 'moneyline' ? (
                      <p className="text-green-400">{selectedMatch.odds.teamB}x</p>
                    ) : (
                      <p className="text-green-400">
                        {selectedMatch.spreads.teamB.points > 0 ? '+' : ''}
                        {selectedMatch.spreads.teamB.points} ({selectedMatch.spreads.teamB.odds}x)
                      </p>
                    )}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bet Amount
                </label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="bg-gray-700 p-2 rounded w-full text-white"
                  min="1"
                />
              </div>

              <button
                onClick={handlePlaceBet}
                disabled={!selectedTeam && !selectedTotal}
                className="w-full py-3 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-600"
              >
                Place Bet
              </button>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xl font-bold text-white mb-4">Your Bets</h3>
          <div className="space-y-4">
            {bets.map((bet) => (
              <div
                key={bet.id}
                className="p-4 rounded-lg bg-gray-700"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">
                      {bet.team_a} vs {bet.team_b}
                    </p>
                    <p className="text-gray-300">
                      {bet.bet_type === 'total' ? (
                        `${bet.prediction} ${bet.points}`
                      ) : (
                        <>
                          {bet.prediction}
                          {bet.points && ` (${bet.points > 0 ? '+' : ''}${bet.points})`}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">${bet.bet_amount}</p>
                    <p className={`font-medium ${
                      bet.status === 'won'
                        ? 'text-green-400'
                        : bet.status === 'lost'
                        ? 'text-red-400'
                        : 'text-yellow-400'
                    }`}>
                      {bet.status.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}