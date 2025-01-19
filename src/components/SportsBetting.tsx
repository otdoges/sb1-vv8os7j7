import React, { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { supabase, fetchLiveMatches, placeSportsBet } from '../lib/supabase';

export default function SportsBetting() {
  const [betAmount, setBetAmount] = useState(10);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<'teamA' | 'teamB' | null>(null);
  const [bets, setBets] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBets();
    loadMatches();
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
    if (!selectedMatch || !selectedTeam) return;

    try {
      await placeSportsBet({
        matchId: selectedMatch.id,
        betAmount,
        odds: selectedMatch.odds[selectedTeam],
        prediction: selectedTeam === 'teamA' ? selectedMatch.teamA : selectedMatch.teamB,
        teamA: selectedMatch.teamA,
        teamB: selectedMatch.teamB,
        sportType: selectedMatch.sport
      });

      await loadBets();
      setSelectedMatch(null);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error placing bet:', error);
    }
  };

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
          <h2 className="text-2xl font-bold text-white mb-4">Live Matches</h2>
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className={`p-4 rounded-lg transition-all duration-200 ${
                  selectedMatch?.id === match.id
                    ? 'bg-indigo-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => setSelectedMatch(match)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="text-white font-medium">{match.teamA}</p>
                    <p className="text-gray-300">vs</p>
                    <p className="text-white font-medium">{match.teamB}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400">{match.odds.teamA}x</p>
                    <p className="text-green-400">{match.odds.teamB}x</p>
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
                  <p className="text-green-400">{selectedMatch.odds.teamA}x</p>
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
                  <p className="text-green-400">{selectedMatch.odds.teamB}x</p>
                </button>
              </div>

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
                disabled={!selectedTeam}
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
                      Prediction: {bet.prediction}
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