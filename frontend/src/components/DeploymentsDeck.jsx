import React, { useState } from 'react';

export default function DeploymentsDeck() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleTriggerDeploy = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/deploy/one-click', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setHistory((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.error("Pipeline failure:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-indigo-400">🚀 Production Deployment Deck</h2>
          <p className="text-gray-400 text-sm">One-click automation chain: Syncs changes, builds assets, and runs tests.</p>
        </div>
        <button 
          onClick={handleTriggerDeploy}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-bold transition-all shadow-md ${
            loading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white animate-pulse'
          }`}
        >
          {loading ? '⚙️ Processing Stack...' : '🚀 One-Click Deploy'}
        </button>
      </div>

      {/* --- LIVE LINKS OUTPUT GRID --- */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-md font-semibold text-gray-300 mb-4">🌐 Active Production Instances</h3>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-lg">
            No production pipelines triggered yet. Click the button above to begin.
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((site) => (
              <div key={site.deploymentId} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gray-950 rounded-lg border border-gray-800 hover:border-indigo-500/50 transition-colors">
                <div>
                  <span className="text-xs font-mono px-2 py-1 bg-gray-800 text-indigo-300 rounded">ID: {site.deploymentId}</span>
                  <p className="text-xs text-gray-500 mt-1">Deployed on: {new Date(site.timestamp).toLocaleTimeString()}</p>
                </div>
                <a 
                  href={site.previewUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-3 md:mt-0 text-sm font-semibold text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                >
                  <span>Open Live Project Link</span> 🚀
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}