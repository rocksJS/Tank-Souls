import React from 'react';

interface SidebarProps {
  enemiesLeft: number;
  score: number;
  level: number;
}

const Sidebar: React.FC<SidebarProps> = ({ enemiesLeft, score, level }) => {
  // Create an array of 20 items to represent the enemy grid
  // We fill the ones that are 'left' with a specific icon, others empty or different
  // The original game counts down by removing icons.
  
  return (
    <div className="h-full bg-[#636363] p-4 flex flex-col items-center font-mono border-l-4 border-gray-700 min-w-[200px]">
      
      {/* Enemy Icons Grid */}
      <div className="mb-8 w-full">
        <div className="grid grid-cols-2 gap-2 w-16 mx-auto">
          {Array.from({ length: 20 }).map((_, i) => (
             <div key={i} className={`w-6 h-6 ${i < enemiesLeft ? 'opacity-100' : 'opacity-0'}`}>
                {/* Simple Tank Icon */}
                <svg viewBox="0 0 24 24" className="w-full h-full fill-black">
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
      <div className="mb-8 text-black font-bold text-xl flex flex-col items-start w-full px-4">
        <div className="flex items-center mb-2">
            <span className="mr-2">I</span>
            <span className="text-sm">P</span>
        </div>
        <div className="flex items-center">
            <div className="w-6 h-6 mr-2 bg-yellow-500 rounded-sm"></div>
            <span>3</span> {/* Hardcoded lives for now as state isn't tracked fully */}
        </div>
      </div>

      {/* Stage Number */}
      <div className="mb-auto text-black font-bold text-xl flex flex-col items-start w-full px-4">
         <div className="w-8 h-8 mb-2">
            {/* Flag Icon */}
            <svg viewBox="0 0 24 24" className="w-full h-full fill-black">
               <path d="M4 2v20h2V14h12l-2-4 2-4H6V2z" />
            </svg>
         </div>
         <div className="flex items-center">
            <span>{level}</span>
         </div>
      </div>

      {/* Score (Custom Addition for UX) */}
      <div className="mt-4 border-t-2 border-black w-full pt-2 text-center">
          <div className="text-black text-xs mb-1">SCORE</div>
          <div className="text-yellow-300 font-bold bg-black px-2 py-1 rounded">{score}</div>
      </div>

    </div>
  );
};

export default Sidebar;