import { useEffect, useRef } from 'react';

export default function AuthInteractiveBackground() {
  const backgroundRef = useRef(null);

  useEffect(() => {
    const element = backgroundRef.current;
    if (!element) return undefined;

    let pointerX = 0.5;
    let pointerY = 0.5;
    let targetX = 0.5;
    let targetY = 0.5;
    let frameId = 0;

    const setTarget = (clientX, clientY) => {
      const width = Math.max(window.innerWidth, 1);
      const height = Math.max(window.innerHeight, 1);
      targetX = Math.min(Math.max(clientX / width, 0), 1);
      targetY = Math.min(Math.max(clientY / height, 0), 1);
    };

    const handlePointerMove = (event) => {
      setTarget(event.clientX, event.clientY);
    };

    const handleTouchMove = (event) => {
      const touch = event.touches?.[0];
      if (touch) {
        setTarget(touch.clientX, touch.clientY);
      }
    };

    const animate = () => {
      pointerX += (targetX - pointerX) * 0.08;
      pointerY += (targetY - pointerY) * 0.08;

      const normalizedX = (pointerX - 0.5) * 2;
      const normalizedY = (pointerY - 0.5) * 2;

      element.style.setProperty('--auth-pointer-x', `${(pointerX * 100).toFixed(2)}%`);
      element.style.setProperty('--auth-pointer-y', `${(pointerY * 100).toFixed(2)}%`);
      element.style.setProperty('--auth-drift-x', `${(normalizedX * 26).toFixed(2)}px`);
      element.style.setProperty('--auth-drift-y', `${(normalizedY * 26).toFixed(2)}px`);
      element.style.setProperty('--auth-ripple-x', `${(-normalizedX * 34).toFixed(2)}px`);
      element.style.setProperty('--auth-ripple-y', `${(-normalizedY * 34).toFixed(2)}px`);

      frameId = window.requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div ref={backgroundRef} className="auth-interactive-bg" aria-hidden="true">
      <div className="auth-interactive-bg__field" />
      <div className="auth-interactive-bg__rings auth-interactive-bg__rings--one" />
      <div className="auth-interactive-bg__rings auth-interactive-bg__rings--two" />
      <div className="auth-interactive-bg__glow" />
    </div>
  );
}
