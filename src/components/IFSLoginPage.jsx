import { useEffect, useRef, useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import './IFSLoginPage.css';

const LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAdOEB5PYOJg0_Jlmqe6-E3lFzwrNCIt8mAo3tZdxpz_8raQyab9ufyR-iWxYZc10QWnxCtY0PfW8hV2elgozUPPY1AAQTlxolIX-mULCi-zAaDsGRt_2wPR_d2oHj2x5oQypgHVvWYY6LftPeR2Mb_hemrMAQlM64Oz9M1p6VMNc9y8BK-b5OEOpEre8_KwIFmR8hXG18rJv8WklOUdAXQnqNfFSu-LVC_izFNkWdfckOFdCAJhXp1oPbDx80WDwMLeeegRGiHDXg';

function GoogleIcon() {
  return (
    <svg className="ifs-login-social-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="ifs-login-social-icon ifs-login-social-icon--apple" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.11.74.82 0 2.04-.89 3.6-.74 1.5.2 2.62.84 3.33 1.89-3.11 1.87-2.61 6.11.51 7.39-.62 1.5-1.41 2.98-2.55 3.69zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

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

      float fbm(vec2 p) {
        float value = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amp * snoise(p);
          p = mat2(1.72, 1.08, -1.08, 1.72) * p + 0.19;
          amp *= 0.52;
        }
        return value;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 st = uv;
        st.x *= u_resolution.x / u_resolution.y;

        vec2 mouse = u_mouse / u_resolution.xy;
        mouse.x *= u_resolution.x / u_resolution.y;
        vec2 center = vec2(0.5 * u_resolution.x / u_resolution.y, 0.5);

        float t = u_time * 0.075;
        vec2 p = st * 1.45;
        vec2 mouseDrift = (mouse - center) * 0.12;
        p += mouseDrift;

        float slow = fbm(p + vec2(t * 0.35, -t * 0.18));
        float veil = fbm(p * 1.45 + vec2(slow * 0.58 - t * 0.22, slow * 0.35 + t * 0.28));
        float silk = fbm(p * 2.15 + vec2(veil * 0.38 + t * 0.12, slow * 0.42 - t * 0.2));

        float bands = smoothstep(-0.42, 0.82, slow * 0.75 + veil * 0.42);
        float sheen = smoothstep(0.18, 0.92, silk * 0.55 + veil * 0.28);
        float goldVein = smoothstep(0.50, 0.82, veil + 0.22 * sin((st.x + st.y) * 2.6 + t * 2.0));
        goldVein *= 0.32;

        vec3 deepTeal = vec3(0.015, 0.095, 0.105);
        vec3 blueInk = vec3(0.035, 0.125, 0.255);
        vec3 plum = vec3(0.185, 0.095, 0.275);
        vec3 softGold = vec3(0.78, 0.58, 0.29);
        vec3 antiqueRose = vec3(0.36, 0.23, 0.31);

        vec3 color = mix(deepTeal, blueInk, smoothstep(0.18, 0.88, bands));
        color = mix(color, plum, smoothstep(0.28, 0.9, veil) * 0.55);
        color = mix(color, antiqueRose, smoothstep(0.35, 0.84, silk) * 0.16);
        color = mix(color, softGold, goldVein + sheen * 0.08);

        float spotlight = 1.0 - smoothstep(0.0, 0.95, distance(uv, vec2(0.5, 0.42)));
        color += vec3(0.12, 0.105, 0.07) * spotlight * 0.32;

        float mouseGlow = 1.0 - smoothstep(0.0, 0.42, distance(st, mouse));
        color += vec3(0.22, 0.16, 0.08) * mouseGlow * 0.11;

        float vignette = smoothstep(0.98, 0.2, distance(uv, vec2(0.5, 0.5)));
        color *= 0.48 + vignette * 0.76;
        color = pow(color, vec3(0.92));

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

  return <canvas ref={canvasRef} className="ifs-login-canvas" aria-hidden="true" />;
}

export default function IFSLoginPage() {
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
    <div className="ifs-login-page">
      <WebGLAtmosphere />
      <div className="ifs-login-fragments" aria-hidden="true">
        <div className="ifs-login-fragment-border" />
        <div className="ifs-login-fragment-glow" />
      </div>

      <header className="ifs-login-header">
        <div className="ifs-login-brand-card">
          <img alt="IFS Healing Phoenix Logo" className="ifs-login-logo" src={LOGO_URL} />
          <h1>IFS Healing</h1>
          <p>THE LUMINOUS SELF</p>
        </div>
      </header>

      <main className="ifs-login-main">
        <section className="ifs-login-panel">
          <div className="ifs-login-texture" />
          <div className="ifs-login-tape"><span>VERIFIED ACCESS</span></div>

          <div className="ifs-login-panel-content">
            <div className="ifs-login-copy">
              <p className="ifs-login-script">Meeting Your Parts,</p>
              <p className="ifs-login-subtitle">Acknowledge who is present in this moment</p>
            </div>

            <form className="ifs-login-form" onSubmit={handleSubmit}>
              <div className="ifs-login-social-section">
                <div className="ifs-login-divider"><span>OR SIGN IN WITH</span></div>
                <div className="ifs-login-social-grid">
                  <button type="button" className="ifs-login-social-button" onClick={() => handleOAuth('oauth_google')}>
                    <GoogleIcon />
                    <span>Google</span>
                  </button>
                  <button type="button" className="ifs-login-social-button" onClick={() => handleOAuth('oauth_apple')}>
                    <AppleIcon />
                    <span>Apple</span>
                  </button>
                </div>
              </div>

              <label className="ifs-login-field">
                <span>Enter Username</span>
                <div className="ifs-login-input-wrap">
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="sample@aleix.help"
                    type="text"
                    autoComplete="username"
                  />
                  <span className="ifs-login-symbol">person</span>
                </div>
              </label>

              <label className="ifs-login-field">
                <span>Secret Key (or OTP)</span>
                <div className="ifs-login-input-wrap">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                  />
                  <span className="ifs-login-symbol">lock</span>
                </div>
                <button type="button" className="ifs-login-send-key">Send Secure Key</button>
              </label>

              {error && <p className="ifs-login-error">{error}</p>}

              <button type="submit" className="ifs-login-enter" disabled={!isLoaded || isSubmitting}>
                <span>{isSubmitting ? 'ENTERING' : 'ENTER'}</span>
                <span className="ifs-login-enter-icon">login</span>
              </button>
            </form>

            <div className="ifs-login-actions">
              <button type="button" className="ifs-login-lost-key">Lost your key?</button>
              <div className="ifs-login-divider ifs-login-divider--small"><span>OR</span></div>
              <a href="/sign-up" className="ifs-login-new-journey">Initialize New Journey</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="ifs-login-footer">
        <div>
          <a href="/privacy">Privacy Policy</a>
          <span>•</span>
          <a href="/terms">Terms of Service</a>
        </div>
        <p>© 2026 Intrinsic Therapeutic Solutions</p>
      </footer>
    </div>
  );
}
