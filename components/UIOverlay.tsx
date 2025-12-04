import React from 'react';
import { GameState } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  score: number;
  enemiesLeft: number;
  startGame: () => void;
  level: number;
  setLevel: (level: number) => void;
  unlockedLevel: number;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ gameState, score, enemiesLeft, startGame, level, setLevel, unlockedLevel }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col items-center justify-center">
      {/* HUD Removed - moved to Sidebar */}

      {/* Main Menu */}
      {gameState === GameState.MENU && (
        <div className="bg-black bg-opacity-90 p-10 border-4 border-yellow-500 rounded-lg text-center pointer-events-auto shadow-[0_0_20px_rgba(255,215,0,0.5)] z-20">
          <h1 className="text-4xl md:text-6xl text-red-500 font-bold mb-4 drop-shadow-lg tracking-widest uppercase">
            BATTLE CITY
          </h1>
          <p className="text-gray-400 mb-8 text-sm">REACT EDITION</p>
          
          {/* Level Selector */}
          <div className="mb-6 flex gap-4 justify-center">
             <button 
                onClick={() => setLevel(1)}
                className={`px-4 py-2 border-2 ${level === 1 ? 'border-yellow-400 text-yellow-400' : 'border-gray-600 text-gray-500'} font-mono text-sm uppercase`}
             >
                Level 1
             </button>
             <button 
                onClick={() => unlockedLevel >= 2 && setLevel(2)}
                disabled={unlockedLevel < 2}
                className={`px-4 py-2 border-2 ${
                    level === 2 ? 'border-yellow-400 text-yellow-400' : 
                    unlockedLevel >= 2 ? 'border-gray-600 text-gray-500 hover:text-white hover:border-white' : 'border-gray-800 text-gray-800 cursor-not-allowed'
                } font-mono text-sm uppercase relative`}
             >
                Level 2
                {unlockedLevel < 2 && (
                    <span className="absolute -top-3 -right-3 text-xs bg-red-600 text-white px-1 rounded">LOCK</span>
                )}
             </button>
          </div>

          <button
            onClick={startGame}
            className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xl rounded transition transform hover:scale-105 border-b-4 border-yellow-800 active:border-b-0 active:mt-1"
          >
            START GAME
          </button>
          <div className="mt-6 text-gray-500 text-xs font-mono">
            <p>WASD / ARROWS to Move</p>
            <p>SPACE to Shoot</p>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === GameState.GAME_OVER && (
        <div className="bg-red-900 bg-opacity-90 p-10 border-4 border-white rounded-lg text-center pointer-events-auto animate-bounce z-20">
          <h2 className="text-5xl text-white font-bold mb-6 uppercase">GAME OVER</h2>
          <p className="text-yellow-300 text-xl mb-6">FINAL SCORE: {score}</p>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-white text-red-900 font-bold text-lg rounded hover:bg-gray-200 transition"
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Victory */}
      {gameState === GameState.VICTORY && (
        <div className="bg-green-900 bg-opacity-90 p-10 border-4 border-white rounded-lg text-center pointer-events-auto z-20">
          <h2 className="text-5xl text-white font-bold mb-6 uppercase">VICTORY</h2>
          <p className="text-yellow-300 text-xl mb-6">STAGE {level} CLEARED</p>
          <button
            onClick={() => {
                // If there is a next level unlocked, maybe switch to it?
                // For now, just reset to menu creates a loop
                // Or startGame again for replay
                // Let's go to menu to choose next level
                const event = new KeyboardEvent('keydown', { code: 'Escape' }); 
                // Hacky way? No, just call a prop or reload window?
                // Let's just create a "Return to Menu" logic if we had one, but startGame restarts current level usually
                // In classic NES, it goes to next level automatically.
                // For this request, "Select levels" implies going back to menu or simple restart.
                // We'll rename the button to NEXT or MENU
                window.location.reload(); // Simple refresh for now to reset app state properly or we need a setGameState(MENU)
            }}
            className="px-6 py-3 bg-white text-green-900 font-bold text-lg rounded hover:bg-gray-200 transition hidden"
          >
            PLAY AGAIN
          </button>
          
           <div className="flex gap-4 justify-center">
             <button
               onClick={startGame}
               className="px-6 py-3 bg-white text-green-900 font-bold text-lg rounded hover:bg-gray-200 transition"
             >
               REPLAY
             </button>
             {/* If we just unlocked level 2, show button to go to menu */}
             <button
               onClick={() => window.location.reload()}
               className="px-6 py-3 bg-gray-200 text-gray-900 font-bold text-lg rounded hover:bg-white transition"
             >
               MENU
             </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;