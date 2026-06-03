export const PART_TYPE_STYLES = {
  protector: { fill: '#dfeadd', stroke: '#6f8f72', badge: 'bg-emerald-100 text-emerald-800', label: 'Protector' },
  manager: { fill: '#dcebdc', stroke: '#4f8a62', badge: 'bg-green-100 text-green-800', label: 'Manager' },
  firefighter: { fill: '#f8dfd2', stroke: '#b8643c', badge: 'bg-orange-100 text-orange-800', label: 'Firefighter' },
  exile: { fill: '#f8e9b8', stroke: '#c28a1d', badge: 'bg-amber-100 text-amber-800', label: 'Exile' },
  self: { fill: '#f7e2a0', stroke: '#b7791f', badge: 'bg-yellow-100 text-yellow-900', label: 'Self' },
  unknown: { fill: '#ece7df', stroke: '#9b9286', badge: 'bg-stone-100 text-stone-700', label: 'Not sure yet' }
};

export const SELF_ENERGY_ZONES = [
  { radius: 18, label: 'Close to Self', color: '#f8e9b8' },
  { radius: 31, label: 'Nearby', color: '#dfeadd' },
  { radius: 43, label: 'Protective edge', color: '#d7e4ee' },
  { radius: 50, label: 'Further out / needs space', color: '#ece7df' }
];

export const RELATIONSHIP_OPTIONS = [
  { id: 'close_to', label: 'Close to' },
  { id: 'protects', label: 'Protects' },
  { id: 'concerned_about', label: 'Concerned about' },
  { id: 'polarized_with', label: 'Polarized with' },
  { id: 'supports', label: 'Supports' },
  { id: 'needs_space_from', label: 'Needs space from' },
  { id: 'unknown', label: 'Not sure yet' }
];

export function relationshipLabel(type) {
  return RELATIONSHIP_OPTIONS.find((item) => item.id === type)?.label || 'Not sure yet';
}

export function normalizeMapPart(part, index = 0, localPositions = {}) {
  const type = String(part.part_type || part.type || 'unknown').toLowerCase();
  const angle = (index / 8) * Math.PI * 2;
  const local = localPositions[String(part.id)] || {};
  const x = local.x ?? part.x ?? part.x_position;
  const y = local.y ?? part.y ?? part.y_position;
  return {
    ...part,
    displayName: part.part_name || part.name || 'Unnamed part',
    displayType: PART_TYPE_STYLES[type] ? type : 'unknown',
    x: Number.isFinite(Number(x)) ? Number(x) : Math.round(50 + Math.cos(angle) * 28),
    y: Number.isFinite(Number(y)) ? Number(y) : Math.round(50 + Math.sin(angle) * 24),
    color: local.color || part.color
  };
}

export function distanceZone(part) {
  const distance = Math.hypot(Number(part.x) - 50, Number(part.y) - 50);
  return SELF_ENERGY_ZONES.find((zone) => distance <= zone.radius)?.label || 'Further out / needs space';
}
