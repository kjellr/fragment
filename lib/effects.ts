export type EffectId = 'image' | 'video' | 'text' | 'swarm' | 'grid'

export interface ParamDef {
  key: string
  label: string
  min: number
  max: number
  default: number
  step: number
  unit?: string
}

export interface EffectDef {
  id: EffectId
  name: string
  description: string
  category: 'particles' | 'fluid' | 'field'
  inputs: ('text' | 'image' | 'video')[]
  params: ParamDef[]
}

export const EFFECTS: EffectDef[] = [
  {
    id: 'image',
    name: 'Image',
    description: 'Particles sample image pixels for position and color.',
    category: 'particles',
    inputs: ['image'],
    params: [
      { key: 'count',           label: 'Particles',    min: 1000, max: 20000, default: 10000, step: 1000 },
      { key: 'spring',          label: 'Spring',       min: 0.5,  max: 15,    default: 6,    step: 0.5 },
      { key: 'noiseScale',      label: 'Noise scale',  min: 0,    max: 2,     default: 0.25, step: 0.05 },
      { key: 'noiseSpeed',      label: 'Noise speed',  min: 0,    max: 1,     default: 0.06, step: 0.01 },
      { key: 'repulRadius',     label: 'Repel radius', min: 20,   max: 300,   default: 80,   step: 10, unit: 'px' },
      { key: 'repulStrength',   label: 'Repel force',  min: 0,    max: 15,    default: 4,    step: 0.5 },
      { key: 'particleSize',    label: 'Size',         min: 1,    max: 8,     default: 2.5,  step: 0.1, unit: 'px' },
      { key: 'colorMix',        label: 'Color mix',    min: 0,    max: 1,     default: 0.7,  step: 0.05 },
      { key: 'brightness',      label: 'Brightness',   min: 0.1,  max: 4,     default: 1,    step: 0.05 },
      { key: 'zoom',            label: 'Zoom',         min: 0.25, max: 4,     default: 1,    step: 0.05 },
    ],
  },
  {
    id: 'video',
    name: 'Video',
    description: 'Particle density tracks video luminance in real time.',
    category: 'particles',
    inputs: ['video'],
    params: [
      { key: 'count',           label: 'Particles',    min: 1000, max: 20000, default: 20000, step: 1000 },
      { key: 'repulRadius',     label: 'Repel radius', min: 20,   max: 300,   default: 80,   step: 10, unit: 'px' },
      { key: 'repulStrength',   label: 'Repel force',  min: 0,    max: 15,    default: 4,    step: 0.5 },
      { key: 'particleSize',    label: 'Size',         min: 1,    max: 8,     default: 1.7,  step: 0.1, unit: 'px' },
      { key: 'threshold',       label: 'Threshold',    min: 0,    max: 1,     default: 0.1,  step: 0.02 },
      { key: 'jitter',          label: 'Jitter',       min: 0,    max: 5,     default: 0.3,  step: 0.1 },
      { key: 'brightness',      label: 'Brightness',   min: 0.1,  max: 4,     default: 1.5,  step: 0.05 },
      { key: 'zoom',            label: 'Zoom',         min: 0.25, max: 4,     default: 2,    step: 0.05 },
    ],
  },
  {
    id: 'text',
    name: 'Text',
    description: 'Particles form your text. Cursor scatters them.',
    category: 'particles',
    inputs: ['text'],
    params: [
      { key: 'count',           label: 'Particles',    min: 500,  max: 15000, default: 8000, step: 500 },
      { key: 'spring',          label: 'Spring',       min: 0.5,  max: 15,    default: 5,    step: 0.5 },
      { key: 'noiseScale',      label: 'Noise scale',  min: 0,    max: 2,     default: 0.3,  step: 0.05 },
      { key: 'noiseSpeed',      label: 'Noise speed',  min: 0,    max: 1,     default: 0.08, step: 0.01 },
      { key: 'repulRadius',     label: 'Repel radius', min: 20,   max: 300,   default: 100,  step: 10, unit: 'px' },
      { key: 'repulStrength',   label: 'Repel force',  min: 0,    max: 15,    default: 5,    step: 0.5 },
      { key: 'particleSize',    label: 'Size',         min: 1,    max: 8,     default: 2.5,  step: 0.1, unit: 'px' },
      { key: 'brightness',      label: 'Brightness',   min: 0.1,  max: 4,     default: 1,    step: 0.05 },
      { key: 'zoom',            label: 'Zoom',         min: 0.25, max: 4,     default: 1,    step: 0.05 },
    ],
  },
  {
    id: 'swarm',
    name: 'Swarm',
    description: 'Curl-noise particle field. Cursor attracts.',
    category: 'particles',
    inputs: [],
    params: [
      { key: 'count',           label: 'Particles',    min: 500,  max: 15000, default: 6000, step: 500 },
      { key: 'speed',           label: 'Speed',        min: 0,    max: 5,     default: 0.1,  step: 0.1 },
      { key: 'noiseScale',      label: 'Noise scale',  min: 0.1,  max: 3,     default: 0.6,  step: 0.05 },
      { key: 'noiseSpeed',      label: 'Noise speed',  min: 0,    max: 2,     default: 0.18, step: 0.02 },
      { key: 'attraction',      label: 'Attraction',   min: 0,    max: 5,     default: 1.5,  step: 0.1 },
      { key: 'repulRadius',     label: 'Repel radius', min: 20,   max: 300,   default: 120,  step: 10, unit: 'px' },
      { key: 'repulStrength',   label: 'Repel force',  min: 0,    max: 10,    default: 3,    step: 0.2 },
      { key: 'particleSize',    label: 'Size',         min: 1,    max: 8,     default: 4.0,  step: 0.1, unit: 'px' },
      { key: 'friction',        label: 'Friction',     min: 0.5,  max: 15,    default: 4,    step: 0.5 },
      { key: 'brightness',      label: 'Brightness',   min: 0.1,  max: 4,     default: 1,    step: 0.05 },
      { key: 'zoom',            label: 'Zoom',         min: 0.25, max: 4,     default: 1,    step: 0.05 },
    ],
  },
  {
    id: 'grid',
    name: 'Grid',
    description: 'A dot grid that ripples. Click to create waves.',
    category: 'field',
    inputs: [],
    params: [
      { key: 'gridSpacing',  label: 'Spacing',        min: 4,   max: 80,  default: 30,  step: 1,    unit: 'px' },
      { key: 'dotRadius',    label: 'Dot size',        min: 0.1, max: 6,   default: 2.5, step: 0.05, unit: 'px' },
      { key: 'waveAmp',      label: 'Cursor push',     min: 0,   max: 120, default: 35,  step: 1,    unit: 'px' },
      { key: 'waveRadius',   label: 'Cursor radius',   min: 50,  max: 500, default: 150, step: 10,   unit: 'px' },
      { key: 'cursorForce',  label: 'Cursor force',    min: 0,   max: 5,   default: 1.0, step: 0.1 },
      { key: 'rippleAmp',    label: 'Ripple amp',      min: 0,   max: 100, default: 30,  step: 1,    unit: 'px' },
      { key: 'rippleSpeed',  label: 'Ripple speed',    min: 50,  max: 600, default: 200, step: 10,   unit: 'px/s' },
      { key: 'rippleFreq',   label: 'Ripple freq',     min: 0,   max: 5,   default: 0,   step: 0.1,  unit: 'Hz' },
    ],
  },
]

export const DEFAULT_PARAMS: Record<string, number> = Object.fromEntries(
  EFFECTS.flatMap(e => e.params.map(p => [p.key, p.default]))
)

export function getEffect(id: EffectId): EffectDef {
  return EFFECTS.find(e => e.id === id)!
}
