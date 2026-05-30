import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Shield, Brain, Sparkles, ArrowLeft, Plus, Trash2, Link2, Unlink, Save, Eye, Users, Flame, AlertTriangle, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useParts } from '../contexts/PartsContext';
import { supabase } from '../lib/supabase';
import { clientAuth } from '../lib/supabasePersonalization';

const partTypeConfig = {
  self: { color: '#F59E0B', bgClass: 'bg-amber-500', label: 'Self', icon: Sparkles },
  manager: { color: '#3B82F6', bgClass: 'bg-blue-500', label: 'Manager', icon: Shield },
  firefighter: { color: '#F97316', bgClass: 'bg-orange-500', label: 'Firefighter', icon: Flame },
  exile: { color: '#EC4899', bgClass: 'bg-pink-500', label: 'Exile', icon: Heart },
};

const connectionTypes = [
  { id: 'protects', label: 'Protects', color: '#22C55E', dash: '', icon: Shield },
  { id: 'conflicts', label: 'Conflicts', color: '#EF4444', dash: '8,4', icon: AlertTriangle },
  { id: 'polarized', label: 'Polarized', color: '#A855F7', dash: '4,4', icon: Zap },
  { id: 'allies', label: 'Allies', color: '#3B82F6', dash: '', icon: Users },
];

export default function PartsRelationshipMap() {
  const { theme, getAnimationClass } = useTheme();
  const isDark = theme.isDark;
  const { parts, updatePart } = useParts();

  const [relationships, setRelationships] = useState([]);
  const [connectMode, setConnectMode] = useState(false);
  const [selectedType, setSelectedType] = useState('protects');
  const [firstNode, setFirstNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [hoveredRel, setHoveredRel] = useState(null);
  const [saving, setSaving] = useState(false);

  const svgRef = useRef(null);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    loadRelationships();
  }, []);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveRelationships(relationships);
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [relationships]);

  const loadRelationships = async () => {
    try {
      const client = clientAuth.getCurrentClientValidated();
      if (!client) return;
      const { data, error } = await supabase
        .from('ifs_interactive_data')
        .select('data')
        .eq('client_id', client.id)
        .eq('module_id', 'parts_relationships')
        .single();
      if (!error && data?.data?.relationships) {
        setRelationships(data.data.relationships);
      }
    } catch (e) {
      console.error('Error loading relationships:', e);
    }
  };

  const saveRelationships = async (rels) => {
    try {
      const client = clientAuth.getCurrentClientValidated();
      if (!client) return;
      setSaving(true);
      await supabase
        .from('ifs_interactive_data')
        .upsert({
          client_id: client.id,
          module_id: 'parts_relationships',
          data: { relationships: rels },
          updated_at: new Date().toISOString()
        }, { onConflict: 'client_id,module_id' });
    } catch (e) {
      console.error('Error saving relationships:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleNodeClick = (part) => {
    if (connectMode) {
      if (!firstNode) {
        setFirstNode(part.id);
        setSelectedNode(part.id);
      } else if (firstNode !== part.id) {
        const exists = relationships.some(
          r => (r.from === firstNode && r.to === part.id) || (r.from === part.id && r.to === firstNode)
        );
        if (!exists) {
          setRelationships(prev => [...prev, { from: firstNode, to: part.id, type: selectedType, label: '' }]);
        }
        setFirstNode(null);
        setSelectedNode(null);
        setConnectMode(false);
      }
    } else {
      setSelectedNode(selectedNode === part.id ? null : part.id);
    }
  };

  const handleMouseDown = (e, partId) => {
    if (connectMode) return;
    e.stopPropagation();
    setDraggingNode(partId);
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggingNode || !svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
    updatePart(draggingNode, {
      x: Math.max(40, Math.min(760, svgP.x)),
      y: Math.max(40, Math.min(560, svgP.y))
    });
  }, [draggingNode, updatePart]);

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
  }, []);

  const deleteRelationship = (index) => {
    setRelationships(prev => prev.filter((_, i) => i !== index));
  };

  const getPartById = (id) => parts.find(p => p.id === id);
  const getConnType = (typeId) => connectionTypes.find(t => t.id === typeId) || connectionTypes[0];

  const renderConnection = (rel, index) => {
    const fromPart = getPartById(rel.from);
    const toPart = getPartById(rel.to);
    if (!fromPart || !toPart) return null;

    const connType = getConnType(rel.type);
    const midX = (fromPart.x + toPart.x) / 2;
    const midY = (fromPart.y + toPart.y) / 2;

    const dx = toPart.x - fromPart.x;
    const dy = toPart.y - fromPart.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const fromR = (fromPart.size || 60) / 2 + 2;
    const toR = (toPart.size || 60) / 2 + 2;

    const x1 = fromPart.x + (dx / len) * fromR;
    const y1 = fromPart.y + (dy / len) * fromR;
    const x2 = toPart.x - (dx / len) * toR;
    const y2 = toPart.y - (dy / len) * toR;

    const isHovered = hoveredRel === index;

    return (
      <g key={`rel-${index}`}
        onMouseEnter={() => setHoveredRel(index)}
        onMouseLeave={() => setHoveredRel(null)}
      >
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={connType.color}
          strokeWidth={isHovered ? 3 : 2}
          strokeDasharray={connType.dash}
          markerEnd={rel.type === 'protects' ? 'url(#arrowGreen)' : undefined}
          opacity={isHovered ? 1 : 0.7}
          style={{ transition: 'all 0.2s' }}
        />
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="transparent"
          strokeWidth={12}
        />
        <rect
          x={midX - 32} y={midY - 10} width={64} height={20} rx={6}
          fill={isDark ? '#1E293B' : '#FFFFFF'}
          stroke={connType.color}
          strokeWidth={1}
          opacity={0.9}
        />
        <text
          x={midX} y={midY + 4}
          textAnchor="middle"
          fontSize={10}
          fill={connType.color}
          fontWeight="600"
        >
          {connType.label}
        </text>
      </g>
    );
  };

  const renderNode = (part) => {
    const config = partTypeConfig[part.type] || partTypeConfig.exile;
    const Icon = config.icon;
    const r = (part.size || 60) / 2;
    const isSelected = selectedNode === part.id;
    const isFirst = firstNode === part.id;
    const isSelf = part.type === 'self';

    return (
      <g key={part.id}
        transform={`translate(${part.x}, ${part.y})`}
        onMouseDown={(e) => handleMouseDown(e, part.id)}
        onClick={() => handleNodeClick(part)}
        style={{ cursor: connectMode ? 'crosshair' : 'grab' }}
      >
        {(isSelected || isFirst) && (
          <circle
            r={r + 8}
            fill="none"
            stroke={isFirst ? '#22C55E' : config.color}
            strokeWidth={3}
            opacity={0.6}
          >
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
          </circle>
        )}
        <circle
          r={r}
          fill={config.color}
          stroke={isDark ? '#334155' : '#FFFFFF'}
          strokeWidth={3}
          style={{ filter: `drop-shadow(0 4px 6px ${config.color}40)`, transition: 'all 0.2s' }}
        />
        {isSelf && (
          <circle r={r + 4} fill="none" stroke={config.color} strokeWidth={1} opacity={0.3} />
        )}
        <foreignObject x={-12} y={-16} width={24} height={24}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={isSelf ? 20 : 16} color="white" />
          </div>
        </foreignObject>
        <text
          y={r + 16}
          textAnchor="middle"
          fontSize={12}
          fontWeight="600"
          fill={isDark ? '#E2E8F0' : '#1E293B'}
        >
          {part.name}
        </text>
        <rect
          x={-20} y={r + 20} width={40} height={16} rx={4}
          fill={config.color}
          opacity={0.85}
        />
        <text
          y={r + 32}
          textAnchor="middle"
          fontSize={8}
          fill="white"
          fontWeight="500"
        >
          {config.label}
        </text>
      </g>
    );
  };

  return (
    <div className={`min-h-screen ${isDark ? 'text-slate-100' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Link
          to="/parts-studio"
          className={`inline-flex items-center gap-2 ${isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} mb-4 transition-colors`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Parts Studio
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-1`}>
              Parts Relationship Map
            </h1>
            <p className={isDark ? 'text-slate-400' : 'text-gray-500'}>
              Visualize how your parts connect and relate to each other
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>Saving...</span>
            )}
            <button
              onClick={() => saveRelationships(relationships)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white transition-colors ${isDark ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'}`}
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className={`${theme.cardBg || (isDark ? 'bg-slate-800/80' : 'bg-white/80')} backdrop-blur-sm rounded-2xl shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-100'} p-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-3">
                  {Object.entries(partTypeConfig).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                      <span className={isDark ? 'text-slate-300' : 'text-gray-600'}>{cfg.label}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setConnectMode(!connectMode); setFirstNode(null); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    connectMode
                      ? 'bg-green-500 text-white shadow-md shadow-green-500/20'
                      : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {connectMode ? <Unlink className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  {connectMode ? 'Cancel' : 'Add Connection'}
                </button>
              </div>

              {connectMode && (
                <div className={`mb-3 p-3 rounded-xl border ${isDark ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-sm mb-2 ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                    {!firstNode ? 'Click the first part to connect' : 'Now click the second part'}
                  </p>
                  <div className="flex gap-2">
                    {connectionTypes.map(ct => (
                      <button
                        key={ct.id}
                        onClick={() => setSelectedType(ct.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                          selectedType === ct.id
                            ? 'text-white shadow-sm'
                            : isDark ? 'bg-slate-800 text-slate-300 border-slate-600' : 'bg-white text-gray-600 border-gray-200'
                        }`}
                        style={selectedType === ct.id ? { backgroundColor: ct.color, borderColor: ct.color } : {}}
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <svg
                ref={svgRef}
                viewBox="0 0 800 600"
                className={`w-full rounded-xl ${isDark ? 'bg-slate-900/60' : 'bg-gray-50'}`}
                style={{ minHeight: '500px' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <defs>
                  <marker id="arrowGreen" viewBox="0 0 10 10" refX="8" refY="5"
                    markerWidth={6} markerHeight={6} orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#22C55E" />
                  </marker>
                  <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke={isDark ? '#334155' : '#E5E7EB'} strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="800" height="600" fill="url(#gridPattern)" opacity={0.5} />

                {relationships.map((rel, i) => renderConnection(rel, i))}
                {parts.map(part => renderNode(part))}

                {parts.length === 0 && (
                  <text x="400" y="300" textAnchor="middle" fontSize={16}
                    fill={isDark ? '#64748B' : '#9CA3AF'}>
                    No parts yet. Add parts in the Parts Studio first.
                  </text>
                )}
              </svg>
            </div>
          </div>

          <div className="space-y-4">
            <div className={`${theme.cardBg || (isDark ? 'bg-slate-800/80' : 'bg-white/80')} backdrop-blur-sm rounded-2xl shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-100'} p-4`}>
              <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Link2 className="w-4 h-4" />
                Connections ({relationships.length})
              </h3>

              {relationships.length === 0 ? (
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  No connections yet. Use "Add Connection" to link parts together.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {relationships.map((rel, i) => {
                    const fromPart = getPartById(rel.from);
                    const toPart = getPartById(rel.to);
                    const connType = getConnType(rel.type);
                    if (!fromPart || !toPart) return null;
                    return (
                      <div key={i}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm ${isDark ? 'bg-slate-700/50' : 'bg-gray-50'}`}
                        onMouseEnter={() => setHoveredRel(i)}
                        onMouseLeave={() => setHoveredRel(null)}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: partTypeConfig[fromPart.type]?.color }} />
                          <span className="truncate text-xs">{fromPart.name}</span>
                          <span className="text-xs font-medium shrink-0" style={{ color: connType.color }}>{connType.label}</span>
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: partTypeConfig[toPart.type]?.color }} />
                          <span className="truncate text-xs">{toPart.name}</span>
                        </div>
                        <button
                          onClick={() => deleteRelationship(i)}
                          className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={`${theme.cardBg || (isDark ? 'bg-slate-800/80' : 'bg-white/80')} backdrop-blur-sm rounded-2xl shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-100'} p-4`}>
              <h3 className={`font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Eye className="w-4 h-4" />
                Legend
              </h3>
              <div className="space-y-2">
                {connectionTypes.map(ct => (
                  <div key={ct.id} className="flex items-center gap-2">
                    <svg width="32" height="12">
                      <line x1="0" y1="6" x2="32" y2="6"
                        stroke={ct.color} strokeWidth={2} strokeDasharray={ct.dash} />
                    </svg>
                    <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{ct.label}</span>
                  </div>
                ))}
              </div>
              <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                {Object.entries(partTypeConfig).map(([key, cfg]) => (
                  <div key={key} className="flex items-center gap-2 mb-1.5">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cfg.color }} />
                    <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{cfg.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedNode && (() => {
              const part = getPartById(selectedNode);
              if (!part) return null;
              const config = partTypeConfig[part.type] || partTypeConfig.exile;
              return (
                <div className={`${theme.cardBg || (isDark ? 'bg-slate-800/80' : 'bg-white/80')} backdrop-blur-sm rounded-2xl shadow-lg border ${isDark ? 'border-slate-700' : 'border-gray-100'} p-4`}>
                  <h3 className={`font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: config.color }} />
                    {part.name}
                  </h3>
                  <div className="px-2 py-1 rounded-md text-xs text-white inline-block mb-2" style={{ backgroundColor: config.color }}>
                    {config.label}
                  </div>
                  {part.role && (
                    <p className={`text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      <strong>Role:</strong> {part.role}
                    </p>
                  )}
                  {part.notes && (
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      <strong>Notes:</strong> {part.notes}
                    </p>
                  )}
                  <div className={`mt-2 pt-2 border-t ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {relationships.filter(r => r.from === part.id || r.to === part.id).length} connection(s)
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
