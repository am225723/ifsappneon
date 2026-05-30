import { useMemo, useState } from 'react';

const BOOKS = [
  {
    id: 'self-energy',
    title: 'Self Energy',
    subtitle: 'Calm • Clarity • Compassion',
    material: 'warm leather',
    color: '#7a4328',
    accent: '#f3d98a',
    height: 238,
    width: 54,
    tilt: -1.2,
    part: 'A steady, centered volume for returning to presence before deeper work.',
  },
  {
    id: 'protectors',
    title: 'Protectors',
    subtitle: 'Managers & Firefighters',
    material: 'matte cloth',
    color: '#354d45',
    accent: '#d5b46a',
    height: 222,
    width: 46,
    tilt: 0.8,
    part: 'A tactile guide to befriending protective parts without forcing them aside.',
  },
  {
    id: 'exiles',
    title: 'Exiles',
    subtitle: 'Tender Witnessing',
    material: 'soft suede',
    color: '#653f5a',
    accent: '#f0c783',
    height: 252,
    width: 50,
    tilt: -0.5,
    part: 'Gentle prompts for approaching younger wounded parts with permission and care.',
  },
  {
    id: 'unburdening',
    title: 'Unburdening',
    subtitle: 'Ritual & Release',
    material: 'polished leather',
    color: '#274160',
    accent: '#f5df9d',
    height: 232,
    width: 58,
    tilt: 1.3,
    part: 'A ceremonial-feeling section that could later open into textured pages.',
  },
  {
    id: 'parts-map',
    title: 'Parts Map',
    subtitle: 'Inner Relationships',
    material: 'linen cover',
    color: '#8b6f3e',
    accent: '#f7daa0',
    height: 214,
    width: 44,
    tilt: -1.8,
    part: 'A navigational atlas for seeing how parts cluster, polarize, and collaborate.',
  },
  {
    id: 'somatic',
    title: 'Somatic Cues',
    subtitle: 'Body-Led Noticing',
    material: 'matte cloth',
    color: '#436071',
    accent: '#efd37f',
    height: 246,
    width: 48,
    tilt: 1.8,
    part: 'A grounding collection for turning sensations into respectful inner dialogue.',
  },
  {
    id: 'legacy',
    title: 'Legacy Burdens',
    subtitle: 'Inherited Stories',
    material: 'aged leather',
    color: '#5c332f',
    accent: '#f4cf77',
    height: 226,
    width: 52,
    tilt: -0.7,
    part: 'A darker, archival book for lineage, culture, and beliefs carried across time.',
  },
  {
    id: 'daily-practice',
    title: 'Daily Practice',
    subtitle: 'Small Rituals',
    material: 'worn cloth',
    color: '#51633a',
    accent: '#f1d68b',
    height: 218,
    width: 42,
    tilt: 0.3,
    part: 'Short, repeatable practices designed to feel inviting on mobile.',
  },
];

function RealisticBook({ book, isSelected, onSelect }) {
  return (
    <button
      type="button"
      className={`inner-book ${isSelected ? 'is-selected' : ''}`}
      onClick={() => onSelect(book)}
      aria-pressed={isSelected}
      aria-label={`Open ${book.title}`}
      style={{
        '--book-h': `${book.height}px`,
        '--book-w': `${book.width}px`,
        '--book-c': book.color,
        '--book-accent': book.accent,
        '--book-tilt': `${book.tilt}deg`,
      }}
    >
      <span className="book-page-block" aria-hidden="true" />
      <span className="book-spine-shell">
        <span className="book-hinge book-hinge-left" aria-hidden="true" />
        <span className="book-hinge book-hinge-right" aria-hidden="true" />
        <span className="book-foil-band top" aria-hidden="true" />
        <span className="book-title">{book.title}</span>
        <span className="book-material">{book.material}</span>
        <span className="book-foil-band bottom" aria-hidden="true" />
      </span>
    </button>
  );
}

function DetailPanel({ selectedBook, onClose }) {
  if (!selectedBook) return null;

  return (
    <aside className="library-detail-card" aria-live="polite">
      <button type="button" className="detail-close" onClick={onClose} aria-label="Close selected book">
        ×
      </button>
      <p className="detail-kicker">Selected volume</p>
      <h2>{selectedBook.title}</h2>
      <p className="detail-subtitle">{selectedBook.subtitle}</p>
      <p className="detail-copy">{selectedBook.part}</p>
      <div className="detail-actions">
        <button type="button">Open book view</button>
        <button type="button" className="ghost" onClick={onClose}>Return to shelf</button>
      </div>
    </aside>
  );
}

export default function InnerLibraryMockup() {
  const [selectedId, setSelectedId] = useState('self-energy');
  const selectedBook = useMemo(
    () => BOOKS.find((book) => book.id === selectedId),
    [selectedId]
  );

  const topShelf = BOOKS.slice(0, 4);
  const bottomShelf = BOOKS.slice(4);

  return (
    <main className="inner-library-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap');

        .inner-library-shell {
          min-height: calc(100vh - 4rem);
          position: relative;
          overflow: hidden;
          padding: 1.25rem 1rem 7rem;
          color: #fff7e8;
          background:
            radial-gradient(circle at 16% 10%, rgba(255, 218, 147, 0.32), transparent 28rem),
            radial-gradient(circle at 88% 0%, rgba(111, 173, 219, 0.22), transparent 26rem),
            linear-gradient(135deg, #24140f 0%, #49301e 44%, #151b25 100%);
        }

        .inner-library-shell::before,
        .inner-library-shell::after {
          content: '';
          position: absolute;
          pointer-events: none;
          inset: 0;
          z-index: 0;
        }

        .inner-library-shell::before {
          background:
            linear-gradient(108deg, rgba(255, 203, 125, 0.28) 0%, transparent 36%),
            linear-gradient(252deg, rgba(123, 185, 232, 0.18) 0%, transparent 38%);
          mix-blend-mode: screen;
          opacity: 0.85;
        }

        .inner-library-shell::after {
          background-image:
            radial-gradient(circle, rgba(255, 255, 255, 0.18) 0 1px, transparent 1.4px),
            radial-gradient(circle, rgba(251, 204, 121, 0.14) 0 1px, transparent 1.2px);
          background-size: 92px 92px, 137px 137px;
          opacity: 0.22;
        }

        .library-hero,
        .bookcase-scene,
        .library-detail-card {
          position: relative;
          z-index: 1;
        }

        .library-hero {
          max-width: 58rem;
          margin: 0 auto 1.25rem;
          text-align: center;
        }

        .library-hero p:first-child {
          margin: 0 0 0.45rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-size: 0.68rem;
          color: rgba(255, 226, 168, 0.78);
        }

        .library-hero h1 {
          margin: 0;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(2.15rem, 9vw, 5.3rem);
          line-height: 0.9;
          text-wrap: balance;
          text-shadow: 0 1.2rem 3rem rgba(0, 0, 0, 0.42);
        }

        .library-hero .lede {
          max-width: 42rem;
          margin: 0.9rem auto 0;
          color: rgba(255, 247, 232, 0.78);
          font-size: clamp(0.95rem, 2.8vw, 1.08rem);
          line-height: 1.65;
        }

        .bookcase-scene {
          max-width: 65rem;
          margin: 0 auto;
          perspective: 1200px;
        }

        .bookcase-frame {
          position: relative;
          padding: clamp(1.2rem, 5vw, 2.6rem) clamp(0.9rem, 4vw, 2.4rem) clamp(1rem, 3vw, 1.8rem);
          border-radius: 2rem;
          background:
            linear-gradient(90deg, rgba(255, 227, 177, 0.08), transparent 26%, rgba(0, 0, 0, 0.28)),
            linear-gradient(135deg, #654129, #27170f 62%, #160f0b);
          box-shadow:
            inset 0 0 0 1px rgba(255, 228, 182, 0.12),
            inset 0 -1.4rem 3rem rgba(0, 0, 0, 0.32),
            0 2rem 5rem rgba(0, 0, 0, 0.42);
          transform: rotateX(3deg);
          transform-style: preserve-3d;
        }

        .bookcase-frame::before {
          content: '';
          position: absolute;
          inset: 0.8rem;
          border-radius: 1.55rem;
          border: 1px solid rgba(255, 229, 186, 0.13);
          pointer-events: none;
        }

        .shelf-row {
          min-height: 18rem;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: clamp(0.28rem, 1.4vw, 0.9rem);
          padding: 1.25rem clamp(0.4rem, 2vw, 1.2rem) 1.05rem;
          position: relative;
          transform-style: preserve-3d;
        }

        .shelf-row + .shelf-row {
          margin-top: 1.4rem;
        }

        .shelf-row::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1.2rem;
          border-radius: 999px;
          background:
            linear-gradient(180deg, rgba(255, 213, 142, 0.28), rgba(56, 31, 17, 0.88)),
            linear-gradient(90deg, #2f1a10, #7b5232 48%, #1a0f09);
          box-shadow:
            0 -0.4rem 1.4rem rgba(0, 0, 0, 0.36),
            0 1rem 2.4rem rgba(0, 0, 0, 0.4);
        }

        .shelf-row::before {
          content: '';
          position: absolute;
          left: 7%;
          right: 7%;
          bottom: 1rem;
          height: 2rem;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(0, 0, 0, 0.55), transparent 68%);
          filter: blur(0.45rem);
          opacity: 0.9;
        }

        .inner-book {
          width: var(--book-w);
          height: var(--book-h);
          border: 0;
          padding: 0;
          background: transparent;
          cursor: pointer;
          position: relative;
          transform: rotateZ(var(--book-tilt)) translateY(0) translateZ(0);
          transform-style: preserve-3d;
          transition: transform 340ms cubic-bezier(.2,.8,.2,1), filter 340ms ease, z-index 0ms 120ms;
          z-index: 2;
          filter: drop-shadow(0.45rem 0.8rem 0.7rem rgba(0, 0, 0, 0.38));
          -webkit-tap-highlight-color: transparent;
        }

        .inner-book:hover,
        .inner-book:focus-visible {
          transform: rotateZ(0deg) translateY(-0.85rem) translateZ(2rem) scale(1.035);
          outline: none;
          z-index: 8;
        }

        .inner-book.is-selected {
          transform: rotateZ(0deg) translateY(-1.25rem) translateZ(3.5rem) scale(1.12);
          z-index: 12;
          filter: drop-shadow(0.9rem 1.2rem 1rem rgba(0, 0, 0, 0.48));
        }

        .book-spine-shell {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: 999px 1.2rem 1.05rem 999px;
          background:
            radial-gradient(ellipse at 3% 50%, rgba(255, 255, 255, 0.32), transparent 14%),
            linear-gradient(90deg, rgba(0, 0, 0, 0.48), var(--book-c) 22%, rgba(255, 255, 255, 0.18) 48%, var(--book-c) 74%, rgba(0, 0, 0, 0.5)),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0 2px, transparent 2px 8px);
          box-shadow:
            inset 0.5rem 0 0.9rem rgba(255, 255, 255, 0.16),
            inset -0.65rem 0 0.8rem rgba(0, 0, 0, 0.38),
            inset 0 0 0 1px rgba(255, 243, 210, 0.13);
        }

        .book-spine-shell::before {
          content: '';
          position: absolute;
          inset: -16% 12% 0 6%;
          background: radial-gradient(circle at 40% 15%, rgba(255, 255, 255, 0.22), transparent 28%);
          opacity: 0.55;
        }

        .book-spine-shell::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle, rgba(255,255,255,0.14) 0 0.7px, transparent 1px),
            radial-gradient(circle, rgba(0,0,0,0.14) 0 0.7px, transparent 1px);
          background-size: 9px 13px, 13px 9px;
          mix-blend-mode: overlay;
          opacity: 0.28;
        }

        .book-page-block {
          position: absolute;
          top: 0.55rem;
          bottom: 0.55rem;
          right: -0.42rem;
          width: 0.72rem;
          border-radius: 0.25rem;
          background:
            radial-gradient(circle at 30% 20%, rgba(119, 81, 37, 0.28) 0 1px, transparent 1.6px),
            radial-gradient(circle at 70% 55%, rgba(105, 76, 44, 0.18) 0 1px, transparent 1.4px),
            repeating-linear-gradient(0deg, #f3dfbb 0 1px, #d8c095 1px 2px, #f5e6c8 2px 4px);
          box-shadow: inset -0.12rem 0 0.2rem rgba(79, 45, 22, 0.28);
          transform: translateZ(-0.25rem);
        }

        .book-hinge {
          position: absolute;
          top: 0.7rem;
          bottom: 0.7rem;
          width: 0.22rem;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(0, 0, 0, 0.45), rgba(255, 255, 255, 0.18), rgba(0, 0, 0, 0.34));
          box-shadow: 0 0 0.45rem rgba(0, 0, 0, 0.22);
          z-index: 2;
        }

        .book-hinge-left { left: 0.58rem; }
        .book-hinge-right { right: 0.46rem; opacity: 0.58; }

        .book-foil-band {
          position: absolute;
          left: 18%;
          right: 18%;
          height: 0.34rem;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, var(--book-accent), #fff2b5, var(--book-accent), transparent);
          box-shadow: 0 0 0.7rem rgba(246, 204, 106, 0.32);
          z-index: 4;
        }

        .book-foil-band.top { top: 1.15rem; }
        .book-foil-band.bottom { bottom: 1.15rem; }

        .book-title {
          position: absolute;
          z-index: 4;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(180deg);
          writing-mode: vertical-rl;
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 700;
          letter-spacing: 0.08em;
          font-size: clamp(0.72rem, 1.6vw, 0.94rem);
          white-space: nowrap;
          color: transparent;
          background: linear-gradient(90deg, #7f5514, #ffe8a3, #fff8d8, #c49232);
          -webkit-background-clip: text;
          background-clip: text;
          text-shadow: 0 0.12rem 0.35rem rgba(0, 0, 0, 0.32);
        }

        .book-material {
          position: absolute;
          z-index: 4;
          left: 50%;
          bottom: 2.2rem;
          transform: translateX(-50%) rotate(180deg);
          writing-mode: vertical-rl;
          font-size: 0.48rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 236, 184, 0.58);
        }

        .library-detail-card {
          width: min(92vw, 27rem);
          margin: 1.1rem auto 0;
          padding: 1.15rem;
          border-radius: 1.5rem;
          background: rgba(24, 17, 14, 0.74);
          border: 1px solid rgba(255, 232, 184, 0.18);
          box-shadow: 0 1.2rem 3rem rgba(0, 0, 0, 0.38);
          backdrop-filter: blur(18px);
        }

        .detail-close {
          float: right;
          width: 2rem;
          height: 2rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 235, 199, 0.2);
          background: rgba(255, 255, 255, 0.08);
          color: #fff7e8;
          font-size: 1.25rem;
          line-height: 1;
        }

        .detail-kicker {
          margin: 0 0 0.3rem;
          color: #efd088;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.16em;
        }

        .library-detail-card h2 {
          margin: 0;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.9rem;
        }

        .detail-subtitle {
          margin: 0.25rem 0 0.85rem;
          color: rgba(255, 238, 204, 0.74);
        }

        .detail-copy {
          margin: 0;
          color: rgba(255, 247, 232, 0.82);
          line-height: 1.6;
        }

        .detail-actions {
          display: flex;
          gap: 0.7rem;
          margin-top: 1rem;
          flex-wrap: wrap;
        }

        .detail-actions button {
          border: 0;
          border-radius: 999px;
          padding: 0.78rem 1rem;
          color: #27170f;
          background: linear-gradient(135deg, #ffe7ad, #c89132);
          font-weight: 700;
          box-shadow: 0 0.6rem 1.4rem rgba(0, 0, 0, 0.24);
        }

        .detail-actions .ghost {
          color: #fff2d5;
          background: rgba(255, 255, 255, 0.09);
          border: 1px solid rgba(255, 232, 184, 0.18);
        }

        .mockup-notes {
          position: relative;
          z-index: 1;
          max-width: 65rem;
          margin: 1rem auto 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .mockup-note {
          border-radius: 1.1rem;
          padding: 0.9rem;
          background: rgba(255, 248, 235, 0.08);
          border: 1px solid rgba(255, 231, 187, 0.12);
          color: rgba(255, 247, 232, 0.74);
          font-size: 0.86rem;
          line-height: 1.5;
        }

        .mockup-note strong {
          display: block;
          color: #ffe3a2;
          margin-bottom: 0.25rem;
        }

        @media (min-width: 900px) {
          .inner-library-shell {
            padding: 2rem 1.5rem 5rem;
          }

          .library-layout {
            max-width: 86rem;
            margin: 0 auto;
            display: grid;
            grid-template-columns: minmax(0, 1fr) 24rem;
            gap: 1.25rem;
            align-items: end;
          }

          .library-detail-card {
            position: sticky;
            bottom: 2rem;
            margin: 0;
          }
        }

        @media (max-width: 640px) {
          .bookcase-frame {
            margin-inline: -0.25rem;
            border-radius: 1.4rem;
          }

          .shelf-row {
            min-height: 14.2rem;
            justify-content: flex-start;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            padding-inline: 1rem;
            scrollbar-width: none;
          }

          .shelf-row::-webkit-scrollbar { display: none; }

          .inner-book {
            flex: 0 0 auto;
            height: calc(var(--book-h) * 0.76);
            width: calc(var(--book-w) * 0.9);
            scroll-snap-align: center;
          }

          .inner-book.is-selected {
            transform: rotateZ(0deg) translateY(-1rem) translateZ(3rem) scale(1.22);
          }

          .library-detail-card {
            position: fixed;
            left: 0.75rem;
            right: 0.75rem;
            bottom: calc(4.75rem + env(safe-area-inset-bottom));
            width: auto;
            margin: 0;
            z-index: 20;
          }

          .mockup-notes {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <section className="library-hero">
        <p>Inner Library mockup</p>
        <h1>Tactile, warm, and touch-first.</h1>
        <p className="lede">
          A responsive visual prototype for the realistic bookcase: curved spines, indented hinges,
          foil-stamped titles, foxed paper edges, soft shelf shadows, and a mobile-friendly tap-to-read state.
        </p>
      </section>

      <section className="library-layout" aria-label="Interactive Inner Library mockup">
        <div className="bookcase-scene">
          <div className="bookcase-frame">
            <div className="shelf-row" aria-label="Top shelf">
              {topShelf.map((book) => (
                <RealisticBook
                  key={book.id}
                  book={book}
                  isSelected={book.id === selectedId}
                  onSelect={(nextBook) => setSelectedId(nextBook.id)}
                />
              ))}
            </div>
            <div className="shelf-row" aria-label="Bottom shelf">
              {bottomShelf.map((book) => (
                <RealisticBook
                  key={book.id}
                  book={book}
                  isSelected={book.id === selectedId}
                  onSelect={(nextBook) => setSelectedId(nextBook.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <DetailPanel selectedBook={selectedBook} onClose={() => setSelectedId(null)} />
      </section>

      <section className="mockup-notes" aria-label="Mockup implementation notes">
        <div className="mockup-note">
          <strong>Geometry stand-in</strong>
          CSS gradients and rounded radii mimic cylinder spines, French grooves, cover boards, and page-block depth before swapping to Three.js meshes.
        </div>
        <div className="mockup-note">
          <strong>Mobile behavior</strong>
          Tap selection enlarges the chosen spine and pins a readable action card above the existing bottom nav safe area.
        </div>
      </section>
    </main>
  );
}
