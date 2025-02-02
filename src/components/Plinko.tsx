import React, { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { getBalance, updateBalance } from '../lib/supabase';

const ROWS = 8;
const PEGS_PER_ROW = 9;
const MULTIPLIERS = [0.5, 1, 1.5, 2, 5, 2, 1.5, 1, 0.5];
const BALL_SIZE = 16; // px
const PEG_SIZE = 12; // px
const VERTICAL_SPACING = 60; // px
const HORIZONTAL_SPACING = 40; // px
const BOUNCE_STRENGTH = 0.8;
const GRAVITY = 0.5;
const FRICTION = 0.99;
const SLOT_WIDTH = 50; // px
const BOARD_WIDTH = PEGS_PER_ROW * HORIZONTAL_SPACING;
const BOARD_HEIGHT = ROWS * VERTICAL_SPACING + 180; // Added extra space for slots

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
      // Calculate collision angle
      const angle = Math.atan2(dy, dx);
      
      // Calculate new velocity based on collision angle
      const speed = Math.sqrt(ballVel.x * ballVel.x + ballVel.y * ballVel.y);
      const newVelX = Math.cos(angle) * speed * BOUNCE_STRENGTH;
      const newVelY = Math.sin(angle) * speed * BOUNCE_STRENGTH;
      
      // Add some randomness to make it more interesting
      const randomFactor = 0.3;
      return {
        x: newVelX + (Math.random() - 0.5) * randomFactor,
        y: newVelY + Math.abs(Math.random() * randomFactor) // Always add positive Y to ensure downward movement
      };
    }
    
    return null;
  };

  const getMultiplierIndex = (x: number, maxX: number) => {
    const slotWidth = maxX / MULTIPLIERS.length;
    return Math.min(Math.floor(x / slotWidth), MULTIPLIERS.length - 1);
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
        x: BOARD_WIDTH / 2,
        y: 0
      };
      
      let velocity: Velocity = {
        x: 0,
        y: 0
      };

      const maxX = BOARD_WIDTH;
      const maxY = BOARD_HEIGHT - 60; // Leave space for slots

      const animate = async () => {
        const duration = 5000; // 5 seconds
        const steps = 120; // 120fps for smoother animation
        const stepDuration = duration / steps;
        
        for (let i = 0; i < steps; i++) {
          // Apply gravity
          velocity.y += GRAVITY;
          
          // Apply friction
          velocity.x *= FRICTION;
          velocity.y *= FRICTION;
          
          // Update position
          position.x += velocity.x;
          position.y += velocity.y;
          
          // Check collisions with pegs
          for (const peg of pegs) {
            const collision = calculateCollision(position, velocity, peg);
            if (collision) {
              velocity = collision;
            }
          }
          
          // Bounce off walls
          if (position.x < 0) {
            position.x = 0;
            velocity.x *= -BOUNCE_STRENGTH;
          } else if (position.x > maxX) {
            position.x = maxX;
            velocity.x *= -BOUNCE_STRENGTH;
          }
          
          // Stop when ball reaches bottom
          if (position.y >= maxY) {
            position.y = maxY;
            break;
          }
          
          await controls.start({
            x: position.x,
            y: position.y,
            transition: { duration: stepDuration }
          });
          
          await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
        
        // Calculate final multiplier based on x position
        const multiplierIndex = getMultiplierIndex(position.x, maxX);
        const finalMultiplier = MULTIPLIERS[multiplierIndex];
        const winAmount = betAmount * finalMultiplier;
        
        const finalBalance = await updateBalance(winAmount, 'plinko', {
          action: 'win',
          amount: winAmount,
          multiplier: finalMultiplier
        });
        
        setBalance(finalBalance);
        setIsDropping(false);
        
        // Reset ball position after a short delay
        setTimeout(() => {
          controls.set({ x: 0, y: 0 });
        }, 1000);
      };
      
      animate();
    } catch (error) {
      console.error('Error updating balance:', error);
      setIsDropping(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
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
        
        <div 
          className="relative bg-gray-900 rounded-lg overflow-hidden mx-auto"
          style={{ 
            width: `${BOARD_WIDTH}px`, 
            height: `${BOARD_HEIGHT}px`
          }}
        >
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
              className="absolute w-4 h-4 bg-yellow-400 rounded-full shadow-lg"
              style={{ top: 0, left: 0 }}
              animate={controls}
            />
          )}
          
          {/* Multiplier slots */}
          <div className="absolute bottom-0 w-full flex justify-around">
            {MULTIPLIERS.map((mult, index) => (
              <div
                key={index}
                className="relative"
                style={{ width: SLOT_WIDTH }}
              >
                <div className="absolute bottom-0 w-full h-16 flex items-center justify-center border-l border-r border-t border-blue-500/30">
                  <span className="text-white font-bold">{mult}x</span>
                </div>
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