export const SECTION_STYLES = `
.da-section { padding: 28px 32px; max-width: 1380px; margin: 0 auto; color: var(--fg, #e6e6e6); }
.da-header { margin-bottom: 24px; }
.da-header h1 { margin: 0 0 6px; font-size: 30px; letter-spacing: -0.02em; }
.da-header p { margin: 0; opacity: .72; font-size: 14px; }
.da-greeting { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; opacity: .6; margin-bottom: 4px; }
.da-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 24px; }
.da-card { padding: 16px 18px; border: 1px solid var(--border, rgba(255,255,255,.1)); border-radius: 12px; background: var(--surface, rgba(255,255,255,.04)); transition: transform .15s ease, box-shadow .15s ease; }
.da-card:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,.18); }
.da-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; opacity: .65; display:flex; align-items:center; gap:6px; }
.da-card .value { font-size: 28px; font-weight: 700; margin-top: 10px; letter-spacing: -0.02em; }
.da-card .sub { margin-top: 6px; font-size: 12px; opacity: .65; }
.da-panel { margin-bottom: 24px; padding: 20px; border: 1px solid var(--border, rgba(255,255,255,.1)); border-radius: 14px; background: var(--surface, rgba(255,255,255,.03)); }
.da-panel h3 { margin: 0 0 4px; font-size: 16px; }
.da-panel .sub { font-size: 12px; opacity: .6; margin-bottom: 14px; }
.da-two { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
@media (max-width: 900px){ .da-two { grid-template-columns: 1fr; } }
.da-heatmap { display: grid; grid-template-columns: repeat(53, 1fr); gap: 3px; max-width: 100%; }
.da-heatmap-cell { aspect-ratio: 1 / 1; border-radius: 2px; background: rgba(255,255,255,.06); }
.da-heatmap-cell.l1 { background: rgba(34,197,94,.25); }
.da-heatmap-cell.l2 { background: rgba(34,197,94,.45); }
.da-heatmap-cell.l3 { background: rgba(34,197,94,.65); }
.da-heatmap-cell.l4 { background: rgba(34,197,94,.85); }
.da-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.da-bar-label { width: 120px; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.da-bar-track { flex: 1; height: 10px; border-radius: 5px; background: rgba(255,255,255,.08); overflow: hidden; }
.da-bar-fill { height: 100%; border-radius: 5px; background: linear-gradient(90deg, #6ea8fe, #247bbf); }
.da-pie-wrap { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.da-pie { width: 160px; height: 160px; border-radius: 50%; position: relative; }
.da-legend { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.da-legend span { display: flex; align-items: center; gap: 8px; }
.da-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.da-timeline { display: flex; align-items: end; gap: 4px; min-height: 140px; overflow-x: auto; padding: 6px 0; }
.da-bar-wrap { display: flex; flex-direction: column; align-items: center; min-width: 20px; }
.da-bar { width: 14px; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, #6ea8fe, #247bbf); }
.da-bar-label { font-size: 9px; margin-top: 4px; }
.da-empty { opacity: .65; padding: 12px 0; }
.da-insights { display: flex; flex-direction: column; gap: 8px; }
.da-insight { padding: 10px 12px; border-left: 3px solid #6ea8fe; background: rgba(255,255,255,.03); border-radius: 6px; font-size: 13px; }
.da-monospace { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
`