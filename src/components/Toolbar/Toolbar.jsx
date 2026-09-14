import { Hand, Type, PenTool, Square, Circle, Minus, Highlighter, Undo2 } from 'lucide-react';
import './Toolbar.css';

const tools = [
  { id: 'hand',      icon: <Hand size={20} />,        label: 'Navegar',   group: null },
  { id: 'text',      icon: <Type size={20} />,         label: 'Texto',     group: 'anotación' },
  { id: 'freehand',  icon: <PenTool size={20} />,      label: 'Dibujo libre', group: 'anotación' },
  { id: 'highlight', icon: <Highlighter size={20} />,  label: 'Resaltar',  group: 'anotación' },
  { id: 'rect',      icon: <Square size={20} />,       label: 'Rectángulo',group: 'formas' },
  { id: 'circle',    icon: <Circle size={20} />,       label: 'Círculo',   group: 'formas' },
  { id: 'line',      icon: <Minus size={20} />,        label: 'Línea',     group: 'formas' },
];

const COLORS = [
  '#ff0000', '#ff6600', '#ffcc00',
  '#00ff88', '#00ccff', '#9900ff',
  '#ffffff', '#888888', '#000000',
];

const FONT_SIZES = [10, 12, 14, 16, 18, 24, 32, 48];
const LINE_WIDTHS = [1, 2, 3, 5, 8, 12];

export default function Toolbar({ tool, setTool, toolOptions, setToolOptions, onUndo, canUndo }) {
  const groups = [...new Set(tools.map(t => t.group))];

  return (
    <aside className="toolbar" id="editor-toolbar" role="toolbar" aria-label="Herramientas de edición">
      {/* Tool Groups */}
      {groups.map((group, gi) => (
        <div key={gi} className="toolbar__group">
          {group && <div className="toolbar__group-label">{group.toUpperCase()}</div>}
          {tools
            .filter(t => t.group === group)
            .map(t => (
              <button
                key={t.id}
                className={`toolbar__tool ${tool === t.id ? 'toolbar__tool--active' : ''}`}
                onClick={() => setTool(t.id)}
                title={t.label}
                id={`tool-btn-${t.id}`}
              >
                {t.icon}
                <span className="toolbar__tool-label">{t.label}</span>
              </button>
            ))}
        </div>
      ))}

      {/* Separator */}
      <div className="toolbar__separator" />

      {/* Color picker */}
      <div className="toolbar__group">
        <div className="toolbar__group-label">COLOR</div>
        <div className="toolbar__colors" id="color-picker">
          {COLORS.map(color => (
            <button
              key={color}
              className={`toolbar__color-swatch ${toolOptions.color === color ? 'toolbar__color-swatch--active' : ''}`}
              style={{ '--c': color }}
              onClick={() => setToolOptions(o => ({ ...o, color }))}
              title={color}
              id={`color-${color.replace('#', '')}`}
            />
          ))}
          <input
            type="color"
            className="toolbar__color-custom"
            value={toolOptions.color}
            onChange={e => setToolOptions(o => ({ ...o, color: e.target.value }))}
            title="Color personalizado"
            id="custom-color-input"
          />
        </div>
      </div>

      {/* Font size (for text tool) */}
      {tool === 'text' && (
        <div className="toolbar__group">
          <div className="toolbar__group-label">TAMAÑO</div>
          <select
            className="toolbar__select"
            value={toolOptions.fontSize}
            onChange={e => setToolOptions(o => ({ ...o, fontSize: Number(e.target.value) }))}
            id="font-size-select"
          >
            {FONT_SIZES.map(s => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </div>
      )}

      {/* Line width (for drawing tools) */}
      {['freehand', 'rect', 'circle', 'line'].includes(tool) && (
        <div className="toolbar__group">
          <div className="toolbar__group-label">GROSOR</div>
          <div className="toolbar__line-widths" id="line-width-picker">
            {LINE_WIDTHS.map(w => (
              <button
                key={w}
                className={`toolbar__line-width ${toolOptions.lineWidth === w ? 'toolbar__line-width--active' : ''}`}
                onClick={() => setToolOptions(o => ({ ...o, lineWidth: w }))}
                title={`${w}px`}
                id={`line-width-${w}`}
              >
                <div style={{ height: Math.min(w, 8), width: '100%', background: 'currentColor', borderRadius: 2 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="toolbar__separator" />

      {/* Undo */}
      <div className="toolbar__group">
        <button
          className="toolbar__tool toolbar__tool--danger"
          onClick={onUndo}
          disabled={!canUndo}
          title="Deshacer última acción"
          id="undo-btn"
        >
          <Undo2 size={20} />
          <span className="toolbar__tool-label">Deshacer</span>
        </button>
      </div>
    </aside>
  );
}
