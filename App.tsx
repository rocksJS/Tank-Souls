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
  
  const [gameSessionId, setGameSessionId] = useState<number>(0);
  const [isGameInProgress, setIsGameInProgress] = useState<boolean>(false);

  // Handle Victory unlocking logic and game progress state
  useEffect(() => {
    if (gameState === GameState.VICTORY) {
      setIsGameInProgress(false);
      if (level === unlockedLevel && level < 2) {
        setUnlockedLevel(prev => prev + 1);
      }
    } else if (gameState === GameState.GAME_OVER) {
      setIsGameInProgress(false);
    }
  }, [gameState, level, unlockedLevel]);

  const startGame = () => {
    setGameSessionId(prev => prev + 1);
    setGameState(GameState.PLAYING);
    setScore(0);
    setEnemiesLeft(20);
    setIsGameInProgress(true);
  };
  
  const resumeGame = () => {
      setGameState(GameState.PLAYING);
  };

  return (
    <div className="min-h-screen flex justify-center pt-32 pb-12">
      <div className="relative">
        <div className="relative border-[4px] border-[#333] rounded shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-[#1a1a1a] flex">
             {/* TV Scanline effect (subtler for Tank Souls) */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(0,0,0,0.03),rgba(0,0,0,0.03))] z-30 pointer-events-none bg-[length:100%_4px,3px_100%] rounded-lg"></div>
             
             <div className="relative">
                 <GameCanvas 
                    gameState={gameState} 
                    setGameState={setGameState} 
                    setScore={setScore}
                    setEnemiesLeft={setEnemiesLeft}
                    level={level}
                    gameSessionId={gameSessionId}
                 />
                 <UIOverlay 
                    gameState={gameState} 
                    setGameState={setGameState}
                    score={score} 
                    enemiesLeft={enemiesLeft}
                    startGame={startGame}
                    resumeGame={resumeGame}
                    level={level}
                    setLevel={setLevel}
                    unlockedLevel={unlockedLevel}
                    isGameInProgress={isGameInProgress}
                 />
             </div>
             
             <Sidebar 
                enemiesLeft={enemiesLeft} 
                score={score} 
                level={level} 
                setGameState={setGameState}
             />
        </div>
        
        {/* Decorative details */}
        <div className="absolute -bottom-12 left-0 w-full flex justify-center text-[#444] font-gothic text-xl opacity-50">
             PREPARE TO DIE EDITION
        </div>
      </div>
    </div>
  );
};

export default App;