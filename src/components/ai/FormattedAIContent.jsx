import React from 'react';

function renderInline(text) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export default function FormattedAIContent({ content = '', className = '' }) {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let list = null;

  const flushList = () => {
    if (!list) return;
    const Tag = list.type === 'ol' ? 'ol' : 'ul';
    blocks.push(<Tag key={`list-${blocks.length}`} className={`${list.type === 'ol' ? 'list-decimal' : 'list-disc'} space-y-1 pl-5`}>{list.items}</Tag>);
    list = null;
  };

  lines.forEach((raw, lineIndex) => {
    const line = raw.trim();
    if (!line) { flushList(); return; }
    const numbered = line.match(/^\d+[.)]\s+(.+)/);
    const bullet = line.match(/^[-*•]\s+(.+)/);
    if (numbered || bullet) {
      const type = numbered ? 'ol' : 'ul';
      if (!list || list.type !== type) { flushList(); list = { type, items: [] }; }
      list.items.push(<li key={lineIndex}>{renderInline((numbered || bullet)[1])}</li>);
      return;
    }
    flushList();
    if (/^[A-Z][A-Za-z0-9 &/:-]{2,}:$/.test(line) || /^#{1,3}\s+/.test(line)) {
      blocks.push(<h4 key={lineIndex} className="mt-4 font-semibold text-brand-stone-900 dark:text-slate-100">{renderInline(line.replace(/^#{1,3}\s+/, '').replace(/:$/, ''))}</h4>);
    } else {
      blocks.push(<p key={lineIndex} className="leading-relaxed">{renderInline(line)}</p>);
    }
  });
  flushList();

  return <div className={`space-y-3 text-sm text-brand-stone-700 dark:text-slate-300 ${className}`}>{blocks}</div>;
}
