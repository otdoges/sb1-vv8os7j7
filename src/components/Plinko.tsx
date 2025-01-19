import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ROWS = 8;
const PEGS_PER_ROW = 9;
const MULTIPLIERS = [0.5, 1, 1.5, 2, 5, 2, 1.5, 1, 0.5];

export default function Plinko() {
  const [balance, setBalance] = useState(1000);
  const [betAmount, setBetAmount] = useState(10);
  const [isDropping, setIsDropping] = useState(false);
  const [ballPosition, setBallPosition] = useState({ x: 0, y: 0 });
  const [finalMultiplier, setFinalMultiplier] = useState(0);

  const dropBall = () => {
    if (balance < betAmount || isDropping) return;
    
    setIsDropping(true);
    setBalance(prev => prev - betAmount);
    
    let currentX = PEGS_PER_ROW * 30 / 2;
    const path = [];
    
    // Generate random path
    for (let i = 0; i < ROWS; i++) {
      const direction = Math.random() > 0.5 ? 30 : -30;
      currentX += direction;
      path.push({ x: currentX, y: (i + 1) * 60 });
    }
    
    // Animate through path
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < path.length) {
        setBallPosition(path[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
        const multiplierIndex = Math.floor(currentX / 60);
        const winAmount = betAmount * MULTIPLIERS[multiplierIndex];
        setBalance(prev => prev + winAmount);
        setFinalMultiplier(MULTIPLIERS[multiplierIndex]);
        setTimeout(() => {
          setIsDropping(false);
          setBallPosition({ x: 0, y: 0 });
        }, 1000);
      }
    }, 200);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="bg-gray-800 rounded-lg p-6 mb-4">
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
            />
          </div>
        </div>
        
        <div className="relative h-[600px] bg-gray-900 rounded-lg overflow-hidden">
          {/* Pegs */}
          {Array.from({ length: ROWS }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="flex justify-around px-8"
              style={{ marginTop: rowIndex === 0 ? '60px' : '30px' }}
            >
              {Array.from({ length: PEGS_PER_ROW - rowIndex }).map((_, pegIndex) => (
                <div
                  key={pegIndex}
                  className="w-3 h-3 bg-blue-500 rounded-full"
                  style={{ marginLeft: rowIndex * 15 }}
                />
              ))}
            </div>
          ))}
          
          {/* Ball */}
          {isDropping && (
            <motion.div
              className="absolute w-4 h-4 bg-yellow-400 rounded-full"
              animate={{
                x: ballPosition.x,
                y: ballPosition.y,
              }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          )}
          
          {/* Multipliers */}
          <div className="absolute bottom-0 w-full flex justify-around px-4 py-2 bg-gray-800">
            {MULTIPLIERS.map((mult, index) => (
              <div
                key={index}
                className={`text-white font-bold ${
                  finalMultiplier === mult ? 'text-yellow-400' : ''
                }`}
              >
                {mult}x
              </div>
            ))}
          </div>
        </div>
        
        <button
          onClick={dropBall}
          disabled={isDropping || balance < betAmount}
          className={`w-full mt-4 py-3 rounded-lg font-bold ${
            isDropping || balance < betAmount
              ? 'bg-gray-600 text-gray-400'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isDropping ? 'Dropping...' : 'Drop Ball'}
        </button>
      </div>
    </div>
  );
}