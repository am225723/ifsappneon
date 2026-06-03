import { useRef } from 'react';
import SelfEnergyZones from './SelfEnergyZones';
import PartNode from './PartNode';
import PartRelationshipLines from './PartRelationshipLines';

export function pointerToSvgPoint(event, svgElement) {
  const point = svgElement.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const transformed = point.matrixTransform(svgElement.getScreenCTM().inverse());
  return {
    x: Math.min(94, Math.max(6, transformed.x)),
    y: Math.min(94, Math.max(6, transformed.y))
  };
}

export default function InnerSystemMapCanvas({ parts = [], relationships = [], selectedPartId, onSelectPart, onPointerDown, onPointerMove, onPointerUp, label = 'Inner System Map' }) {
  const svgRef = useRef(null);
  const partsById = new Map(parts.map((part) => [String(part.id), part]));

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      onPointerMove={(event) => onPointerMove?.(event, svgRef.current)}
      onPointerUp={(event) => onPointerUp?.(event, svgRef.current)}
      onPointerLeave={(event) => onPointerUp?.(event, svgRef.current)}
      className="w-full h-[480px] rounded-2xl bg-gradient-to-br from-brand-stone-50 to-brand-emerald-50 dark:from-slate-900 dark:to-slate-800 touch-none"
      role="img"
      aria-label={label}
    >
      <SelfEnergyZones />
      <PartRelationshipLines relationships={relationships} partsById={partsById} />
      {parts.map((part) => (
        <PartNode key={part.id} part={part} selected={String(part.id) === String(selectedPartId)} onSelect={onSelectPart} onPointerDown={onPointerDown} />
      ))}
    </svg>
  );
}
