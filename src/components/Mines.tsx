import React, { useState, useEffect } from 'react';
import { Bomb, Gem } from 'lucide-react';
import { getBalance, updateBalance } from '../lib/supabase';

const GRID_SIZE = 25; // 5x5 grid
const DEFAULT_MINES = 5;

export default function Mines() {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [gameActive, setGameActive] = useState(false);
  const [revealed, setRevealed] = useState<boolean[]>(Array(GRID_SIZE).fill(false));
  const [mines, setMines] = useState<number[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const newBalance = await getBalance();
      setBalance(newBalance);
    } catch (error) {
      console.error('Error loading balance:', error);
    }
  };

  const startGame = async () => {
    if (balance < betAmount) return;
    
    try {
      const newBalance = await updateBalance(-betAmount, 'mines', {
        action: 'bet',
        amount: betAmount
      });
      setBalance(newBalance);
      setGameActive(true);
      setGameOver(false);
      setRevealed(Array(GRID_SIZE).fill(false));
      setCurrentMultiplier(1);
      
      // Place mines randomly
      const newMines: number[] = [];
      while (newMines.length < DEFAULT_MINES) {
        const mine = Math.floor(Math.random() * GRID_SIZE);
        if (!newMines.includes(mine)) {
          newMines.push(mine);
        }
      }
      setMines(newMines);
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const calculateMultiplier = (revealedCount: number) => {
    return 1 + (revealedCount * 0.2);
  };

  const revealTile = (index: number) => {
    if (!gameActive || revealed[index] || gameOver) return;

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    if (mines.includes(index)) {
      // Hit a mine
      setGameOver(true);
      setGameActive(false);
      setRevealed(Array(GRID_SIZE).fill(true));
    } else {
      // Safe tile
      const revealedCount = newRevealed.filter(Boolean).length;
      const newMultiplier = calculateMultiplier(revealedCount);
      setCurrentMultiplier(newMultiplier);
    }
  };

  const cashOut = async () => {
    if (!gameActive) return;
    
    try {
      const winAmount = betAmount * currentMultiplier;
      const newBalance = await updateBalance(winAmount, 'mines', {
        action: 'win',
        amount: winAmount,
        multiplier: currentMultiplier
      });
      setBalance(newBalance);
      setGameActive(false);
      setRevealed(Array(GRID_SIZE).fill(true));
      setGameOver(true);
    } catch (error) {
      console.error('Error cashing out:', error);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between mb-4">
          <div className="text-white">
            <p className="text-sm">Balance</p>
            <p className="text-2xl font-bold">${balance.toFixed(2)}</p>
          </div>
          <div className="text-white">
            <p className="text-sm">Bet Amount</p>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="bg-gray-700 p-2 rounded w-32 text-right"
              min="1"
              max={balance}
              disabled={gameActive}
            />
          </div>
        </div>

        <div className="mb-4 text-center text-white">
          <p className="text-sm">Current Multiplier</p>
          <p className="text-3xl font-bold text-green-400">{currentMultiplier.toFixed(2)}x</p>
        </div>

        <div className="grid grid-cols-5 gap-2 mb-4">
          {Array.from({ length: GRID_SIZE }).map((_, index) => (
            <button
              key={index}
              onClick={() => revealTile(index)}
              className={`aspect-square rounded-lg transition-all duration-200 ${
                revealed[index]
                  ? mines.includes(index)
                    ? 'bg-red-500'
                    : 'bg-green-500'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              disabled={!gameActive || revealed[index]}
            >
              {revealed[index] && (
                mines.includes(index) ? (
                  <Bomb className="w-6 h-6 mx-auto text-white" />
                ) : (
                  <Gem className="w-6 h-6 mx-auto text-white" />
                )
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          {!gameActive ? (
            <button
              onClick={startGame}
              disabled={balance < betAmount}
              className={`w-full py-3 rounded-lg font-bold ${
                balance < betAmount
                  ? 'bg-gray-600 text-gray-400'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Start Game
            </button>
          ) : (
            <button
              onClick={cashOut}
              className="w-full py-3 rounded-lg font-bold bg-green-500 text-white hover:bg-green-600"
            >
              Cash Out (${(betAmount * currentMultiplier).toFixed(2)})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}