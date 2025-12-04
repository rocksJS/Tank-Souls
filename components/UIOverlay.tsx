import React, { useEffect } from 'react';
import { GameState } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  enemiesLeft: number;
  startGame: () => void;
  resumeGame: () => void;
  level: number;
  setLevel: (level: number) => void;
  unlockedLevel: number;
  isGameInProgress: boolean;
  deathCount: number;
  estusUnlocked: boolean;
  setEstusUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
    gameState, setGameState, score, setScore, enemiesLeft, startGame, resumeGame, level, setLevel, unlockedLevel, isGameInProgress, deathCount,
    estusUnlocked, setEstusUnlocked
}) => {
  
  // Keyboard listener for quick restart and start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState === GameState.MENU) {
            if (e.code === 'ArrowLeft') {
                setLevel(Math.max(1, level - 1));
            } else if (e.code === 'ArrowRight') {
                setLevel(Math.min(2, level + 1));
            }
        }

        if (e.code === 'Space' || e.code === 'Enter') {
            if (gameState === GameState.GAME_OVER) {
                startGame();
            } else if (gameState === GameState.MENU) {
                startGame();
            }
        }
        
        // Escape to close shop
        if (e.code === 'Escape' && gameState === GameState.SHOP) {
            setGameState(isGameInProgress ? GameState.PLAYING : GameState.MENU);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, startGame, level, setLevel, isGameInProgress, setGameState]);

  const ESTUS_PRICE = 20;

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col items-center justify-center font-serif">
      
      {/* Main Menu - Tank Souls Style */}
      {gameState === GameState.MENU && (
        <div className="bg-black/95 p-12 border border-gray-700 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-center pointer-events-auto max-w-lg w-full relative overflow-hidden flex flex-col items-center">
          {/* Decorative Corner Borders */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-gray-500"></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-gray-500"></div>
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-gray-500"></div>
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-gray-500"></div>

          <h1 className="text-6xl md:text-7xl text-gray-200 mb-2 drop-shadow-lg tracking-widest font-gothic">
            Tank Souls
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-gray-500 to-transparent mx-auto mb-4"></div>
          
          <p className="text-gray-500 mb-4 text-xs font-mono uppercase tracking-[0.3em]">The Darkest Tank Battle</p>
          
          {deathCount > 0 && (
             <p className="text-red-900/80 mb-6 text-sm font-serif tracking-widest uppercase">
                Total Deaths: {deathCount}
             </p>
          )}

          {/* Level Selector */}
          <div className="mb-10 flex gap-6 justify-center items-center">
             <button 
                onClick={() => setLevel(1)}
                className={`text-lg transition-all duration-300 ${level === 1 ? 'text-gray-100 border-b border-gray-100' : 'text-gray-600 hover:text-gray-400'}`}
             >
                I
             </button>
             <button 
                onClick={() => setLevel(2)}
                className={`text-lg transition-all duration-300 relative ${
                    level === 2 ? 'text-gray-100 border-b border-gray-100' : 
                    'text-gray-600 hover:text-gray-400'
                }`}
             >
                II
             </button>
             <div className="absolute bottom-0 right-0 text-[10px] text-gray-700 p-2 opacity-50 uppercase tracking-widest">
                Use Arrows to Select
             </div>
          </div>

          <button
            onClick={startGame}
            className="group relative px-10 py-3 bg-transparent hover:bg-gray-900 text-gray-300 font-serif text-xl border border-gray-600 hover:border-gray-400 transition-all duration-500 ease-in-out w-full max-w-xs mb-4"
          >
            <span className="absolute inset-0 w-full h-full bg-gray-800/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></span>
            <span className="relative tracking-widest uppercase">Begin Journey</span>
          </button>
          
          <div className="text-xs text-gray-600 tracking-widest uppercase animate-pulse mb-2 mt-2">
            Press [SPACE] to Start
          </div>
          
          {isGameInProgress && (
              <button
                onClick={resumeGame}
                className="group relative px-10 py-3 bg-transparent hover:bg-gray-900 text-gray-400 font-serif text-lg border border-gray-800 hover:border-gray-500 transition-all duration-500 ease-in-out w-full max-w-xs"
              >
                <span className="absolute inset-0 w-full h-full bg-gray-800/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></span>
                <span className="relative tracking-widest uppercase">Resume</span>
              </button>
          )}
        </div>
      )}

      {/* Shop - Souls Style */}
      {gameState === GameState.SHOP && (
        <div className="bg-black/95 p-12 border border-gray-700 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-center pointer-events-auto max-w-lg w-full relative overflow-hidden flex flex-col items-center">
          {/* Decorative Corner Borders */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-gray-500"></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-gray-500"></div>
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-gray-500"></div>
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-gray-500"></div>

          <h1 className="text-4xl md:text-5xl text-gray-200 mb-2 drop-shadow-lg tracking-widest font-gothic">
            Merchant
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-yellow-900 to-transparent mx-auto mb-8"></div>

          <p className="text-gray-400 mb-8 font-serif italic text-lg">
             Souls: <span className="text-yellow-600 font-bold">{score}</span>
          </p>
          
          {/* Shop Items Grid */}
          <div className="border border-gray-800 bg-black/50 p-6 w-full mb-8 min-h-[120px] flex items-center justify-center relative">
             <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-700"></div>
             <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gray-700"></div>
             <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gray-700"></div>
             <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gray-700"></div>
             
             {/* Estus Flask Item */}
             <div className="flex flex-col items-center p-4 border border-gray-800 hover:border-orange-900/50 bg-gray-900/30 transition-colors w-32 h-44 justify-between">
                
                {/* Visual Flask - Authentic Design */}
                <div className="w-12 h-16 relative flex justify-center items-end shrink-0 drop-shadow-[0_0_5px_rgba(255,165,0,0.5)]">
                    {/* Neck */}
                    <div className="absolute top-0 w-4 h-8 bg-yellow-900/30 border-2 border-yellow-700 rounded-t-sm z-10 overflow-hidden">
                        <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-orange-500 to-yellow-500 opacity-80 animate-pulse"></div>
                    </div>
                    {/* Rim */}
                    <div className="absolute top-[-2px] w-6 h-2 bg-yellow-800 rounded-full border border-yellow-600 z-20 shadow-md"></div>
                    
                    {/* Body */}
                    <div className="w-10 h-10 bg-yellow-900/30 border-2 border-yellow-700 rounded-full relative overflow-hidden z-10 shadow-inner">
                         {/* Liquid */}
                         <div className="w-full h-full bg-gradient-to-t from-orange-700 via-orange-500 to-yellow-400 opacity-90 animate-[pulse_3s_infinite]"></div>
                         {/* Specular Highlight */}
                         <div className="absolute top-2 left-2 w-3 h-2 bg-yellow-100 rounded-full blur-[2px] opacity-40"></div>
                    </div>
                </div>
                
                <div className="flex flex-col items-center mt-2">
                    <div className="text-orange-400 font-serif text-sm mb-1 tracking-wide">Estus Flask</div>
                    <div className="text-gray-500 text-[9px] text-center leading-tight">Heal 1 HP (3 charges)</div>
                </div>
                
                <div className="h-6 flex items-center justify-center w-full mt-1">
                    {estusUnlocked ? (
                        <div className="text-[10px] text-green-600 font-bold uppercase tracking-widest">Owned</div>
                    ) : (
                        <button 
                            onClick={() => {
                                if (score >= ESTUS_PRICE) {
                                    setScore(prev => prev - ESTUS_PRICE);
                                    setEstusUnlocked(true);
                                }
                            }}
                            disabled={score < ESTUS_PRICE}
                            className={`text-[10px] px-2 py-1 border transition-all duration-300 w-full ${
                                score >= ESTUS_PRICE 
                                ? 'bg-gray-800 hover:bg-orange-900 text-gray-300 border-gray-600 hover:border-orange-500 cursor-pointer' 
                                : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed opacity-50'
                            }`}
                        >
                            Buy ({ESTUS_PRICE})
                        </button>
                    )}
                </div>
             </div>
          </div>

          <button
            onClick={() => setGameState(isGameInProgress ? GameState.PLAYING : GameState.MENU)}
            className="group relative px-10 py-3 bg-transparent hover:bg-gray-900 text-gray-400 font-serif text-sm border border-gray-800 hover:border-gray-500 transition-all duration-300 w-full max-w-xs"
          >
             <span className="absolute inset-0 w-full h-full bg-gray-800/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></span>
             <span className="relative tracking-widest uppercase">Leave</span>
          </button>
        </div>
      )}

      {/* Game Over - Souls Style */}
      {gameState === GameState.GAME_OVER && (
        <div className="bg-black/80 w-full h-full flex flex-col items-center justify-center pointer-events-auto animate-in fade-in duration-1000">
          <h2 className="text-6xl md:text-8xl text-red-900 font-serif tracking-widest mb-4 uppercase drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] scale-y-110">
            YOU DIED
          </h2>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-red-900 to-transparent mb-8 opacity-50"></div>
          <p className="text-gray-500 text-lg mb-8 font-serif">Soul Memory: {score}</p>
          
          <div className="flex flex-col gap-4 items-center">
             <div className="text-xs text-gray-600 tracking-widest uppercase animate-pulse mb-2">
                Press [SPACE] or [ENTER] to Restart
             </div>

             <button
               onClick={startGame}
               className="px-8 py-2 text-gray-400 hover:text-white hover:bg-white/5 border-t border-b border-transparent hover:border-gray-600 transition-all duration-300 font-serif tracking-widest uppercase text-sm"
             >
               Try Again
             </button>
             <button
                onClick={() => setGameState(GameState.MENU)}
                className="px-8 py-2 text-gray-600 hover:text-gray-400 font-serif tracking-widest uppercase text-xs"
              >
                Return to Menu
              </button>
          </div>
        </div>
      )}

      {/* Victory - Souls Style */}
      {gameState === GameState.VICTORY && (
        <div className="bg-black/80 w-full h-full flex flex-col items-center justify-center pointer-events-auto animate-in fade-in duration-1000">
          <h2 className="text-5xl md:text-7xl text-yellow-600/80 font-serif tracking-widest mb-4 uppercase drop-shadow-lg font-light">
            VICTORY ACHIEVED
          </h2>
          <div className="w-64 h-px bg-yellow-900/50 mb-8"></div>
          
          <div className="flex flex-col gap-4 items-center">
             {level < 2 ? (
                <button
                    onClick={() => {
                        setLevel(level + 1);
                        startGame();
                    }}
                    className="px-10 py-3 bg-gray-900 hover:bg-gray-800 text-yellow-500/80 border border-gray-800 hover:border-yellow-900/50 transition-all duration-300 font-serif text-lg tracking-widest uppercase shadow-lg"
                >
                    Next Level
                </button>
             ) : (
                <div className="text-gray-400 font-serif italic mb-2">Journey Complete</div>
             )}
             
             <button
               onClick={() => setGameState(GameState.MENU)}
               className="px-8 py-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all duration-300 font-serif tracking-widest uppercase text-sm"
             >
               Return to Menu
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;