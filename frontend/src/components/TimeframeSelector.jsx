/**
 * TimeframeSelector - Component for selecting analysis timeframe
 */

import React from 'react';
import './TimeframeSelector.css';

const TimeframeSelector = ({ selected, onChange }) => {
  const timeframes = [
    { value: 'monthly', label: 'Monthly', description: 'Macro folds & long-term impulses' },
    { value: 'weekly', label: 'Weekly', description: 'Active Ricci flows & structural adjustments' },
    { value: 'daily', label: 'Daily', description: 'Immediate flow toward attractors' },
    { value: 'intraday', label: 'Intraday', description: 'Micro-flows & vibrational echoes' }
  ];

  return (
    <div className="timeframe-selector">
      {timeframes.map(tf => (
        <button
          key={tf.value}
          className={`timeframe-btn ${selected === tf.value ? 'active' : ''}`}
          onClick={() => onChange(tf.value)}
          title={tf.description}
        >
          <div className="timeframe-label">{tf.label}</div>
          <div className="timeframe-desc">{tf.description}</div>
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;
