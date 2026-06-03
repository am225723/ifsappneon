import { SELF_ENERGY_ZONES } from './mapConstants';

export default function SelfEnergyZones() {
  return (
    <>
      {SELF_ENERGY_ZONES.slice().reverse().map((zone) => (
        <circle key={zone.label} cx="50" cy="50" r={zone.radius} fill="none" stroke={zone.color} strokeWidth="0.35" strokeDasharray="1.5 1.5" />
      ))}
      {SELF_ENERGY_ZONES.map((zone, index) => (
        <text key={zone.label} x="52" y={50 - zone.radius + 2 + index * 0.5} className="fill-stone-500 text-[1.8px]">
          {zone.label}
        </text>
      ))}
      <circle cx="50" cy="50" r="10" fill="#f7e2a0" stroke="#b7791f" strokeWidth="0.6" opacity="0.96" />
      <text x="50" y="51" textAnchor="middle" className="fill-yellow-900 text-[3px] font-bold">Self-energy</text>
    </>
  );
}
