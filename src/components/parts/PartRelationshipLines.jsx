import { relationshipLabel } from './mapConstants';

export default function PartRelationshipLines({ relationships = [], partsById }) {
  return relationships.map((relationship) => {
    const from = partsById.get(String(relationship.from_part_id || relationship.fromPartId || relationship.from));
    const to = partsById.get(String(relationship.to_part_id || relationship.toPartId || relationship.to));
    if (!from || !to) return null;
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const type = relationship.relationship_type || relationship.relationshipType || relationship.type;
    return (
      <g key={relationship.id || `${from.id}-${to.id}-${type}`} className="pointer-events-none">
        <path d={`M ${from.x} ${from.y} Q ${midX} ${midY - 5} ${to.x} ${to.y}`} fill="none" stroke="#7f9f8f" strokeWidth="0.65" strokeLinecap="round" opacity="0.75" />
        <text x={midX} y={midY - 3.5} textAnchor="middle" className="fill-emerald-800 text-[2px]">
          {relationship.label || relationshipLabel(type)}
        </text>
      </g>
    );
  });
}
