import { createElement } from 'react';
import { Link } from 'react-router-dom';

const TONE_GRADIENTS = {
  daily: 'bg-gradient-to-br from-[#fbbf24] to-[#e11d48]',
  deep: 'bg-gradient-to-br from-[#34d399] to-[#0891b2]',
  tools: 'bg-gradient-to-br from-[#a78bfa] to-[#0ea5e9]',
  advisor: 'bg-gradient-to-br from-[#3b82f6] to-[#6366f1]'
};

const PhotoTile = ({ to, href, onClick, image, icon, title, detail, tone = 'daily', wide = false, full = false, className = '', children, ...buttonProps }) => {
  const badge = icon && (
    <span
      className={`z-10 flex shrink-0 items-center justify-center rounded-2xl border border-white/55 shadow-lg ${TONE_GRADIENTS[tone] || TONE_GRADIENTS.daily} ${
        wide ? 'h-12 w-12' : 'absolute left-3.5 top-3.5 h-[60px] w-[60px]'
      }`}
    >
      {createElement(icon, { className: wide ? 'h-6 w-6 text-white' : 'h-8 w-8 text-white', strokeWidth: 1.7 })}
    </span>
  );

  const sharedClassName = `group relative isolate block w-full text-left overflow-hidden rounded-[22px] shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl ${
    wide ? 'min-h-[108px]' : 'aspect-square'
  } ${full ? 'col-span-2' : ''} ${className}`;

  const content = (
    <>
      <img
        src={image}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/5" />

      {wide ? (
        <div className="relative z-10 flex h-full items-center gap-3.5 p-4">
          {badge}
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold leading-tight text-white drop-shadow">{title}</p>
            {detail && <p className="mt-1 line-clamp-1 text-[13px] text-white/90 drop-shadow">{detail}</p>}
          </div>
          {children}
        </div>
      ) : (
        <>
          {badge}
          <div className="absolute inset-x-0 bottom-0 z-10 p-4">
            <p className="text-xl font-extrabold leading-tight text-white drop-shadow">{title}</p>
            {detail && <p className="mt-1 line-clamp-2 text-sm text-white/90 drop-shadow">{detail}</p>}
          </div>
          {children}
        </>
      )}
    </>
  );

  if (to) {
    return <Link to={to} className={sharedClassName}>{content}</Link>;
  }

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={sharedClassName}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={sharedClassName} {...buttonProps}>
      {content}
    </button>
  );
};

export default PhotoTile;
