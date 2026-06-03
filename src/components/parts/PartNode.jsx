import { PART_TYPE_STYLES } from './mapConstants';

export default function PartNode({ part, selected, onSelect, onPointerDown }) {
  const style = PART_TYPE_STYLES[part.displayType] || PART_TYPE_STYLES.unknown;
  return (
    <g role="button" tabIndex="0" onClick={() => onSelect?.(part.id)} onPointerDown={(event) => onPointerDown?.(event, part)} className="cursor-move">
      <circle cx={part.x} cy={part.y} r={selected ? 7.5 : 6.5} fill={part.color || style.fill} stroke={selected ? '#1f5137' : style.stroke} strokeWidth={selected ? 1.1 : 0.7} />
      <text x={part.x} y={part.y + 0.7} textAnchor="middle" className="fill-stone-900 text-[2.8px] font-semibold pointer-events-none">{part.displayName.slice(0, 16)}</text>
      <text x={part.x} y={part.y + 4.2} textAnchor="middle" className="fill-stone-600 text-[2px] pointer-events-none">{part.displayType}</text>
    </g>
  );
}
