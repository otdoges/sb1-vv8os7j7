import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { getBalance, updateBalance } from '../lib/supabase';

const ROWS = 8;
const PEGS_PER_ROW = 9;
const MULTIPLIERS = [0.5, 1, 1.5, 2, 5, 2, 1.5, 1, 0.5];
const BALL_SIZE = 16; // px
const PEG_SIZE = 12; // px
const VERTICAL_SPACING = 60; // px
const HORIZONTAL_SPACING = 30; // px
const BOUNCE_STRENGTH = 0.7;
const GRAVITY = 0.5;

interface Position {
  x: number;
  y: number;
}

interface Velocity {
  x: number;
  y: number;
}

interface Peg {
  x: number;
  y: number;
}

export default function Plinko() {
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [isDropping, setIsDropping] = useState(false);
  const [pegs, setPegs] = useState<Peg[]>([]);
  const controls = useAnimation();

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

  useEffect(() => {
    // Generate peg positions
    const newPegs: Peg[] = [];
    for (let row = 0; row < ROWS; row++) {
      const pegsInRow = PEGS_PER_ROW - row;
      const startX = (row * HORIZONTAL_SPACING) / 2;
      
      for (let col = 0; col < pegsInRow; col++) {
        newPegs.push({
          x: startX + col * HORIZONTAL_SPACING,
          y: row * VERTICAL_SPACING + 60 // Add initial offset
        });
      }
    }
    setPegs(newPegs);
  }, []);

  const calculateCollision = (ballPos: Position, ballVel: Velocity, peg: Peg) => {
    const dx = ballPos.x - peg.x;
    const dy = ballPos.y - peg.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < (BALL_SIZE + PEG_SIZE) / 2) {
      // Collision detected
      const angle = Math.atan2(dy, dx);
      const newVelX = Math.cos(angle) * ballVel.magnitude * BOUNCE_STRENGTH;
      const newVelY = Math.sin(angle) * ballVel.magnitude * BOUNCE_STRENGTH;
      
      return {
        x: newVelX,
        y: newVelY
      };
    }
    
    return null;
  };

  const dropBall = async () => {
    if (balance < betAmount || isDropping) return;
    
    setIsDropping(true);
    
    try {
      // Deduct bet amount
      const newBalance = await updateBalance(-betAmount, 'plinko', {
        action: 'bet',
        amount: betAmount
      });
      setBalance(newBalance);
      
      let position: Position = {
        x: PEGS_PER_ROW * HORIZONTAL_SPACING / 2,
        y: 0
      };
      
      let velocity: Velocity = {
        x: 0,
        y: 0
      };

      const animate = async () => {
        const duration = 3000; // 3 seconds
        const steps = 60; // 60fps
        const stepDuration = duration / steps;
        
        for (let i = 0; i < steps; i++) {
          // Apply gravity
          velocity.y += GRAVITY;
          
          // Update position
          position.x += velocity.x;
          position.y += velocity.y;
          
          // Check collisions with pegs
          for (const peg of pegs) {
            const collision = calculateCollision(position, velocity, peg);
            if (collision) {
              velocity = collision;
              // Add some randomness to make it more interesting
              velocity.x += (Math.random() - 0.5) * 2;
            }
          }
          
          // Bounce off walls
          if (position.x < 0 || position.x > PEGS_PER_ROW * HORIZONTAL_SPACING) {
            velocity.x *= -BOUNCE_STRENGTH;
          }
          
          await controls.start({
            x: position.x,
            y: position.y,
            transition: { duration: stepDuration }
          });
          
          await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
        
        // Calculate final multiplier based on x position
        const multiplierIndex = Math.floor(position.x / (PEGS_PER_ROW * HORIZONTAL_SPACING / MULTIPLIERS.length));
        const finalMultiplier = MULTIPLIERS[Math.max(0, Math.min(multiplierIndex, MULTIPLIERS.length - 1))];
        const winAmount = betAmount * finalMultiplier;
        
        const finalBalance = await updateBalance(winAmount, 'plinko', {
          action: 'win',
          amount: winAmount,
          multiplier: finalMultiplier
        });
        
        setBalance(finalBalance);
      };
      
      animate();
    } catch (error) {
      console.error('Error updating balance:', error);
    } finally {
      setIsDropping(false);
      controls.set({ x: 0, y: 0 });
    }
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
              disabled={isDropping}
            />
          </div>
        </div>
        
        <div className="relative h-[600px] bg-gray-900 rounded-lg overflow-hidden">
          {/* Pegs */}
          {pegs.map((peg, index) => (
            <div
              key={index}
              className="absolute w-3 h-3 bg-blue-500 rounded-full"
              style={{
                left: peg.x,
                top: peg.y,
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
          
          {/* Ball */}
          {isDropping && (
            <motion.div
              className="absolute w-4 h-4 bg-yellow-400 rounded-full"
              style={{ top: 0, left: 0 }}
              animate={controls}
            />
          )}
          
          {/* Multipliers */}
          <div className="absolute bottom-0 w-full flex justify-around px-4 py-2 bg-gray-800">
            {MULTIPLIERS.map((mult, index) => (
              <div key={index} className="text-white font-bold">
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