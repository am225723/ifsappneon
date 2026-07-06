import { useEffect, useRef, useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';

const LOGO_URL = '/logo.png';

function WebGLAtmosphere() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl');
    if (!canvas || !gl) return undefined;

    const vsSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      uniform float u_time;

      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
          -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 st = gl_FragCoord.xy/u_resolution.xy;
        st.x *= u_resolution.x/u_resolution.y;

        vec2 mouse = u_mouse/u_resolution.xy;
        mouse.x *= u_resolution.x/u_resolution.y;

        vec2 pos = st * 3.0;
        float t = u_time * 0.2;

        float dist = distance(st, mouse);
        vec2 dir = st - mouse;
        if (length(dir) > 0.0) {
          dir = normalize(dir);
        }
        pos += dir * exp(-dist * 3.0) * 0.5;

        float q = snoise(pos + t * 0.5);
        vec2 r = vec2(snoise(pos + q + t * 0.3), snoise(pos + q - t * 0.2));
        float f = snoise(pos + r * 2.0 + t);

        vec3 colorGreen = vec3(0.05, 0.17, 0.18);
        vec3 colorBlue = vec3(0.10, 0.25, 0.50);
        vec3 colorPurple = vec3(0.30, 0.15, 0.45);
        vec3 colorGold = vec3(0.92, 0.74, 0.46);

        float n1 = clamp(q * 0.5 + 0.5, 0.0, 1.0);
        float n2 = clamp(f * 0.5 + 0.5, 0.0, 1.0);

        vec3 mix1 = mix(colorGreen, colorBlue, smoothstep(0.3, 0.7, n1));
        vec3 mix2 = mix(colorPurple, colorGold, smoothstep(0.3, 0.7, n1));
        vec3 color = mix(mix1, mix2, smoothstep(0.3, 0.7, n2));

        float vignette = 1.0 - smoothstep(0.4, 1.6, distance(gl_FragCoord.xy/u_resolution.xy, vec2(0.5)));
        color *= vignette;

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    function createShader(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = createShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return undefined;

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) return undefined;

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]), gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'position');
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, 'u_resolution');
    const mouseUniformLocation = gl.getUniformLocation(shaderProgram, 'u_mouse');
    const timeUniformLocation = gl.getUniformLocation(shaderProgram, 'u_time');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;
    let frameId = 0;

    const setTarget = (clientX, clientY) => {
      targetMouseX = clientX;
      targetMouseY = window.innerHeight - clientY;
    };

    const handleMouseMove = (event) => setTarget(event.clientX, event.clientY);
    const handleTouch = (event) => {
      const touch = event.touches?.[0];
      if (touch) setTarget(touch.clientX, touch.clientY);
    };

    function resizeCanvasToDisplaySize() {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }
    }

    function render(time) {
      resizeCanvasToDisplaySize();
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;
      gl.useProgram(shaderProgram);
      gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
      gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
      gl.uniform1f(timeUniformLocation, time * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      frameId = requestAnimationFrame(render);
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchstart', handleTouch, { passive: true });
    window.addEventListener('touchmove', handleTouch, { passive: true });
    frameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" aria-hidden="true" />;
}

function GoogleMark() {
  return (
    <svg className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg className="w-5 h-5 fill-white opacity-80 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.11.74.82 0 2.04-.89 3.6-.74 1.5.2 2.62.84 3.33 1.89-3.11 1.87-2.61 6.11.51 7.39-.62 1.5-1.41 2.98-2.55 3.69zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export default function FinalIFSLoginPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOAuth = async (strategy) => {
    if (!isLoaded) return;
    setError('');
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso/callback',
        redirectUrlComplete: '/claim-account'
      });
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.message || 'Unable to start secure sign-in.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isLoaded || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      const result = await signIn.create({ identifier, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        window.location.assign('/claim-account');
        return;
      }
      setError('Additional verification is required. Please use the verification option sent by Clerk.');
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || 'Unable to enter. Check your username and secret key.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-body-md text-on-surface relative overflow-x-hidden bg-[#060e20]">
      <WebGLAtmosphere />

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 right-10 w-48 h-48 border-4 border-vintage-gold opacity-10 rotate-12 hand-drawn-border" />
        <div className="absolute bottom-1/4 left-5 w-32 h-32 bg-burnt-sienna opacity-5 rounded-full blur-3xl" />
      </div>

      <header className="flex flex-col items-center justify-center w-full px-margin-mobile pt-10 z-10 relative pointer-events-none">
        <div className="flex flex-col items-center gap-1 bg-[#002022]/40 backdrop-blur-md px-8 pt-6 pb-7 rounded-2xl border border-white/10 shadow-2xl">
          <img alt="Intrinsic Therapeutic Solutions Logo" className="w-[245px] h-auto floating-element drop-shadow-[0_0_25px_rgba(197,160,89,0.6)]" id="gravity-center" src={LOGO_URL} />
          <h1 className="font-display text-[3.2rem] md:text-[4.3rem] font-bold text-on-surface drop-shadow-lg text-center leading-none mt-0 tracking-[0.01em]">IFS Healing</h1>
          <p className="font-display text-on-surface text-sm md:text-base tracking-[0.18em] uppercase drop-shadow-md mt-1">THE LUMINOUS SELF</p>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center px-margin-mobile py-10 relative z-10">
        <div className="max-w-md w-full bg-[#002022]/60 backdrop-blur-xl p-8 md:p-12 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative border border-white/10 tilt-1 rounded-2xl">
          <div className="absolute inset-0 -z-10 opacity-20 pointer-events-none rounded-2xl shadow-xl" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cardboard-flat.png")', filter: 'contrast(1.1) brightness(0.9)' }} />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#1b4332]/80 backdrop-blur-md -rotate-2 flex items-center justify-center shadow-md border border-white/10 rounded-sm">
            <span className="font-vintage text-white/90 text-[10px]">VERIFIED ACCESS</span>
          </div>

          <div className="space-y-8">
            <div className="text-center">
              <p className="font-display text-xl text-on-surface drop-shadow-md">Meeting Your Parts,</p>
              <p className="text-on-surface text-sm mt-1 drop-shadow-sm">Acknowledge who is present in this moment</p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2 group">
                <label className="font-label-sm uppercase tracking-tighter text-on-surface/80 pl-1">Enter Username</label>
                <div className="relative">
                  <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="w-full bg-[#0d2c2e]/60 border-x-0 border-t-0 border-b-2 border-outline-variant focus:border-vintage-gold focus:ring-0 transition-all duration-300 px-4 py-4 font-body-md text-on-surface placeholder:text-on-surface/60 rounded-t-sm" placeholder="sample@aleix.help" type="email" autoComplete="username" />
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/80">person</span>
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="font-label-sm uppercase tracking-tighter text-on-surface/80 pl-1">Secret Key (or OTP)</label>
                <div className="relative">
                  <input value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-[#0d2c2e]/60 border-x-0 border-t-0 border-b-2 border-outline-variant focus:border-vintage-gold focus:ring-0 transition-all duration-300 px-4 py-4 font-body-md text-on-surface placeholder:text-on-surface/60 rounded-t-sm" placeholder="••••••••" type="password" autoComplete="current-password" />
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/80">lock</span>
                </div>
                <div className="flex justify-end mt-1">
                  <button className="font-label-sm text-on-surface/90 hover:text-on-surface transition-colors uppercase tracking-widest text-[10px] cursor-pointer-hand" type="button">Send Secure Key</button>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm font-label-sm tracking-wide mt-2">{error}</p>}

              <button disabled={!isLoaded || isSubmitting} className="w-full relative group overflow-hidden py-4 px-8 rounded-lg transition-all duration-500 hover:scale-[1.02] active:scale-95 shadow-xl tilt-n1 border border-white/10 disabled:opacity-60" type="submit">
                <div className="absolute inset-0 bg-gradient-to-r from-[#173537] via-[#002d2b] to-[#c5a059] opacity-90 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 font-display text-2xl text-white tracking-wide flex items-center justify-center gap-2 drop-shadow-md">
                  {isSubmitting ? 'ENTERING' : 'ENTER'}
                  <span className="material-symbols-outlined text-3xl">login</span>
                </span>
                <div className="absolute -right-4 -top-4 w-12 h-12 bg-white/20 blur-xl group-hover:animate-ping" />
              </button>

              <div className="pt-3 space-y-5">
                <div className="w-full flex items-center gap-4">
                  <div className="h-px flex-grow bg-white/10" />
                  <span className="font-vintage text-[10px] text-on-surface/80">OR SIGN IN WITH</span>
                  <div className="h-px flex-grow bg-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handleOAuth('oauth_google')} className="flex items-center justify-center gap-2 py-3 px-4 bg-white/10 backdrop-blur-md border border-vintage-gold/30 rounded-lg hover:bg-white/20 hover:border-vintage-gold/60 transition-all duration-300 group" type="button">
                    <GoogleMark />
                    <span className="font-label-sm text-white/90 text-[10px] tracking-widest uppercase">Google</span>
                  </button>
                  <button onClick={() => handleOAuth('oauth_apple')} className="flex items-center justify-center gap-2 py-3 px-4 bg-white/10 backdrop-blur-md border border-vintage-gold/30 rounded-lg hover:bg-white/20 hover:border-vintage-gold/60 transition-all duration-300 group" type="button">
                    <AppleMark />
                    <span className="font-label-sm text-white/90 text-[10px] tracking-widest uppercase">Apple</span>
                  </button>
                </div>
              </div>
            </form>

            <div className="flex flex-col items-center gap-4 pt-4">
              <a className="font-display text-on-surface/90 hover:text-on-surface transition-colors cursor-pointer-hand drop-shadow-sm" href="/sign-in">Lost your key?</a>
              <div className="w-full flex items-center gap-4 py-2">
                <div className="h-px flex-grow bg-white/10" />
                <span className="font-vintage text-[10px] text-on-surface/80">OR</span>
                <div className="h-px flex-grow bg-white/10" />
              </div>
              <a className="w-full text-center border border-vintage-gold/50 text-on-surface py-3 hover:bg-vintage-gold/10 hover:text-on-surface transition-all duration-300 font-label-sm uppercase tracking-widest tilt-2 rounded-lg backdrop-blur-sm" href="/sign-up">Initialize New Journey</a>
            </div>
          </div>
        </div>
      </main>

      <footer className="flex flex-col items-center gap-unit w-full mt-auto pb-margin-mobile z-10 relative">
        <div className="flex gap-4 mb-2">
          <a className="font-label-sm text-on-surface/90 hover:text-on-surface transition-colors underline decoration-dotted" href="/privacy">Privacy Policy</a>
          <span className="text-on-surface/80">•</span>
          <a className="font-label-sm text-on-surface/90 hover:text-on-surface transition-colors underline decoration-dotted" href="/terms">Terms of Service</a>
        </div>
        <p className="font-label-sm text-on-surface/80 opacity-70">© 2026 Intrinsic Therapeutic Solutions</p>
      </footer>
    </div>
  );
}
