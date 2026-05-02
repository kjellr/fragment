'use client'
import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import type { EffectId } from './effects'

// ── GLSL ──────────────────────────────────────────────
const VERT = `
precision highp float;
attribute float aAlpha;
attribute float aSize;
uniform float uPixelRatio;
varying float vAlpha;
varying vec3 vColor;

void main() {
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uPixelRatio;
  gl_Position = projectionMatrix * mvPos;
  vAlpha = aAlpha;
  vColor = color;
}
`

const FRAG = `
precision highp float;
varying float vAlpha;
varying vec3 vColor;

void main() {
  vec2 coord = gl_PointCoord - 0.5;
  float d = length(coord) * 2.0;
  // Soft glow — bright core, feathered edge
  float core = 1.0 - smoothstep(0.0, 0.6, d);
  float halo = 1.0 - smoothstep(0.5, 1.0, d);
  float alpha = (core * 0.8 + halo * 0.2) * vAlpha;
  if (alpha < 0.005) discard;
  gl_FragColor = vec4(vColor, alpha);
}
`

// ── Fluid GLSL ─────────────────────────────────────────
const FLUID_VERT = `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FLUID_ADVECT = `
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uVelocity;
uniform vec2 uPx;
uniform float uDt;
uniform float uScale;
varying vec2 vUv;
void main() {
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vec2 back = vUv - vel * uDt * uPx;
  gl_FragColor = texture2D(uSource, back) * uScale;
}
`

const FLUID_FORCE = `
precision highp float;
uniform vec2 uCenter;
uniform vec2 uForce;
uniform float uRadius;
varying vec2 vUv;
void main() {
  float d = 1.0 - min(length((vUv - uCenter) / vec2(uRadius)), 1.0);
  gl_FragColor = vec4(uForce * d, 0.0, 1.0);
}
`

const FLUID_DIV = `
precision highp float;
uniform sampler2D uVelocity;
uniform vec2 uPx;
varying vec2 vUv;
void main() {
  float x0 = texture2D(uVelocity, vUv - vec2(uPx.x, 0.0)).x;
  float x1 = texture2D(uVelocity, vUv + vec2(uPx.x, 0.0)).x;
  float y0 = texture2D(uVelocity, vUv - vec2(0.0, uPx.y)).y;
  float y1 = texture2D(uVelocity, vUv + vec2(0.0, uPx.y)).y;
  gl_FragColor = vec4((x1 - x0 + y1 - y0) * 0.5);
}
`

const FLUID_JACOBI = `
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uPx;
varying vec2 vUv;
void main() {
  float x0 = texture2D(uPressure, vUv - vec2(uPx.x, 0.0)).r;
  float x1 = texture2D(uPressure, vUv + vec2(uPx.x, 0.0)).r;
  float y0 = texture2D(uPressure, vUv - vec2(0.0, uPx.y)).r;
  float y1 = texture2D(uPressure, vUv + vec2(0.0, uPx.y)).r;
  float d  = texture2D(uDivergence, vUv).r;
  gl_FragColor = vec4((x0 + x1 + y0 + y1 + -1.0 * d) * 0.25);
}
`

const FLUID_PROJECT = `
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uPx;
varying vec2 vUv;
void main() {
  float x0 = texture2D(uPressure, vUv - vec2(uPx.x, 0.0)).r;
  float x1 = texture2D(uPressure, vUv + vec2(uPx.x, 0.0)).r;
  float y0 = texture2D(uPressure, vUv - vec2(0.0, uPx.y)).r;
  float y1 = texture2D(uPressure, vUv + vec2(0.0, uPx.y)).r;
  vec2 v = texture2D(uVelocity, vUv).xy;
  gl_FragColor = vec4((v - vec2(x1 - x0, y1 - y0) * 0.5) * 0.999, 1.0, 1.0);
}
`

const FLUID_VIS = `
precision highp float;
uniform sampler2D uVelocity;
uniform sampler2D uPressure;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec2 vUv;
void main() {
  vec2 vel = texture2D(uVelocity, vUv).xy;
  float speed = length(vel) * 8.0;
  float pressure = texture2D(uPressure, vUv).r * 0.5 + 0.5;
  vec3 color = mix(uColorA, uColorB, clamp(speed, 0.0, 1.0));
  gl_FragColor = vec4(color * pressure * 1.5, 1.0);
}
`

const NOISE_FRAG = `
precision highp float;
uniform float uTime;
uniform float uScale;
uniform float uSpeed;
uniform float uContrast;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec2 uResolution;
varying vec2 vUv;

// 2D simplex noise approximation
vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289((x*34.0+1.0)*x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for(int i=0; i<5; i++) { v += a * snoise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = vUv * uScale + vec2(uTime * uSpeed * 0.1);
  float n = fbm(p) * uContrast * 0.5 + 0.5;

  // Curl-like visualization
  float eps = 0.01;
  float dx = (fbm(p + vec2(eps, 0.0)) - fbm(p - vec2(eps, 0.0))) / (2.0 * eps);
  float dy = (fbm(p + vec2(0.0, eps)) - fbm(p - vec2(0.0, eps))) / (2.0 * eps);
  float angle = atan(dy, dx) / 3.14159 * 0.5 + 0.5;

  vec3 color = mix(uColorA, uColorB, angle);
  color *= 0.5 + n * 0.5;
  gl_FragColor = vec4(color, 1.0);
}
`

// ── Helpers ────────────────────────────────────────────
function makeRT(w: number, h: number) {
  return new THREE.WebGLRenderTarget(w, h, {
    type: THREE.FloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  })
}

function makeFullscreenMaterial(frag: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    vertexShader: FLUID_VERT,
    fragmentShader: frag,
    uniforms,
    depthTest: false,
    depthWrite: false,
  })
}

// ── Engine ─────────────────────────────────────────────
export interface EngineParams {
  count?: number
  speed?: number
  spring?: number
  damping?: number
  noiseScale?: number
  noiseSpeed?: number
  attraction?: number
  repulRadius?: number
  repulStrength?: number
  particleSize?: number
  friction?: number
  colorMix?: number
  threshold?: number
  viscosity?: number
  forceRadius?: number
  iterations?: number
  noiseContrast?: number
  colorA?: string
  colorB?: string
}

export class ParticleEngine {
  private renderer!: THREE.WebGLRenderer
  private scene!: THREE.Scene
  private camera!: THREE.OrthographicCamera
  private points!: THREE.Points
  private geometry!: THREE.BufferGeometry
  private material!: THREE.ShaderMaterial
  private animId = 0
  private noise3D = createNoise3D()

  // Particle buffers
  private positions!: Float32Array
  private velocities!: Float32Array
  private targets!: Float32Array
  private hasTargets = false
  private colors!: Float32Array
  private alphas!: Float32Array
  private sizes!: Float32Array
  private seeds!: Float32Array

  // State
  private effectId: EffectId = 'swarm'
  private params: Required<EngineParams>
  private mouseX = 0
  private mouseY = 0
  private prevMouseX = 0
  private prevMouseY = 0
  private isMouseDown = false
  private lastTime = 0
  private count = 6000
  private width = 800
  private height = 600

  // Fluid state
  private fluidScene!: THREE.Scene
  private fluidCamera!: THREE.OrthographicCamera
  private fluidQuad!: THREE.Mesh
  private rtVelA!: THREE.WebGLRenderTarget
  private rtVelB!: THREE.WebGLRenderTarget
  private rtPressA!: THREE.WebGLRenderTarget
  private rtPressB!: THREE.WebGLRenderTarget
  private rtDiv!: THREE.WebGLRenderTarget
  private mAdvect!: THREE.ShaderMaterial
  private mForce!: THREE.ShaderMaterial
  private mDiv!: THREE.ShaderMaterial
  private mJacobi!: THREE.ShaderMaterial
  private mProject!: THREE.ShaderMaterial
  private mVis!: THREE.ShaderMaterial

  // Noise field state
  private noiseScene!: THREE.Scene
  private noiseMat!: THREE.ShaderMaterial

  // Color state
  private colorAVec = new THREE.Color(0x78d2aa)
  private colorBVec = new THREE.Color(0x3a7cbd)

  // Video element for video mode
  private videoEl: HTMLVideoElement | null = null
  private videoCanvas: HTMLCanvasElement | null = null
  private videoCtx: CanvasRenderingContext2D | null = null

  constructor(canvas: HTMLCanvasElement, params: EngineParams = {}) {
    this.params = {
      count: 6000, speed: 1.2, spring: 5, damping: 4,
      noiseScale: 0.6, noiseSpeed: 0.18,
      attraction: 1.5, repulRadius: 120, repulStrength: 3,
      particleSize: 2.5, friction: 4, colorMix: 0.7,
      threshold: 0.2, viscosity: 0.998, forceRadius: 0.05,
      iterations: 25, noiseContrast: 1.5,
      colorA: '#78d2aa', colorB: '#3a7cbd',
      ...params,
    }
    this.count = this.params.count
    this.initRenderer(canvas)
    this.initParticles()
    this.initFluid()
    this.initNoiseField()
    this.bindMouse(canvas)
    this.tick(0)
  }

  // ── Init ─────────────────────────────────────────────
  private initRenderer(canvas: HTMLCanvasElement) {
    this.width = canvas.clientWidth || window.innerWidth
    this.height = canvas.clientHeight || window.innerHeight

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.width, this.height)
    this.renderer.setClearColor(0x050507, 1)

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(
      -this.width / 2, this.width / 2,
      this.height / 2, -this.height / 2,
      0.1, 100
    )
    this.camera.position.z = 10
  }

  private initParticles() {
    const N = this.count
    this.positions = new Float32Array(N * 3)
    this.velocities = new Float32Array(N * 2)
    this.targets = new Float32Array(N * 3)
    this.colors = new Float32Array(N * 3)
    this.alphas = new Float32Array(N)
    this.sizes = new Float32Array(N)
    this.seeds = new Float32Array(N)

    const colorA = this.colorAVec
    const colorB = this.colorBVec

    for (let i = 0; i < N; i++) {
      // Random initial position
      this.positions[i * 3]     = (Math.random() - 0.5) * this.width
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * this.height
      this.positions[i * 3 + 2] = 0
      this.seeds[i] = Math.random() * 100
      // Default color: lerp between colorA and colorB
      const t = Math.random()
      this.colors[i * 3]     = colorA.r + (colorB.r - colorA.r) * t
      this.colors[i * 3 + 1] = colorA.g + (colorB.g - colorA.g) * t
      this.colors[i * 3 + 2] = colorA.b + (colorB.b - colorA.b) * t
      this.alphas[i] = 0.5 + Math.random() * 0.5
      this.sizes[i] = this.params.particleSize * (0.5 + Math.random() * 0.8)
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position',     new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color',        new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('aAlpha',       new THREE.BufferAttribute(this.alphas, 1))
    this.geometry.setAttribute('aSize',        new THREE.BufferAttribute(this.sizes, 1))

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uPixelRatio: { value: this.renderer.getPixelRatio() },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.scene.add(this.points)
  }

  private initFluid() {
    const W = 512, H = 512
    this.rtVelA   = makeRT(W, H)
    this.rtVelB   = makeRT(W, H)
    this.rtPressA = makeRT(W, H)
    this.rtPressB = makeRT(W, H)
    this.rtDiv    = makeRT(W, H)

    const px = { value: new THREE.Vector2(1 / W, 1 / H) }

    this.mAdvect  = makeFullscreenMaterial(FLUID_ADVECT, {
      uSource:    { value: null }, uVelocity: { value: null },
      uPx: px, uDt: { value: 1.0 / 60 }, uScale: { value: 0.998 },
    })
    this.mForce   = makeFullscreenMaterial(FLUID_FORCE, {
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uForce:  { value: new THREE.Vector2(0, 0) },
      uRadius: { value: this.params.forceRadius },
    })
    this.mDiv     = makeFullscreenMaterial(FLUID_DIV,     { uVelocity: { value: null }, uPx: px })
    this.mJacobi  = makeFullscreenMaterial(FLUID_JACOBI,  { uPressure: { value: null }, uDivergence: { value: null }, uPx: px })
    this.mProject = makeFullscreenMaterial(FLUID_PROJECT, { uPressure: { value: null }, uVelocity:   { value: null }, uPx: px })
    this.mVis     = makeFullscreenMaterial(FLUID_VIS, {
      uVelocity: { value: null }, uPressure: { value: null },
      uColorA: { value: this.colorAVec },
      uColorB: { value: this.colorBVec },
    })

    this.fluidScene  = new THREE.Scene()
    this.fluidCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const geo = new THREE.PlaneGeometry(2, 2)
    this.fluidQuad = new THREE.Mesh(geo, this.mAdvect)
    this.fluidScene.add(this.fluidQuad)
  }

  private initNoiseField() {
    this.noiseScene = new THREE.Scene()
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.noiseScene.add(cam)
    this.noiseMat = makeFullscreenMaterial(NOISE_FRAG, {
      uTime:       { value: 0 },
      uScale:      { value: this.params.noiseScale * 3 },
      uSpeed:      { value: this.params.noiseSpeed },
      uContrast:   { value: this.params.noiseContrast },
      uColorA:     { value: this.colorAVec },
      uColorB:     { value: this.colorBVec },
      uResolution: { value: new THREE.Vector2(this.width, this.height) },
    })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.noiseMat)
    this.noiseScene.add(quad)
  }

  // ── Mouse ──────────────────────────────────────────
  private bindMouse(canvas: HTMLCanvasElement) {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect()
      this.mouseX = e.clientX - rect.left - this.width / 2
      this.mouseY = -(e.clientY - rect.top - this.height / 2)
    })
    canvas.addEventListener('mousedown', () => { this.isMouseDown = true })
    canvas.addEventListener('mouseup',   () => { this.isMouseDown = false })
    canvas.addEventListener('mouseleave',() => { this.isMouseDown = false })

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const t = e.touches[0]
      this.mouseX = t.clientX - rect.left - this.width / 2
      this.mouseY = -(t.clientY - rect.top - this.height / 2)
    }, { passive: false })
  }

  // ── Curl noise ─────────────────────────────────────
  private curl(x: number, y: number, t: number): [number, number] {
    const e = 0.01
    const n = this.noise3D
    const dx = (n(x, y + e, t) - n(x, y - e, t)) / (2 * e)
    const dy = -(n(x + e, y, t) - n(x - e, y, t)) / (2 * e)
    return [dx, dy]
  }

  // ── Simulation ─────────────────────────────────────
  private updateParticles(dt: number, time: number) {
    const {
      speed, spring, damping, noiseScale, noiseSpeed,
      attraction, repulRadius, repulStrength, particleSize, friction,
    } = this.params
    const hasT = this.hasTargets
    const mx = this.mouseX, my = this.mouseY
    const nS = noiseScale * 0.003
    const nT = time * noiseSpeed

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3, i2 = i * 2
      let px = this.positions[i3], py = this.positions[i3 + 1]
      let vx = this.velocities[i2], vy = this.velocities[i2 + 1]

      // Curl noise
      const [cnx, cny] = this.curl(
        (px + this.seeds[i] * 200) * nS,
        (py + this.seeds[i] * 200) * nS,
        nT
      )
      vx += cnx * speed * dt * 60
      vy += cny * speed * dt * 60

      // Spring toward target
      if (hasT) {
        const tx = this.targets[i3], ty = this.targets[i3 + 1]
        vx += (tx - px) * spring * dt
        vy += (ty - py) * damping * dt
      }

      // Free-swarm attraction toward cursor
      if (!hasT && this.effectId === 'swarm') {
        const ddx = mx - px, ddy = my - py
        const dist2 = ddx * ddx + ddy * ddy
        if (dist2 < 80000) {
          const dist = Math.sqrt(dist2) + 0.1
          vx += (ddx / dist) * attraction * dt * 20
          vy += (ddy / dist) * attraction * dt * 20
        }
      }

      // Cursor repulsion
      const dx = px - mx, dy = py - my
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001
      if (dist < repulRadius) {
        const force = ((repulRadius - dist) / repulRadius) ** 1.5
        vx += (dx / dist) * force * repulStrength * dt * 60
        vy += (dy / dist) * force * repulStrength * dt * 60
      }

      // Friction
      const fric = 1 - friction * dt
      vx *= fric
      vy *= fric

      px += vx
      py += vy

      // Wrap at canvas edges (swarm mode only)
      if (!hasT) {
        const hw = this.width / 2 + 20, hh = this.height / 2 + 20
        if (px > hw) px -= this.width + 40
        if (px < -hw) px += this.width + 40
        if (py > hh) py -= this.height + 40
        if (py < -hh) py += this.height + 40
      }

      this.positions[i3] = px
      this.positions[i3 + 1] = py
      this.velocities[i2] = vx
      this.velocities[i2 + 1] = vy

      // Update size per particle
      this.sizes[i] = particleSize * (0.5 + 0.8 * (Math.sin(this.seeds[i] * 3.7 + time * 0.5) * 0.5 + 0.5))
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.aSize.needsUpdate = true
  }

  private updateVideoTargets() {
    if (!this.videoEl || !this.videoCanvas || !this.videoCtx) return
    const v = this.videoEl
    if (v.readyState < 2) return

    const vw = this.videoCanvas.width, vh = this.videoCanvas.height
    this.videoCtx.drawImage(v, 0, 0, vw, vh)
    const data = this.videoCtx.getImageData(0, 0, vw, vh).data

    const bright: [number, number][] = []
    const threshold = this.params.threshold * 255
    for (let y = 0; y < vh; y += 2) {
      for (let x = 0; x < vw; x += 2) {
        const idx = (y * vw + x) * 4
        const lum = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114
        if (lum > threshold) {
          bright.push([
            (x / vw - 0.5) * this.width,
            -(y / vh - 0.5) * this.height,
          ])
        }
      }
    }

    if (bright.length === 0) return
    for (let i = 0; i < this.count; i++) {
      const p = bright[Math.floor(Math.random() * bright.length)]
      this.targets[i * 3]     = p[0] + (Math.random() - 0.5) * 4
      this.targets[i * 3 + 1] = p[1] + (Math.random() - 0.5) * 4
    }
    this.hasTargets = true
  }

  private fluidStep(dt: number) {
    const render = (mat: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget) => {
      this.fluidQuad.material = mat
      this.renderer.setRenderTarget(target)
      this.renderer.render(this.fluidScene, this.fluidCamera)
    }

    // Advect velocity
    this.mAdvect.uniforms.uSource.value   = this.rtVelA.texture
    this.mAdvect.uniforms.uVelocity.value = this.rtVelA.texture
    this.mAdvect.uniforms.uScale.value    = this.params.viscosity
    render(this.mAdvect, this.rtVelB)

    // Add mouse force
    const mdx = this.mouseX - this.prevMouseX
    const mdy = this.mouseY - this.prevMouseY
    if (Math.abs(mdx) + Math.abs(mdy) > 0.5) {
      this.mForce.uniforms.uCenter.value.set(
        (this.mouseX + this.width / 2) / this.width,
        (this.mouseY + this.height / 2) / this.height,
      )
      this.mForce.uniforms.uForce.value.set(mdx * 0.003, mdy * 0.003)
      this.mForce.uniforms.uRadius.value = this.params.forceRadius
      render(this.mForce, this.rtVelA)
      // Blend force into vel: copy rtVelB first
      this.mAdvect.uniforms.uSource.value   = this.rtVelB.texture
      this.mAdvect.uniforms.uVelocity.value = this.rtVelA.texture
      this.mAdvect.uniforms.uScale.value    = 1.0
      render(this.mAdvect, this.rtVelB)
    }

    // Divergence
    this.mDiv.uniforms.uVelocity.value = this.rtVelB.texture
    render(this.mDiv, this.rtDiv)

    // Pressure solve (Jacobi)
    this.renderer.setRenderTarget(this.rtPressA)
    this.renderer.clearColor()
    for (let i = 0; i < this.params.iterations; i++) {
      this.mJacobi.uniforms.uPressure.value   = (i % 2 === 0 ? this.rtPressA : this.rtPressB).texture
      this.mJacobi.uniforms.uDivergence.value = this.rtDiv.texture
      render(this.mJacobi, i % 2 === 0 ? this.rtPressB : this.rtPressA)
    }

    // Project
    this.mProject.uniforms.uPressure.value = this.rtPressA.texture
    this.mProject.uniforms.uVelocity.value = this.rtVelB.texture
    render(this.mProject, this.rtVelA)
  }

  // ── Main loop ───────────────────────────────────────
  private tick = (time: number) => {
    this.animId = requestAnimationFrame(this.tick)
    const dt = Math.min((time - this.lastTime) / 1000, 0.05)
    this.lastTime = time

    this.renderer.setRenderTarget(null)

    if (this.effectId === 'video') this.updateVideoTargets()
    this.updateParticles(dt, time * 0.001)
    this.renderer.render(this.scene, this.camera)

    this.prevMouseX = this.mouseX
    this.prevMouseY = this.mouseY
  }

  // ── Public API ──────────────────────────────────────
  setEffect(id: EffectId) {
    this.effectId = id
    this.hasTargets = false
    // Reset particles to random positions when switching to free effects
    if (id === 'swarm') {
      for (let i = 0; i < this.count; i++) {
        this.positions[i * 3]     = (Math.random() - 0.5) * this.width
        this.positions[i * 3 + 1] = (Math.random() - 0.5) * this.height
        this.velocities[i * 2]    = 0
        this.velocities[i * 2 + 1] = 0
      }
      this.geometry.attributes.position.needsUpdate = true
    }
    this.renderer.setClearColor(0x050507, 1)
  }

  setTextTargets(text: string) {
    if (!text.trim()) { this.hasTargets = false; return }
    const offscreen = document.createElement('canvas')
    const scale = Math.min(this.width / 800, 2)
    offscreen.width  = this.width
    offscreen.height = this.height
    const ctx = offscreen.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, offscreen.width, offscreen.height)
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${Math.floor(120 * scale)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // Word wrap
    const words = text.split(' ')
    const lines: string[] = []
    let line = ''
    for (const w of words) {
      const test = line ? line + ' ' + w : w
      if (ctx.measureText(test).width > this.width * 0.85 && line) {
        lines.push(line); line = w
      } else { line = test }
    }
    lines.push(line)
    const lineH = Math.floor(130 * scale)
    const startY = offscreen.height / 2 - ((lines.length - 1) * lineH) / 2
    lines.forEach((l, i) => ctx.fillText(l, offscreen.width / 2, startY + i * lineH))

    const data  = ctx.getImageData(0, 0, offscreen.width, offscreen.height).data
    const bright: [number, number][] = []
    for (let y = 0; y < offscreen.height; y += 3) {
      for (let x = 0; x < offscreen.width; x += 3) {
        if (data[(y * offscreen.width + x) * 4] > 128)
          bright.push([x - offscreen.width / 2, -(y - offscreen.height / 2)])
      }
    }

    if (bright.length === 0) return
    for (let i = 0; i < this.count; i++) {
      const p = bright[Math.floor(Math.random() * bright.length)]
      this.targets[i * 3]     = p[0] + (Math.random() - 0.5) * 3
      this.targets[i * 3 + 1] = p[1] + (Math.random() - 0.5) * 3
    }
    // Reset velocities for cleaner formation
    this.velocities.fill(0)
    this.hasTargets = true
  }

  setImageTargets(img: HTMLImageElement | HTMLCanvasElement, colorMix = 0.7) {
    const offscreen = document.createElement('canvas')
    const aspect = img instanceof HTMLImageElement
      ? img.naturalWidth / img.naturalHeight
      : img.width / img.height
    const canvasAspect = this.width / this.height

    let drawW, drawH, offsetX = 0, offsetY = 0
    if (aspect > canvasAspect) {
      drawW = this.width; drawH = this.width / aspect
      offsetY = (this.height - drawH) / 2
    } else {
      drawH = this.height; drawW = this.height * aspect
      offsetX = (this.width - drawW) / 2
    }

    offscreen.width = this.width
    offscreen.height = this.height
    const ctx = offscreen.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, this.width, this.height)
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH)

    const data = ctx.getImageData(0, 0, this.width, this.height).data
    const bright: [number, number, number, number, number][] = [] // x, y, r, g, b

    for (let y = 0; y < this.height; y += 3) {
      for (let x = 0; x < this.width; x += 3) {
        const idx = (y * this.width + x) * 4
        const lum = data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114
        if (lum > 30) {
          bright.push([
            x - this.width / 2,
            -(y - this.height / 2),
            data[idx] / 255,
            data[idx+1] / 255,
            data[idx+2] / 255,
          ])
        }
      }
    }

    if (bright.length === 0) return
    const ca = this.colorAVec

    for (let i = 0; i < this.count; i++) {
      const p = bright[Math.floor(Math.random() * bright.length)]
      this.targets[i * 3]     = p[0]
      this.targets[i * 3 + 1] = p[1]
      // Blend image color with colorA
      this.colors[i * 3]     = ca.r * (1 - colorMix) + p[2] * colorMix
      this.colors[i * 3 + 1] = ca.g * (1 - colorMix) + p[3] * colorMix
      this.colors[i * 3 + 2] = ca.b * (1 - colorMix) + p[4] * colorMix
    }
    this.geometry.attributes.color.needsUpdate = true
    this.velocities.fill(0)
    this.hasTargets = true
  }

  setVideoElement(video: HTMLVideoElement) {
    this.videoEl = video
    this.videoCanvas = document.createElement('canvas')
    this.videoCanvas.width  = 160
    this.videoCanvas.height = 90
    this.videoCtx = this.videoCanvas.getContext('2d')!
  }

  setParam(key: string, value: number) {
    (this.params as unknown as Record<string, number>)[key] = value
    if (key === 'count') {
      // Rebuild geometry with new particle count
      const newCount = Math.round(value)
      if (newCount !== this.count) {
        this.count = newCount
        this.scene.remove(this.points)
        this.geometry.dispose()
        this.initParticles()
      }
    } else if (key === 'particleSize') {
      for (let i = 0; i < this.count; i++)
        this.sizes[i] = value * (0.5 + Math.random() * 0.8)
      this.geometry.attributes.aSize.needsUpdate = true
    }
  }

  setColors(colorA: string, colorB: string) {
    this.colorAVec.set(colorA)
    this.colorBVec.set(colorB)
    // Update particle colors
    for (let i = 0; i < this.count; i++) {
      const t = Math.random()
      this.colors[i * 3]     = this.colorAVec.r + (this.colorBVec.r - this.colorAVec.r) * t
      this.colors[i * 3 + 1] = this.colorAVec.g + (this.colorBVec.g - this.colorAVec.g) * t
      this.colors[i * 3 + 2] = this.colorAVec.b + (this.colorBVec.b - this.colorAVec.b) * t
    }
    this.geometry.attributes.color.needsUpdate = true
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.renderer.setSize(width, height)
    this.camera.left   = -width / 2
    this.camera.right  =  width / 2
    this.camera.top    =  height / 2
    this.camera.bottom = -height / 2
    this.camera.updateProjectionMatrix()
    this.material.uniforms.uPixelRatio.value = this.renderer.getPixelRatio()
  }

  dispose() {
    cancelAnimationFrame(this.animId)
    this.geometry.dispose()
    this.material.dispose()
    this.renderer.dispose()
    ;[this.rtVelA, this.rtVelB, this.rtPressA, this.rtPressB, this.rtDiv].forEach(rt => rt.dispose())
  }
}
