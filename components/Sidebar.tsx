import React from 'react';
import { GameState } from '../types';

interface SidebarProps {
  enemiesLeft: number;
  score: number;
  level: number;
  setGameState: (state: GameState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ enemiesLeft, score, level, setGameState }) => {
  return (
    <div className="h-full bg-[#1a1a1a] p-4 flex flex-col items-center font-mono border-l-4 border-[#333] min-w-[200px]">
      
      {/* Enemy Icons Grid */}
      <div className="mb-8 w-full">
        <div className="grid grid-cols-2 gap-2 w-16 mx-auto">
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

      {/* Player Lives */}
      <div className="mb-8 text-gray-400 font-bold text-xl flex flex-col items-start w-full px-4">
        <div className="flex items-center mb-2">
            <span className="mr-2 text-xs">IP</span>
        </div>
        <div className="flex items-center">
            <div className="w-6 h-6 mr-2 bg-yellow-600 rounded-sm opacity-80"></div>
            <span>3</span>
        </div>
      </div>

      {/* Stage Number */}
      <div className="mb-auto text-gray-400 font-bold text-xl flex flex-col items-start w-full px-4">
         <div className="w-8 h-8 mb-2">
            {/* Flag Icon */}
            <svg viewBox="0 0 24 24" className="w-full h-full fill-gray-500">
               <path d="M4 2v20h2V14h12l-2-4 2-4H6V2z" />
            </svg>
         </div>
         <div className="flex items-center">
            <span>{level}</span>
         </div>
      </div>

      {/* Score */}
      <div className="mt-4 border-t-2 border-[#444] w-full pt-4 text-center">
          <div className="text-gray-500 text-[10px] mb-2 tracking-widest uppercase">Soul Memory</div>
          <div className="text-yellow-600 font-bold bg-black border border-[#333] px-2 py-1 rounded mb-4">{score}</div>
          
          <button 
            onClick={() => setGameState(GameState.MENU)}
            className="w-full py-2 bg-[#333] hover:bg-[#444] text-gray-300 text-[10px] uppercase font-bold tracking-wider rounded border border-[#555] transition-colors"
          >
            Main Menu
          </button>
          
          <button 
            onClick={() => setGameState(GameState.SHOP)}
            className="w-full py-2 mt-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-yellow-600/80 text-[10px] uppercase font-bold tracking-wider rounded border border-yellow-900/30 hover:border-yellow-600/50 transition-colors"
          >
            Магазин
          </button>
      </div>

    </div>
  );
};

export default Sidebar;