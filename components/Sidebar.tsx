import React from 'react';
import { GameState } from '../types';

interface SidebarProps {
  enemiesLeft: number;
  score: number;
  level: number;
  setGameState: (state: GameState) => void;
  playerHp: number;
}

const Sidebar: React.FC<SidebarProps> = ({ enemiesLeft, score, level, setGameState, playerHp }) => {
  return (
    <div className="bg-[#1a1a1a] flex flex-col justify-between font-mono border-l-4 border-[#333] min-w-[200px]">
      
      {/* Top Section: Icons + HP */}
      <div className="w-full flex flex-col p-4">
        {/* Enemy Icons Grid */}
        <div className="mb-8 w-full">
          <div className="grid grid-cols-2 gap-1 w-16 mx-auto">
            {Array.from({ length: 20 }).map((_, i) => (
               <div key={i} className={`w-6 h-6 ${i < enemiesLeft ? 'opacity-100' : 'opacity-0'}`}>
                  {/* Simple Tank Icon */}
                  <svg viewBox="0 0 24 24" className="w-full h-full fill-[#888]">
                     <rect x="2" y="4" width="4" height="16" />
                     <rect x="18" y="4" width="4" height="16" />
                     <rect x="6" y="6" width="12" height="12" />
                     <rect x="10" y="2" width="4" height="10" />
                  </svg>
               </div>
            ))}
          </div>
        </div>

        {/* Player HP */}
        <div className="text-gray-400 font-bold text-xl flex flex-col items-start w-full pl-1">
          <div className="flex items-center">
              {/* Heart Icon */}
              <svg viewBox="0 0 24 24" className="w-6 h-6 mr-2 fill-red-600 drop-shadow-[0_0_5px_rgba(220,20,60,0.6)]">
                 <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span className="text-red-100">{playerHp}</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Score & Buttons - Pushed to bottom via parent justify-between */}
      <div className="w-full border-t-2 border-[#444] p-4 flex flex-col gap-3 bg-[#1a1a1a]">
          {/* Score Counter */}
          <div className="w-full text-center">
              <div className="text-gray-500 text-[10px] mb-1 tracking-widest uppercase">SOULS</div>
              <div className="text-yellow-600 font-bold bg-black border border-[#333] px-2 py-1 rounded">{score}</div>
          </div>
          
          {/* Buttons */}
          <div className="flex flex-col gap-2 w-full">
            <button 
                onClick={() => setGameState(GameState.MENU)}
                className="w-full py-2 bg-[#333] hover:bg-[#444] text-gray-300 text-[10px] uppercase font-bold tracking-wider rounded border border-[#555] transition-colors"
            >
                Main Menu
            </button>
            
            <button 
                onClick={() => setGameState(GameState.SHOP)}
                className="w-full py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-yellow-600/80 text-[10px] uppercase font-bold tracking-wider rounded border border-yellow-900/30 hover:border-yellow-600/50 transition-colors"
            >
                Магазин
            </button>
          </div>
      </div>

    </div>
  );
};

export default Sidebar;