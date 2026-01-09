import React from 'react';

const TimeframeSelector = ({ current, onSelect }) => {
  const timeframes = ['1H', '4H', '1D', '1W'];

  return (
    <div className="flex space-x-2 bg-black p-1 rounded border border-gray-800">
      {timeframes.map((tf) => (
        <button
          key={tf}
          onClick={() => onSelect(tf)}
          className={`
            px-3 py-1 text-xs font-mono rounded transition-colors duration-200
            ${current === tf
              ? 'bg-green-500 text-black font-bold shadow-[0_0_10px_rgba(34,197,94,0.5)]'
              : 'text-gray-400 hover:text-green-400 hover:bg-gray-900'}
          `}
        >
          {tf}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;
