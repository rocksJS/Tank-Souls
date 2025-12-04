import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import Sidebar from './components/Sidebar';
import { GameState } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState<number>(0);
  const [enemiesLeft, setEnemiesLeft] = useState<number>(20);
  
  const [level, setLevel] = useState<number>(1);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(1);

  // Handle Victory unlocking logic
  useEffect(() => {
    if (gameState === GameState.VICTORY) {
      if (level === unlockedLevel && level < 2) {
        setUnlockedLevel(prev => prev + 1);
      }
    }
  }, [gameState, level, unlockedLevel]);

  const startGame = () => {
    setGameState(GameState.PLAYING);
    setScore(0);
    setEnemiesLeft(20);
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="relative">
        <div className="relative border-[20px] border-neutral-800 rounded-xl shadow-2xl bg-[#636363] flex">
             {/* TV Scanline effect */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-30 pointer-events-none bg-[length:100%_4px,3px_100%] rounded-lg"></div>
             
             <div className="relative">
                 <GameCanvas 
                    gameState={gameState} 
                    setGameState={setGameState} 
                    setScore={setScore}
                    setEnemiesLeft={setEnemiesLeft}
                    level={level}
                 />
                 <UIOverlay 
                    gameState={gameState} 
                    score={score} 
                    enemiesLeft={enemiesLeft}
                    startGame={startGame}
                    level={level}
                    setLevel={setLevel}
                    unlockedLevel={unlockedLevel}
                 />
             </div>
             
             <Sidebar enemiesLeft={enemiesLeft} score={score} level={level} />
        </div>
        
        {/* Decorative TV details */}
        <div className="absolute -bottom-16 left-0 w-full flex justify-between px-8 text-neutral-600 font-mono text-xs">
             <div>POWER <span className="inline-block w-2 h-2 bg-red-500 rounded-full ml-1 animate-pulse"></span></div>
             <div>REACT-NES-SYSTEM</div>
        </div>
      </div>
    </div>
  );
};

export default App;