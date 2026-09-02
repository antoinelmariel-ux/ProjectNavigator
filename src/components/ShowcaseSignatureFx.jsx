import React, { useEffect, useRef } from '../react.js';

const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';

const FRAG = [
  'precision highp float;',
  'uniform vec2 u_res; uniform float u_t; uniform float u_s;',
  'vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.0+2.0*fract(sin(p)*43758.5453123);}',
  'float nz(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);',
  ' return mix(mix(dot(h2(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(h2(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),',
  '            mix(dot(h2(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(h2(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);}',
  'float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*nz(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return v;}',
  'void main(){',
  ' vec2 uv=(gl_FragCoord.xy-0.5*u_res)/min(u_res.x,u_res.y);',
  ' float t=u_t*0.035;',
  ' vec2 q=vec2(fbm(uv*0.62+vec2(0.0,t)),fbm(uv*0.62+vec2(5.2,1.3-t)));',
  ' vec2 r=vec2(fbm(uv*0.62+2.4*q+vec2(1.7,9.2)+0.12*t),fbm(uv*0.62+2.4*q+vec2(8.3,2.8)-0.1*t));',
  ' float f=fbm(uv*0.62+2.0*r);',
  ' float m=clamp(f*1.7+0.5,0.0,1.0);',
  ' vec3 don=vec3(0.882,0.035,0.263);',
  ' vec3 pla=vec3(0.965,0.682,0.298);',
  ' vec3 vie=vec3(0.192,0.686,0.502);',
  ' vec3 vio=vec3(0.102,0.380,0.671);',
  ' float s=clamp(u_s,0.0,1.0);',
  ' vec3 ca=mix(don,pla,smoothstep(0.0,0.55,s));',
  ' vec3 cb=mix(pla,vie,smoothstep(0.35,0.85,s));',
  ' vec3 cc=mix(vio,vie,smoothstep(0.55,1.0,s));',
  ' vec3 col=mix(ca,cb,smoothstep(0.25,0.75,m));',
  ' col=mix(col,cc,smoothstep(0.62,1.0,m)*0.55);',
  ' vec3 ink=vec3(0.106,0.106,0.106);',
  // seuil haut : la couleur n'existe qu'en halos, le reste reste encre -> texte lisible
  ' float glow=smoothstep(0.47,0.97,m);',
  ' col=mix(ink,col,glow*0.9);',
  // on ressature après le mélange, sinon les halos virent au beige
  ' float l2=dot(col,vec3(0.299,0.587,0.114));',
  ' col=clamp(mix(vec3(l2),col,1.55),0.0,1.0);',
  ' float vig=1.0-0.60*dot(uv,uv);',
  ' col=mix(ink,col,clamp(vig,0.0,1.0));',
  ' float g=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);',
  ' col+=(g-0.5)*0.016;',
  ' gl_FragColor=vec4(col,1.0);',
  '}'
].join('\n');

const compile = (gl, type, src) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return null;
  }
  return shader;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ShowcaseSignatureFx({ rootRef }) {
  const canvasRef = useRef(null);
  const fallbackRef = useRef(null);

  useEffect(() => {
    const root = rootRef && rootRef.current;
    const canvas = canvasRef.current;
    if (!root || typeof window === 'undefined') {
      return undefined;
    }

    const reduce = prefersReducedMotion();
    const cleanups = [];
    let rafId = null;

    /* ---------- 1. fond WebGL ---------- */
    let gl = null;
    let uRes = null;
    let uT = null;
    let uS = null;
    let glOK = false;

    if (canvas && !reduce) {
      try {
        gl =
          canvas.getContext('webgl', {
            antialias: false,
            alpha: false,
            depth: false,
            stencil: false,
            powerPreference: 'low-power'
          }) || canvas.getContext('experimental-webgl');
      } catch {
        gl = null;
      }
    }

    if (gl) {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (vs && fs) {
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
          gl.useProgram(program);
          const buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
          const loc = gl.getAttribLocation(program, 'p');
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
          uRes = gl.getUniformLocation(program, 'u_res');
          uT = gl.getUniformLocation(program, 'u_t');
          uS = gl.getUniformLocation(program, 'u_s');
          glOK = true;
        }
      }
    }

    if (!glOK && fallbackRef.current) {
      fallbackRef.current.style.display = 'block';
    }

    const sizeGL = () => {
      if (!glOK || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uRes, w, h);
      }
    };
    sizeGL();

    /* ---------- 2. éléments pilotés par le défilement ---------- */
    const stackGroups = Array.prototype.map.call(root.querySelectorAll('.sg-stack'), (stack) =>
      Array.prototype.slice.call(stack.querySelectorAll('.sg-card'))
    );
    const roads = Array.prototype.slice.call(root.querySelectorAll('.sg-road'));
    const counter = root.querySelector('[data-sg-counter]');
    const storySteps = Array.prototype.slice.call(root.querySelectorAll('[data-sg-story-step]'));

    let scrollP = 0;

    const readScroll = () => {
      const rect = root.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      scrollP = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;

      if (!reduce) {
        // une carte recule et s'assombrit à mesure que la suivante la recouvre,
        // calculé pile par pile pour ne pas relier deux piles distantes
        for (let g = 0; g < stackGroups.length; g += 1) {
          const cards = stackGroups[g];
          for (let i = 0; i < cards.length; i += 1) {
            const cur = cards[i].getBoundingClientRect();
            let covered = 0;
            if (i + 1 < cards.length && cur.height > 0) {
              const gap = cards[i + 1].getBoundingClientRect().top - cur.top;
              covered = 1 - Math.min(1, Math.max(0, gap / cur.height));
            }
            cards[i].style.setProperty('--sg-s', (1 - covered * 0.07).toFixed(4));
            cards[i].style.setProperty('--sg-dim', (covered * 0.45).toFixed(4));
          }
        }
      }

      roads.forEach((road) => {
        const fill = road.querySelector('.sg-road__fill');
        if (!fill) return;
        const rr = road.getBoundingClientRect();
        const target = window.innerHeight * 0.55;
        const p = (target - rr.top) / (rr.height * 0.82);
        fill.style.setProperty('--sg-p', Math.min(1, Math.max(0, p)).toFixed(4));
      });
    };

    // le trait s'arrête exactement au centre de la première et de la dernière pastille
    const alignRails = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      roads.forEach((road) => {
        const rail = road.querySelector('.sg-road__rail');
        const items = road.querySelectorAll('.sg-road__item');
        if (!rail || items.length < 2) return;
        const cs = getComputedStyle(road);
        const dot = parseFloat(cs.getPropertyValue('--sg-dot')) * rem;
        const dotY = parseFloat(cs.getPropertyValue('--sg-dot-y')) * rem;
        if (!Number.isFinite(dot) || !Number.isFinite(dotY)) return;
        const base = road.getBoundingClientRect().top;
        const head = items[0].getBoundingClientRect().top - base + dotY + dot / 2;
        const tail = items[items.length - 1].getBoundingClientRect().top - base + dotY + dot / 2;
        rail.style.top = `${head}px`;
        rail.style.bottom = 'auto';
        rail.style.height = `${Math.max(0, tail - head)}px`;
      });
    };

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let lastY = null;

    // la position est relue dans la boucle rAF : insensible au défilement fluide et à l'inertie
    const frame = (now) => {
      const y = window.scrollY;
      if (y !== lastY) {
        lastY = y;
        readScroll();
      }
      if (glOK) {
        const rect = root.getBoundingClientRect();
        const visible = rect.bottom > 0 && rect.top < window.innerHeight;
        if (visible && !document.hidden) {
          sizeGL();
          gl.uniform1f(uT, (now - startTime) / 1000);
          gl.uniform1f(uS, scrollP);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }
      rafId = window.requestAnimationFrame(frame);
    };

    // appel direct : passer par rAF ici bloquerait tout si l'onglet est en arrière-plan
    const onScroll = () => readScroll();
    const onResize = () => {
      sizeGL();
      alignRails();
      alignTitleGradient();
      readScroll();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    cleanups.push(() => window.removeEventListener('scroll', onScroll));
    cleanups.push(() => window.removeEventListener('resize', onResize));

    alignRails();
    readScroll();
    rafId = window.requestAnimationFrame(frame);

    // les polices web changent les hauteurs de texte : on recale une fois chargées
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(() => {
        alignRails();
        alignTitleGradient();
        readScroll();
      });
    }

    /* ---------- 3. révélations ---------- */
    const revealTargets = Array.prototype.slice.call(root.querySelectorAll('.sg-rv'));
    const roadItems = Array.prototype.slice.call(root.querySelectorAll('.sg-road__item'));

    if (reduce || typeof IntersectionObserver === 'undefined') {
      revealTargets.forEach((el) => el.classList.add('is-on'));
      roadItems.forEach((el) => el.classList.add('is-on'));
      storySteps.forEach((el) => el.classList.add('is-on'));
    } else {
      const revealIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-on');
              revealIO.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
      );
      revealTargets.forEach((el) => revealIO.observe(el));
      cleanups.push(() => revealIO.disconnect());

      const roadIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-on');
              roadIO.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      roadItems.forEach((el) => roadIO.observe(el));
      cleanups.push(() => roadIO.disconnect());

      // le compteur ne suit que les étapes de la section « problème »
      const counterSteps = Array.prototype.slice.call(root.querySelectorAll('[data-sg-counter-step]'));
      const stepIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            entry.target.classList.toggle('is-on', entry.isIntersecting);
            if (entry.isIntersecting && counter) {
              const rank = counterSteps.indexOf(entry.target);
              if (rank !== -1) {
                counter.textContent = `0${rank + 1}`;
              }
            }
          });
        },
        { threshold: 0.55 }
      );
      storySteps.forEach((el) => stepIO.observe(el));
      cleanups.push(() => stepIO.disconnect());
    }

    /* ---------- 4. compteurs chiffrés ---------- */
    const counterEls = Array.prototype.slice.call(root.querySelectorAll('[data-sg-count]'));
    const runCount = (el) => {
      const target = parseFloat(el.getAttribute('data-sg-count'));
      if (!Number.isFinite(target)) return;
      if (reduce) {
        el.textContent = String(target);
        return;
      }
      let t0 = null;
      const step = (ts) => {
        if (t0 === null) t0 = ts;
        const k = Math.min(1, (ts - t0) / 1300);
        const eased = 1 - Math.pow(1 - k, 3);
        el.textContent = String(Math.round(target * eased));
        if (k < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };

    if (counterEls.length) {
      if (typeof IntersectionObserver === 'undefined') {
        counterEls.forEach(runCount);
      } else {
        const countIO = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                runCount(entry.target);
                countIO.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.6 }
        );
        counterEls.forEach((el) => countIO.observe(el));
        cleanups.push(() => countIO.disconnect());
      }
    }

    /* ---------- 5. ondulation au clic, défilement, inclinaison ---------- */
    const onPointerDown = (event) => {
      const btn = event.target.closest && event.target.closest('[data-sg-ripple]');
      if (!btn || reduce) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const span = document.createElement('span');
      span.className = 'sg-ripple';
      span.style.width = `${size}px`;
      span.style.height = `${size}px`;
      span.style.left = `${event.clientX - r.left - size / 2}px`;
      span.style.top = `${event.clientY - r.top - size / 2}px`;
      btn.appendChild(span);
      window.setTimeout(() => span.remove(), 640);
    };

    const onClick = (event) => {
      const btn = event.target.closest && event.target.closest('[data-sg-scroll-to]');
      if (!btn) return;
      const target = root.querySelector(btn.getAttribute('data-sg-scroll-to'));
      if (!target) return;
      const y = target.getBoundingClientRect().top + window.scrollY - 8;
      try {
        window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      } catch {
        window.scrollTo(0, y);
      }
    };

    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('click', onClick);
    cleanups.push(() => root.removeEventListener('pointerdown', onPointerDown));
    cleanups.push(() => root.removeEventListener('click', onClick));

    const finePointer =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (finePointer && !reduce) {
      const tiles = Array.prototype.slice.call(root.querySelectorAll('[data-sg-tilt]'));
      tiles.forEach((card) => {
        const move = (event) => {
          const r = card.getBoundingClientRect();
          const px = (event.clientX - r.left) / r.width - 0.5;
          const py = (event.clientY - r.top) / r.height - 0.5;
          card.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 9).toFixed(2)}deg) translateY(-6px)`;
        };
        const leave = () => {
          card.style.transform = '';
        };
        card.addEventListener('pointermove', move);
        card.addEventListener('pointerleave', leave);
        cleanups.push(() => {
          card.removeEventListener('pointermove', move);
          card.removeEventListener('pointerleave', leave);
        });
      });
    }

    /* ---------- 6. titre du hero mot par mot ---------- */
    let alignTitleGradient = () => {};
    const titleEl = root.querySelector('.sg-hero__title');
    if (titleEl && !reduce) {
      const words = titleEl.textContent.split(' ');
      titleEl.textContent = '';
      words.forEach((w, i) => {
        const span = document.createElement('span');
        span.className = 'sg-word';
        span.textContent = w;
        span.style.setProperty('--sg-d', `${i * 110}ms`);
        titleEl.appendChild(span);
        if (i < words.length - 1) titleEl.appendChild(document.createTextNode(' '));
      });

      const wordEls = titleEl.querySelectorAll('.sg-word');
      // recale la tranche de dégradé de chaque mot sur la largeur du titre entier,
      // sinon chaque mot rejoue son propre dégradé complet (effet "arc-en-ciel" haché)
      alignTitleGradient = () => {
        const base = titleEl.getBoundingClientRect();
        wordEls.forEach((span) => {
          const r = span.getBoundingClientRect();
          span.style.backgroundSize = `${base.width}px ${base.height}px`;
          span.style.backgroundPosition = `${base.left - r.left}px ${base.top - r.top}px`;
        });
      };
      alignTitleGradient();
      window.requestAnimationFrame(() => {
        wordEls.forEach((span) => span.classList.add('is-on'));
      });
    }

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      cleanups.forEach((fn) => fn());
    };
  }, [rootRef]);

  return (
    <div className="sg-bg-layer" aria-hidden="true">
      <canvas ref={canvasRef} className="sg-bg" />
      <div ref={fallbackRef} className="sg-bg-fallback" style={{ display: 'none' }} />
      <div className="sg-scrim" />
    </div>
  );
}

export default ShowcaseSignatureFx;
