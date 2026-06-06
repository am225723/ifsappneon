import React from 'react';

function renderInline(text) {
  const source = String(text || '');
  const parts = source.split(/(\*\*[^*]+\*\*|(?<!\*)\*[^*\n]+\*(?!\*))/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function isHeading(line) {
  return /^#{1,4}\s+/.test(line) || /^[A-Z][A-Za-z0-9 &/()'’:-]{2,}:$/.test(line) || /^\*\*[^*]+\*\*$/.test(line);
}

function headingText(line) {
  return line.replace(/^#{1,4}\s+/, '').replace(/^\*\*|\*\*$/g, '').replace(/:$/, '').trim();
}

export default function FormattedAIContent({ content = '', className = '' }) {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let list = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={`p-${blocks.length}`} className="leading-relaxed">{renderInline(paragraph.join(' '))}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const Tag = list.type === 'ol' ? 'ol' : 'ul';
    blocks.push(<Tag key={`list-${blocks.length}`} className={`${list.type === 'ol' ? 'list-decimal' : 'list-disc'} my-2 space-y-2 pl-5 leading-relaxed`}>{list.items}</Tag>);
    list = null;
  };

  lines.forEach((raw, lineIndex) => {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const numbered = line.match(/^(\d+)[.)]\s+(.+)/);
    const bullet = line.match(/^[-*•]\s+(.+)/);
    if (numbered || bullet) {
      flushParagraph();
      const type = numbered ? 'ol' : 'ul';
      if (!list || list.type !== type) { flushList(); list = { type, items: [] }; }
      list.items.push(<li key={lineIndex}>{renderInline((numbered || bullet)[2] || (numbered || bullet)[1])}</li>);
      return;
    }

    if (/^>\s+/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(<blockquote key={lineIndex} className="border-l-4 border-brand-gold-300 pl-3 italic text-brand-stone-600 dark:border-brand-gold-700 dark:text-slate-300">{renderInline(line.replace(/^>\s+/, ''))}</blockquote>);
      return;
    }

    flushList();
    if (isHeading(line)) {
      flushParagraph();
      blocks.push(<h4 key={lineIndex} className="mt-4 text-sm font-semibold text-brand-stone-900 first:mt-0 dark:text-slate-100">{renderInline(headingText(line))}</h4>);
      return;
    }

    const question = /^([A-Z][^?]{5,}\?|\d+\s*[.)]\s*.+\?)$/.test(line);
    if (question) {
      flushParagraph();
      blocks.push(<p key={lineIndex} className="mt-3 leading-relaxed font-medium text-brand-stone-800 dark:text-slate-200">{renderInline(line)}</p>);
      return;
    }

    paragraph.push(line);
  });
  flushParagraph();
  flushList();

  return <div className={`space-y-3 text-sm text-brand-stone-700 dark:text-slate-300 ${className}`}>{blocks}</div>;
}
