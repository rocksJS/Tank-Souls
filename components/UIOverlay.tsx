import React, { useEffect, useState } from 'react';
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
  setUnlockedLevel?: React.Dispatch<React.SetStateAction<number>>;
  isGameInProgress: boolean;
  deathCount: number;
  estusUnlocked: boolean;
  setEstusUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
  boneUnlocked: boolean;
  setBoneUnlocked: React.Dispatch<React.SetStateAction<boolean>>;
  resetProgress?: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
    gameState, setGameState, score, setScore, enemiesLeft, startGame, resumeGame, level, setLevel, unlockedLevel, setUnlockedLevel, isGameInProgress, deathCount,
    estusUnlocked, setEstusUnlocked, boneUnlocked, setBoneUnlocked, resetProgress
}) => {
  
  const [inputLocked, setInputLocked] = useState(false);
  const [gameOverSelection, setGameOverSelection] = useState<0 | 1>(0); // 0: Try Again, 1: Menu

  // Manage Input Lockout on Death
  useEffect(() => {
    if (gameState === GameState.GAME_OVER) {
        setInputLocked(true);
        setGameOverSelection(0); // Reset selection
        const timer = setTimeout(() => {
            setInputLocked(false);
        }, 500); // 0.5s delay before allowing restart
        return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Keyboard listener for quick restart and start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (gameState === GameState.MENU) {
            if (e.code === 'ArrowLeft') {
                const newLevel = Math.max(1, level - 1);
                if (newLevel <= unlockedLevel) setLevel(newLevel);
            } else if (e.code === 'ArrowRight') {
                const newLevel = Math.min(4, level + 1); // Allow up to level 4
                if (newLevel <= unlockedLevel) setLevel(newLevel);
            }
        }

        if (gameState === GameState.GAME_OVER) {
            if (e.code === 'ArrowUp' || e.code === 'KeyW') setGameOverSelection(0);
            if (e.code === 'ArrowDown' || e.code === 'KeyS') setGameOverSelection(1);
        }

        if (e.code === 'Space' || e.code === 'Enter') {
            if (gameState === GameState.GAME_OVER) {
                if (!inputLocked) {
                    if (gameOverSelection === 0) startGame();
                    else setGameState(GameState.MENU);
                }
            } else if (gameState === GameState.MENU) {
                if (isGameInProgress) {
                    resumeGame();
                } else {
                    startGame();
                }
            }
        }
        
        // Escape Logic
        if (e.code === 'Escape') {
            if (gameState === GameState.SHOP) {
                setGameState(isGameInProgress ? GameState.PLAYING : GameState.MENU);
            } else if (gameState === GameState.PLAYING) {
                setGameState(GameState.MENU);
            } else if (gameState === GameState.MENU && isGameInProgress) {
                resumeGame();
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, startGame, level, setLevel, isGameInProgress, setGameState, unlockedLevel, resumeGame, inputLocked, gameOverSelection]);

  const isBoneActive = boneUnlocked && unlockedLevel >= 4; // Max unlocked needed for infinite
  const ESTUS_PRICE = isBoneActive ? 0 : 20; 
  const DARKSIGN_PRICE = 999;

  // Helper to render level buttons
  const renderLevelButton = (lvlIdx: number, roman: string) => {
    const isUnlocked = lvlIdx <= unlockedLevel;
    const isCompleted = lvlIdx < unlockedLevel;
    const isSelected = level === lvlIdx;

    // Use consistent sizing and alignment
    let baseClasses = "text-lg transition-all duration-300 relative w-12 h-12 flex items-center justify-center ";
    
    if (!isUnlocked) {
        // LOCKED
        return (
            <div className={`${baseClasses} text-gray-600 cursor-not-allowed`}>
                <span className="opacity-50">{roman}</span>
            </div>
        );
    }

    if (isCompleted) {
        // COMPLETED
        return (
            <button 
                onClick={() => setLevel(lvlIdx)}
                className={`${baseClasses} group`}
            >
                <span className={`text-yellow-600 drop-shadow-[0_0_5px_rgba(218,165,32,0.3)] transition-all duration-300 ${isSelected ? 'font-bold text-yellow-400 drop-shadow-[0_0_8px_rgba(218,165,32,0.6)] scale-110' : ''}`}>
                    {roman}
                </span>
            </button>
        );
    }

    // CURRENT / PLAYED (Available but not finished next tier)
    return (
        <button 
            onClick={() => setLevel(lvlIdx)}
            className={`${baseClasses}`}
        >
            <span className={`transition-all duration-300 ${isSelected ? 'text-gray-100 font-bold scale-110 drop-shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>
                {roman}
            </span>
        </button>
    );
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col items-center justify-center font-serif">
      
      {/* Main Menu - Tank Souls Style */}
      {gameState === GameState.MENU && (
        <>
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
          <div className="mb-4 flex gap-4 justify-center items-center h-20">
             {renderLevelButton(1, 'I')}
             {renderLevelButton(2, 'II')}
             {renderLevelButton(3, 'III')}
             {renderLevelButton(4, 'IV')}
          </div>

          <button
            onClick={startGame}
            className="group relative px-10 py-3 bg-transparent hover:bg-gray-900 text-gray-300 font-serif text-xl border border-gray-600 hover:border-gray-400 transition-all duration-500 ease-in-out w-full max-w-xs mt-8 mb-2"
          >
            <span className="absolute inset-0 w-full h-full bg-gray-800/20 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></span>
            <span className="relative tracking-widest uppercase">Begin Journey</span>
          </button>
          
          {isGameInProgress && (
              <button
                onClick={resumeGame}
                className="group relative px-10 py-3 bg-transparent hover:bg-gray-900 text-gray-400 font-serif text-lg border border-gray-800 hover:border-gray-500 transition-all duration-500 ease-in-out w-full max-w-xs mt-4"
              >
                <span className="absolute inset-0 w-full h-full bg-gray-800/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></span>
                <span className="relative tracking-widest uppercase">Resume</span>
              </button>
          )}
        </div>
        
        <div className="text-xs text-gray-500 tracking-widest uppercase animate-pulse mt-8 pointer-events-auto">
            Press [SPACE] to {isGameInProgress ? 'Resume' : 'Start'}
        </div>
        </>
      )}

      {/* Shop - Souls Style */}
      {gameState === GameState.SHOP && (
        <div className="bg-black/95 p-12 border border-gray-700 shadow-[0_0_60px_rgba(0,0,0,0.9)] text-center pointer-events-auto max-w-2xl w-full relative overflow-hidden flex flex-col items-center">
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
          <div className="border border-gray-800 bg-black/50 p-6 w-full mb-8 min-h-[120px] flex flex-wrap items-center justify-center gap-4 relative">
             <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gray-700"></div>
             <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-gray-700"></div>
             <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-gray-700"></div>
             <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gray-700"></div>
             
             {/* ITEM 1: Estus Flask */}
             <div className="flex flex-col items-center p-4 border border-gray-800 hover:border-orange-900/50 bg-gray-900/30 transition-colors w-32 h-48 justify-between shrink-0">
                <div className="w-12 h-16 relative flex justify-center items-end shrink-0 drop-shadow-[0_0_5px_rgba(255,165,0,0.5)]">
                    <div className="absolute top-0 w-4 h-8 bg-yellow-900/30 border-2 border-yellow-700 rounded-t-sm z-10 overflow-hidden"><div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-orange-500 to-yellow-500 opacity-80 animate-pulse"></div></div>
                    <div className="absolute top-[-2px] w-6 h-2 bg-yellow-800 rounded-full border border-yellow-600 z-20 shadow-md"></div>
                    <div className="w-10 h-10 bg-yellow-900/30 border-2 border-yellow-700 rounded-full relative overflow-hidden z-10 shadow-inner"><div className="w-full h-full bg-gradient-to-t from-orange-700 via-orange-500 to-yellow-400 opacity-90 animate-[pulse_3s_infinite]"></div><div className="absolute top-2 left-2 w-3 h-2 bg-yellow-100 rounded-full blur-[2px] opacity-40"></div></div>
                </div>
                <div className="flex flex-col items-center mt-2">
                    <div className="text-orange-400 font-serif text-xs mb-1 tracking-wide">Estus Flask</div>
                    <div className="text-gray-500 text-[8px] text-center leading-tight">
                        {isBoneActive ? 'Infinite healing...' : 'Heal (3 Charges)'}
                    </div>
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
                            className={`text-[10px] px-2 py-1 border transition-all duration-300 w-full ${score >= ESTUS_PRICE ? 'bg-gray-800 hover:bg-orange-900 text-gray-300 border-gray-600 hover:border-orange-500 cursor-pointer' : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed opacity-50'}`}
                        >
                            Buy ({ESTUS_PRICE})
                        </button>
                    )}
                </div>
             </div>

             {/* ITEM 2: Bone (Level Unlock) */}
             <div className="flex flex-col items-center p-4 border border-gray-800 hover:border-gray-200/50 bg-gray-900/30 transition-colors w-32 h-48 justify-between shrink-0">
                <div className="w-12 h-16 relative flex justify-center items-center shrink-0 drop-shadow-[0_0_5px_rgba(200,200,200,0.5)]">
                   {/* Bone Graphic */}
                   <svg viewBox="0 0 24 24" className="w-10 h-10 fill-gray-300 opacity-80 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                      <path d="M17.8 4.8c-.8 0-1.6.4-2.1 1l-6.2 7-6.2-7c-.5-.6-1.3-1-2.1-1C.5 4.8 0 5.4 0 6.1s.5 1.4 1.2 1.4c.1 0 .3 0 .4-.1l6.1 6.9-6.1 6.9c-.1-.1-.3-.1-.4-.1-.7 0-1.2.6-1.2 1.4s.5 1.3 1.2 1.3c.8 0 1.6-.4 2.1-1l6.2-7 6.2 7c.5.6 1.3 1 2.1 1 .7 0 1.2-.6 1.2-1.3 0-.7-.5-1.4-1.2-1.4-.1 0-.3 0-.4.1l-6.1-6.9 6.1-6.9c.1.1.3.1.4.1.7 0 1.2-.6 1.2-1.4s-.5-1.3-1.2-1.3z" transform="rotate(45, 12, 12)"/>
                   </svg>
                </div>
                
                <div className="flex flex-col items-center mt-2">
                    <div className="text-gray-300 font-serif text-xs mb-1 tracking-wide">Bone</div>
                    <div className="text-gray-500 text-[8px] text-center leading-tight">Unlock all levels & Infinite Estus</div>
                </div>
                
                <div className="h-6 flex items-center justify-center w-full mt-1">
                    {boneUnlocked ? (
                         // 3-State Logic: Bought -> Toggle Switch
                         // Square NES Toggle
                         <div 
                            onClick={() => {
                                // Toggle behavior: If >=4 (ON) -> Set to 1 (OFF). If <4 (OFF) -> Set to 4 (ON).
                                if (unlockedLevel >= 4) {
                                    if (setUnlockedLevel) setUnlockedLevel(1); // Lock levels back to 1
                                } else {
                                    if (setUnlockedLevel) setUnlockedLevel(4); // Unlock all
                                }
                            }}
                            className={`w-12 h-6 border-2 relative cursor-pointer transition-colors duration-200 flex items-center p-1 ${
                                unlockedLevel >= 4 
                                ? 'bg-[#003300] border-[#006600]' // Dark Green ON
                                : 'bg-[#2a1a1a] border-[#880000]' // Dark Gray-Red OFF
                            }`}
                         >
                            {/* Knob */}
                            <div className={`w-3 h-3 border border-black shadow-sm transition-all duration-200 absolute ${
                                unlockedLevel >= 4
                                ? 'right-1 bg-[#00ff00]' // Bright Green Knob
                                : 'left-1 bg-[#880000]'   // Red Knob
                            }`}></div>
                         </div>
                    ) : (
                         // Not Bought State
                         <button 
                            onClick={() => {
                                setBoneUnlocked(true);
                                if (setUnlockedLevel) setUnlockedLevel(4); // Immediately unlock levels (Toggle ON)
                            }}
                            className="text-[10px] px-2 py-1 border transition-all duration-300 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-400 cursor-pointer"
                        >
                            Buy (0)
                        </button>
                    )}
                </div>
             </div>

             {/* ITEM 3: Darksign (Reset) */}
             <div className="flex flex-col items-center p-4 border border-gray-800 hover:border-red-900/50 bg-gray-900/30 transition-colors w-32 h-48 justify-between shrink-0">
                <div className="w-12 h-16 relative flex justify-center items-center shrink-0 drop-shadow-[0_0_10px_rgba(0,0,0,1)]">
                    {/* Dark Ring */}
                    <div className="w-10 h-10 border-4 border-gray-800 rounded-full shadow-[inset_0_0_10px_#000] relative bg-black">
                         <div className="absolute inset-0 rounded-full border border-red-900/30 opacity-50 animate-pulse"></div>
                         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black to-transparent rounded-full"></div>
                    </div>
                    {/* Fire effect around ring */}
                    <div className="absolute w-12 h-12 rounded-full border border-red-900/20 animate-[spin_10s_linear_infinite]"></div>
                </div>
                
                <div className="flex flex-col items-center mt-2">
                    <div className="text-gray-400 font-serif text-xs mb-1 tracking-wide">Darksign</div>
                    <div className="text-red-900/70 text-[8px] text-center leading-tight">Return to nothingness</div>
                </div>
                
                <div className="h-6 flex items-center justify-center w-full mt-1">
                     <button 
                        onClick={() => {
                            if (score >= DARKSIGN_PRICE) {
                                if (resetProgress && window.confirm("Abandon all hope? (This will reset ALL progress)")) {
                                    resetProgress();
                                }
                            }
                        }}
                        disabled={score < DARKSIGN_PRICE}
                        className={`text-[10px] px-2 py-1 border transition-all duration-300 w-full ${score >= DARKSIGN_PRICE ? 'bg-gray-950 hover:bg-red-950 text-gray-500 hover:text-red-500 border-gray-800 hover:border-red-900 cursor-pointer' : 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed opacity-50'}`}
                    >
                        Buy ({DARKSIGN_PRICE})
                    </button>
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
          
          <div className={`flex flex-col gap-4 items-center transition-opacity duration-500 ${inputLocked ? 'opacity-0' : 'opacity-100'}`}>
             <button
               onClick={() => { if(!inputLocked) startGame() }}
               className={`px-8 py-2 border-t border-b border-transparent transition-all duration-300 font-serif tracking-widest uppercase text-sm flex items-center gap-2 ${
                   gameOverSelection === 0 ? 'text-white border-gray-600 bg-white/5 scale-110' : 'text-gray-400 hover:text-white'
               }`}
             >
               Try Again
             </button>
             <button
                onClick={() => setGameState(GameState.MENU)}
                className={`px-8 py-2 font-serif tracking-widest uppercase text-xs flex items-center gap-2 ${
                   gameOverSelection === 1 ? 'text-white scale-110' : 'text-gray-600 hover:text-gray-400'
               }`}
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
             {level < 4 ? (
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