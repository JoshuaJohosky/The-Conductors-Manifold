import React from 'react';

const MetricCard = ({ label, value, unit, status }) => {
  // Color logic based on status
  let statusColor = "text-green-500"; // Default / Safe
  if (status === "WARNING") statusColor = "text-yellow-500";
  if (status === "CRITICAL") statusColor = "text-red-500 animate-pulse";

  return (
    <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg shadow-lg">
      <div className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">{label}</div>
      <div className="flex items-end">
        <span className={`text-2xl font-mono font-bold ${statusColor}`}>
          {value}
        </span>
        <span className="text-gray-500 text-xs ml-2 mb-1">{unit}</span>
      </div>
    </div>
  );
};

const MetricsPanel = ({ data }) => {
  // Safety checks if data is null during loading
  if (!data) return <div className="animate-pulse text-green-500 font-mono">CALIBRATING MANIFOLD...</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-6">
      <MetricCard
        label="Structural Curvature"
        value={data.curvature.toFixed(4)}
        unit="K"
        status={data.curvature > 5.0 ? "SAFE" : "WARNING"}
      />
      <MetricCard
        label="System Entropy"
        value={data.entropy.toFixed(5)}
        unit="S"
        status={data.entropy > 1.8 ? "CRITICAL" : "SAFE"}
      />
      <MetricCard
        label="Pylon Integrity"
        value={data.pylon_strength + "%"}
        unit="STR"
      />
      <MetricCard
        label="Manifold Phase"
        value={data.phase}
        unit=""
        status={data.phase.includes("SINGULARITY") ? "CRITICAL" : "SAFE"}
      />
    </div>
  );
};

export default MetricsPanel;
