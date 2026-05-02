'use client'
import { useState, useCallback } from 'react'
import {
  Wind, Type, ImageIcon, Video,
  ChevronDown, ChevronRight, RotateCcw,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import InputZone from './InputZone'
import { EFFECTS, DEFAULT_PARAMS, type EffectId, type EffectDef } from '@/lib/effects'

const ICONS: Record<EffectId, React.ReactNode> = {
  swarm: <Wind size={14} />,
  text:  <Type size={14} />,
  image: <ImageIcon size={14} />,
  video: <Video size={14} />,
}

interface Props {
  effectId: EffectId
  params: Record<string, number>
  colorA: string
  colorB: string
  onEffectChange: (id: EffectId) => void
  onParamChange:  (key: string, val: number) => void
  onColorChange:  (a: string, b: string) => void
  onInputChange:  (data: any) => void
}

const PRESETS: { label: string; colorA: string; colorB: string }[] = [
  { label: 'Mint',    colorA: '#78d2aa', colorB: '#3a7cbd' },
  { label: 'Ember',   colorA: '#ff6b35', colorB: '#ffb347' },
  { label: 'Violet',  colorA: '#b47fdd', colorB: '#4a2fa0' },
  { label: 'Snow',    colorA: '#e8e3dc', colorB: '#8ba5bb' },
  { label: 'Gold',    colorA: '#f5c842', colorB: '#c87941' },
  { label: 'Rose',    colorA: '#ff7eb3', colorB: '#ff4466' },
]

export default function ControlPanel({
  effectId, params, colorA, colorB,
  onEffectChange, onParamChange, onColorChange, onInputChange,
}: Props) {
  const [paramsOpen, setParamsOpen] = useState(true)
  const effect = EFFECTS.find(e => e.id === effectId)!

  const handleReset = useCallback(() => {
    for (const p of effect.params) onParamChange(p.key, p.default)
  }, [effect, onParamChange])

  return (
    <aside
      className="flex flex-col h-full"
      style={{
        width: 272,
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--panel)',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
      }}
    >
      {/* App name */}
      <div className="px-4 py-3 flex items-baseline gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--foreground)' }}>
          Fragment
        </span>
        <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>shader studio</span>
      </div>

      {/* Effect selector */}
      <div className="flex flex-col gap-0.5 px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--muted-foreground)' }}>
          Effect
        </p>
        {EFFECTS.map(e => (
          <button
            key={e.id}
            onClick={() => onEffectChange(e.id)}
            className="flex items-center gap-2.5 rounded px-2.5 py-1.5 text-left transition-colors text-sm"
            style={{
              background: e.id === effectId ? 'var(--mint-dim, oklch(0.74 0.11 163 / 8%))' : 'transparent',
              color: e.id === effectId ? 'var(--mint, oklch(0.74 0.11 163))' : 'var(--muted-foreground)',
              border: '1px solid transparent',
              borderColor: e.id === effectId ? 'var(--border)' : 'transparent',
            }}
          >
            <span style={{ opacity: e.id === effectId ? 1 : 0.5 }}>{ICONS[e.id]}</span>
            <span className="font-mono text-xs">{e.name}</span>
            {e.id === effectId && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--mint)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Input zone */}
      {effect.inputs.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-xs uppercase tracking-widest px-4 pt-3 pb-1" style={{ color: 'var(--muted-foreground)' }}>
            Input
          </p>
          <InputZone effectId={effectId} onInputChange={onInputChange} />
        </div>
      )}

      {/* Color palette */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--muted-foreground)' }}>
          Palette
        </p>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => onColorChange(preset.colorA, preset.colorB)}
              title={preset.label}
              className="rounded h-7 transition-all"
              style={{
                background: `linear-gradient(135deg, ${preset.colorA}, ${preset.colorB})`,
                border: (colorA === preset.colorA && colorB === preset.colorB)
                  ? '2px solid var(--foreground)'
                  : '1px solid transparent',
                transform: (colorA === preset.colorA && colorB === preset.colorB) ? 'scale(1.05)' : 'scale(1)',
              }}
            />
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-1.5">
            <label className="text-xs" style={{ color: 'var(--muted-foreground)' }}>A</label>
            <input
              type="color"
              value={colorA}
              onChange={e => onColorChange(e.target.value, colorB)}
              className="rounded cursor-pointer"
              style={{ width: 28, height: 20, padding: 1, background: 'none', border: '1px solid var(--border)' }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs" style={{ color: 'var(--muted-foreground)' }}>B</label>
            <input
              type="color"
              value={colorB}
              onChange={e => onColorChange(colorA, e.target.value)}
              className="rounded cursor-pointer"
              style={{ width: 28, height: 20, padding: 1, background: 'none', border: '1px solid var(--border)' }}
            />
          </div>
          <div
            className="flex-1 h-5 rounded"
            style={{ background: `linear-gradient(90deg, ${colorA}, ${colorB})` }}
          />
        </div>
      </div>

      {/* Parameters */}
      {effect.params.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setParamsOpen(o => !o)}
              className="flex items-center gap-1 text-xs uppercase tracking-widest"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {paramsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Parameters
            </button>
            <button
              onClick={handleReset}
              title="Reset to defaults"
              className="p-0.5 rounded transition-colors hover:opacity-100 opacity-40"
            >
              <RotateCcw size={11} />
            </button>
          </div>

          {paramsOpen && (
            <div className="flex flex-col gap-4">
              {effect.params.map(p => {
                const val = params[p.key] ?? p.default
                return (
                  <div key={p.key} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-baseline">
                      <label className="text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                        {p.label}
                      </label>
                      <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--foreground)' }}>
                        {p.step < 1 ? val.toFixed(2) : Math.round(val)}
                        {p.unit ? ` ${p.unit}` : ''}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={val}
                      onChange={e => onParamChange(p.key, parseFloat(e.target.value))}
                      className="w-full"
                      style={{ accentColor: 'var(--mint)' }}
                    />
                    <div className="flex justify-between">
                      <span className="text-xs tabular-nums" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>{p.min}</span>
                      <span className="text-xs tabular-nums" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>{p.max}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-xs" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>
          {effect.description}
        </p>
      </div>
    </aside>
  )
}
