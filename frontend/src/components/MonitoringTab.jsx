import React from 'react';
import MetricCard from './MetricCard';
import { GRAFANA_URL, MONO } from '../config';

const openGrafanaBtnStyle = { fontFamily: MONO, fontSize: '13px', fontWeight: 700, color: '#08090a', backgroundColor: '#3ecf8e', border: 'none', padding: '11px 20px', borderRadius: '9px', cursor: 'pointer' };
const sectionLabelStyle = { fontSize: '11px', fontFamily: MONO, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#a1a1aa', fontWeight: 500, margin: '0 0 8px 0' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '18px' };

// Values are placeholders until the backend exposes real runtime metrics on this
// deployment's /runtime response — each card safely shows "—" rather than mock numbers.
export default function MonitoringTab({ metrics }) {
  const m = metrics || {};
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => window.open(GRAFANA_URL, '_blank', 'noopener,noreferrer')} style={openGrafanaBtnStyle}>
          Open Grafana Dashboard
        </button>
      </div>

      <div style={sectionLabelStyle}>Resource Usage</div>
      <div style={gridStyle}>
        <MetricCard label="CPU Usage" value={m.cpu} accent="#3ecf8e" />
        <MetricCard label="Memory Usage" value={m.memory} accent="#38bdf8" />
        <MetricCard label="Memory %" value={m.memoryPercent} accent="#38bdf8" />
        <MetricCard label="PIDs" value={m.pids} accent="#71717a" />
      </div>

      <div style={sectionLabelStyle}>Network</div>
      <div style={gridStyle}>
        <MetricCard label="Network RX" value={m.networkRx} accent="#a78bfa" />
        <MetricCard label="Network TX" value={m.networkTx} accent="#a78bfa" />
      </div>

      <div style={sectionLabelStyle}>Disk</div>
      <div style={gridStyle}>
        <MetricCard label="Disk Read" value={m.diskRead} accent="#fb923c" />
        <MetricCard label="Disk Write" value={m.diskWrite} accent="#fb923c" />
      </div>

      <div style={sectionLabelStyle}>Health</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
        <MetricCard label="Uptime" value={m.uptime} accent="#71717a" />
        <MetricCard label="Status" value={m.status} accent="#3ecf8e" />
        <MetricCard label="Health" value={m.health} accent="#3ecf8e" />
        <MetricCard label="Restart Count" value={m.restartCount} accent="#facc15" />
      </div>
    </div>
  );
}
