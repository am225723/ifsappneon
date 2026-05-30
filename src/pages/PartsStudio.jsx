import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit3, Save, X, Move, Heart, Shield, Flame, Users, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useParts } from '../contexts/PartsContext';

const partTypes = [
  { id: 'exile', name: 'Exile', color: '#EC4899', icon: Heart, description: 'Wounded parts holding pain' },
  { id: 'manager', name: 'Manager', color: '#3B82F6', icon: Shield, description: 'Protective parts preventing pain' },
  { id: 'firefighter', name: 'Firefighter', color: '#F59E0B', icon: Flame, description: 'Reactive parts numbing pain' },
  { id: 'self', name: 'Self', color: '#10B981', icon: Sparkles, description: 'Core compassionate essence' }
];

export default function PartsStudio() {
  const { theme, getAnimationClass } = useTheme();
  const { parts, addPart, updatePart, deletePart, saveToSupabase } = useParts();
  const [selectedPart, setSelectedPart] = useState(null);
  const [draggingPart, setDraggingPart] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPart, setNewPart] = useState({ name: '', type: 'exile', notes: '' });
  const canvasRef = useRef(null);

  const handleMouseDown = (e, part) => {
    setDraggingPart(part.id);
    setSelectedPart(part);
  };

  const handleMouseMove = (e) => {
    if (!draggingPart || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    updatePart(draggingPart, { x: Math.max(40, Math.min(560, x)), y: Math.max(40, Math.min(360, y)) });
  };

  const handleMouseUp = () => {
    setDraggingPart(null);
  };

  const handleAddPart = () => {
    if (!newPart.name.trim()) return;
    const part = addPart({
      type: newPart.type,
      name: newPart.name,
      notes: newPart.notes,
      role: newPart.notes
    });
    setNewPart({ name: '', type: 'exile', notes: '' });
    setShowAddModal(false);
  };

  const handleDeletePart = (id) => {
    if (id === 'self-1') return;
    deletePart(id);
    setSelectedPart(null);
  };

  const handleSave = () => {
    saveToSupabase();
  };

  const getPartType = (typeId) => partTypes.find(t => t.id === typeId) || partTypes[0];

  return (
    <div className={`min-h-screen ${theme.isDark ? 'text-slate-100' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link 
          to="/" 
          className={`inline-flex items-center gap-2 ${theme.isDark ? 'text-slate-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} mb-6 ${getAnimationClass('transition')}`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${theme.isDark ? 'text-white' : 'text-gray-900'} mb-2`}>
              Parts Visualization Studio
            </h1>
            <p className={theme.isDark ? 'text-slate-300' : 'text-gray-600'}>
              Map your internal family system. Drag parts to arrange them.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl ${theme.isDark ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white ${getAnimationClass('transition')}`}
            >
              <Save className="w-5 h-5" />
              Save
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white ${getAnimationClass('transition')} ${getAnimationClass('hover')}`}
              style={{ backgroundColor: theme.accentColor }}
            >
              <Plus className="w-5 h-5" />
              Add Part
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-4`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  {partTypes.map(type => (
                    <div key={type.id} className="flex items-center gap-1 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
                      <span className={theme.isDark ? 'text-slate-300' : 'text-gray-600'}>{type.name}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                    className={`p-1 rounded ${theme.isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm">{Math.round(zoom * 100)}%</span>
                  <button 
                    onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                    className={`p-1 rounded ${theme.isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div 
                ref={canvasRef}
                className={`relative w-full h-96 rounded-xl ${theme.isDark ? 'bg-slate-800' : 'bg-gray-50'} overflow-hidden cursor-crosshair`}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
              >
                <div className="absolute inset-0 opacity-20">
                  <svg width="100%" height="100%">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                  </svg>
                </div>

                {parts.map(part => {
                  const partType = getPartType(part.type);
                  const Icon = partType.icon;
                  const isSelected = selectedPart?.id === part.id;
                  
                  return (
                    <div
                      key={part.id}
                      className={`absolute cursor-move select-none ${getAnimationClass('transition')} ${isSelected ? 'ring-4 ring-white/50' : ''}`}
                      style={{
                        left: part.x - (part.size || 60) / 2,
                        top: part.y - (part.size || 60) / 2,
                        width: part.size || 60,
                        height: part.size || 60,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, part)}
                      onClick={() => setSelectedPart(part)}
                    >
                      <div 
                        className="w-full h-full rounded-full flex flex-col items-center justify-center shadow-lg"
                        style={{ backgroundColor: partType.color }}
                      >
                        <Icon className="w-6 h-6 text-white" />
                        <span className="text-xs text-white font-medium mt-1 text-center px-1 truncate max-w-full">
                          {part.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={`${theme.cardBg} backdrop-blur-sm rounded-2xl shadow-lg border ${theme.isDark ? 'border-slate-700' : 'border-gray-100'} p-6`}>
            {selectedPart ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${theme.isDark ? 'text-white' : 'text-gray-900'}`}>Part Details</h3>
                  {selectedPart.id !== 'self-1' && (
                    <button
                      onClick={() => handleDeletePart(selectedPart.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Name</label>
                    <input
                      type="text"
                      value={selectedPart.name}
                      onChange={(e) => {
                        updatePart(selectedPart.id, { name: e.target.value });
                        setSelectedPart(prev => ({ ...prev, name: e.target.value }));
                      }}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                    />
                  </div>

                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Type</label>
                    <div 
                      className="mt-1 px-3 py-2 rounded-lg text-white font-medium"
                      style={{ backgroundColor: getPartType(selectedPart.type).color }}
                    >
                      {getPartType(selectedPart.type).name}
                    </div>
                  </div>

                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Role</label>
                    <input
                      type="text"
                      value={selectedPart.role || ''}
                      onChange={(e) => {
                        updatePart(selectedPart.id, { role: e.target.value });
                        setSelectedPart(prev => ({ ...prev, role: e.target.value }));
                      }}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="What role does this part play?"
                    />
                  </div>

                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Notes</label>
                    <textarea
                      value={selectedPart.notes || ''}
                      onChange={(e) => {
                        updatePart(selectedPart.id, { notes: e.target.value });
                        setSelectedPart(prev => ({ ...prev, notes: e.target.value }));
                      }}
                      rows={4}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200'}`}
                      placeholder="What does this part want you to know?"
                    />
                  </div>

                  <div>
                    <label className={`text-sm ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>Size</label>
                    <input
                      type="range"
                      min="40"
                      max="100"
                      value={selectedPart.size || 60}
                      onChange={(e) => {
                        const size = parseInt(e.target.value);
                        updatePart(selectedPart.id, { size });
                        setSelectedPart(prev => ({ ...prev, size }));
                      }}
                      className="w-full mt-1"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className={`w-12 h-12 mx-auto mb-3 ${theme.isDark ? 'text-slate-500' : 'text-gray-300'}`} />
                <p className={theme.isDark ? 'text-slate-400' : 'text-gray-500'}>
                  Click on a part to view and edit its details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`${theme.cardBg} rounded-2xl shadow-xl max-w-md w-full p-6 ${theme.isDark ? 'text-white' : ''}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Add New Part</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-700'}`}>Part Name</label>
                <input
                  type="text"
                  value={newPart.name}
                  onChange={(e) => setNewPart(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'}`}
                  placeholder="e.g., The Critic, Inner Child, Protector"
                />
              </div>

              <div>
                <label className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-700'}`}>Part Type</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {partTypes.filter(t => t.id !== 'self').map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setNewPart(prev => ({ ...prev, type: type.id }))}
                        className={`p-3 rounded-xl border-2 text-left ${getAnimationClass('transition')} ${
                          newPart.type === type.id ? 'border-current' : 'border-transparent'
                        }`}
                        style={{ 
                          borderColor: newPart.type === type.id ? type.color : 'transparent',
                          backgroundColor: newPart.type === type.id ? type.color + '20' : (theme.isDark ? '#334155' : '#F9FAFB')
                        }}
                      >
                        <Icon className="w-5 h-5 mb-1" style={{ color: type.color }} />
                        <div className="font-medium text-sm">{type.name}</div>
                        <div className={`text-xs ${theme.isDark ? 'text-slate-400' : 'text-gray-500'}`}>{type.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={`text-sm font-medium ${theme.isDark ? 'text-slate-300' : 'text-gray-700'}`}>Notes (optional)</label>
                <textarea
                  value={newPart.notes}
                  onChange={(e) => setNewPart(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className={`w-full mt-1 px-3 py-2 rounded-lg border ${theme.isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-gray-200'}`}
                  placeholder="What triggers this part? What does it need?"
                />
              </div>

              <button
                onClick={handleAddPart}
                disabled={!newPart.name.trim()}
                className={`w-full py-3 rounded-xl text-white font-medium ${getAnimationClass('transition')} disabled:opacity-50`}
                style={{ backgroundColor: theme.accentColor }}
              >
                Add Part to Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
