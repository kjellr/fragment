'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Wind, Type, ImageIcon, Video, Grid2x2,
  ChevronRight, RotateCcw, Copy, Check, X,
} from 'lucide-react'
import InputZone from './InputZone'
import { EFFECTS, VISIBLE_EFFECTS, DEFAULT_PARAMS, type EffectId, type EffectDef } from '@/lib/effects'

const ICONS: Record<EffectId, React.ReactNode> = {
  swarm: <Wind size={14} />,
  text:  <Type size={14} />,
  image: <ImageIcon size={14} />,
  video: <Video size={14} />,
  grid:  <Grid2x2 size={14} />,
}

interface Props {
  effectId: EffectId
  params: Record<string, number>
  colorA: string
  colorB: string
  colorMode: 'palette' | 'source'
  onEffectChange:    (id: EffectId) => void
  onParamChange:     (key: string, val: number) => void
  onColorChange:     (a: string, b: string) => void
  onColorModeChange: (mode: 'palette' | 'source') => void
  onInputChange:     (data: any) => void
  onClose?:          () => void
}

const PRESETS: { label: string; colorA: string; colorB: string }[] = [
  { label: 'Mint',    colorA: '#84e7bb', colorB: '#4088d0' },
  { label: 'Ember',   colorA: '#ff763a', colorB: '#ffc54e' },
  { label: 'Violet',  colorA: '#c68cf3', colorB: '#5134b0' },
  { label: 'Snow',    colorA: '#ffffff', colorB: '#99b5ce' },
  { label: 'Gold',    colorA: '#ffdc49', colorB: '#dc8547' },
  { label: 'Rose',    colorA: '#ff8bc5', colorB: '#ff4b70' },
]

export default function ControlPanel({
  effectId, params, colorA, colorB, colorMode,
  onEffectChange, onParamChange, onColorChange, onColorModeChange, onInputChange, onClose,
}: Props) {
  const [paramsOpen, setParamsOpen] = useState(true)
  const [inputOpen, setInputOpen] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const effect = EFFECTS.find(e => e.id === effectId)!

  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState({ top: 0, height: 0 })
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const idx = EFFECTS.filter(e => VISIBLE_EFFECTS.includes(e.id)).findIndex(e => e.id === effectId)
    const btn = buttonRefs.current[idx]
    if (btn) setIndicator({ top: btn.offsetTop, height: btn.offsetHeight })

    setFading(true)
    const t = setTimeout(() => setFading(false), 180)
    return () => clearTimeout(t)
  }, [effectId])

  const handleReset = useCallback(() => {
    for (const p of effect.params) onParamChange(p.key, p.default)
  }, [effect, onParamChange])

  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    const paramLines = effect.params.map(p => {
      const val = params[p.key] ?? p.default
      const display = p.step < 1 ? val.toFixed(2) : Math.round(val)
      return `  - ${p.label}: ${display}${p.unit ? ' ' + p.unit : ''} (range: ${p.min}–${p.max})`
    }).join('\n')

    const text = [
      `Effect: ${effect.name}`,
      `Description: ${effect.description}`,
      ``,
      `Color A: ${colorA}`,
      `Color B: ${colorB}`,
      ``,
      `Parameters:`,
      paramLines,
    ].join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [effect, params, colorA, colorB])

  return (
    <aside
      className="flex flex-col h-full w-[90vw] lg:w-[312px]"
      style={{
        flexShrink: 0,
        borderLeft: '1px solid var(--border)',
        background: 'var(--panel)',
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'thin',
      }}
    >
      {/* App name */}
      <div className="flex px-4 py-3 items-baseline gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="hidden lg:inline" style={{ fontFamily: 'var(--font-serif)', fontSize: 24, color: 'var(--foreground)', lineHeight: 1 }}>
          Fragment
        </span>
        <span className="hidden lg:inline text-sm lg:text-xs" style={{ color: 'var(--muted-foreground)' }}>shader studio</span>
        <div className="ml-auto flex items-center gap-1" style={{ alignSelf: 'center' }}>
        <div className="relative group">
          <button
            onClick={handleCopy}
            className="rounded"
            className="rounded w-11 h-11 lg:w-7 lg:h-7 flex items-center justify-center flex-shrink-0"
            style={{ color: copied ? 'var(--mint)' : 'var(--muted-foreground)' }}
          >
            {copied
              ? (
                <span key="check" style={{ display: 'inline-flex', animation: 'icon-check-in 250ms ease-out both' }}>
                  <Check size={13} />
                </span>
              ) : (
                <Copy size={13} key="copy" />
              )
            }
          </button>
          <div
            className="absolute right-0 top-full mt-1.5 px-2 py-1 rounded text-xs pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
          >
            Copy prompt
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden rounded w-11 h-11 lg:w-7 lg:h-7 flex items-center justify-center flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <X size={16} />
          </button>
        )}
        </div>
      </div>

      {/* Effect selector */}
      <div className="flex flex-col gap-0.5 px-3 py-3" style={{ borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <p className="text-sm lg:text-xs uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--muted-foreground)' }}>
          Effect
        </p>
        {/* Sliding background pill */}
        {indicator.height > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              top: indicator.top,
              height: indicator.height,
              background: 'var(--mint-dim, oklch(0.74 0.11 163 / 8%))',
              border: '1px solid var(--border)',
              borderRadius: 4,
              transition: 'top 200ms cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'none',
            }}
          />
        )}
        {EFFECTS.filter(e => VISIBLE_EFFECTS.includes(e.id)).map((e, i) => (
          <button
            key={e.id}
            ref={el => { buttonRefs.current[i] = el }}
            onClick={() => onEffectChange(e.id)}
            className="flex items-center gap-2.5 rounded px-2.5 min-h-[44px] lg:min-h-0 lg:py-1.5 text-left text-sm cursor-pointer"
            style={{
              position: 'relative',
              background: 'transparent',
              color: e.id === effectId ? 'var(--mint, oklch(0.74 0.11 163))' : 'var(--muted-foreground)',
              border: '1px solid transparent',
            }}
          >
            <span style={{ opacity: e.id === effectId ? 1 : 0.5 }}>{ICONS[e.id]}</span>
            <span className="font-mono text-sm lg:text-xs">{e.name}</span>
            {e.id === effectId && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: 'var(--mint)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Panels — fade on effect switch */}
      <div style={{ opacity: fading ? 0 : 1, transition: 'opacity 180ms ease' }}>

      {/* Input zone */}
      {effect.inputs.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setInputOpen(o => !o)}
            className="flex items-center gap-1.5 text-sm lg:text-xs uppercase tracking-widest w-full px-4 py-4 lg:py-3"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <ChevronRight
              size={12}
              style={{ transition: 'transform 200ms ease', transform: inputOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
            Input
          </button>
          <div style={{
            display: 'grid',
            gridTemplateRows: inputOpen ? '1fr' : '0fr',
            transition: 'grid-template-rows 220ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{ overflow: 'hidden' }}>
              <InputZone effectId={effectId} onInputChange={onInputChange} />
            </div>
          </div>
        </div>
      )}

      {/* Color palette */}
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setPaletteOpen(o => !o)}
          className="flex items-center gap-1.5 text-sm lg:text-xs uppercase tracking-widest w-full px-4 py-4 lg:py-3"
          style={{ color: 'var(--muted-foreground)' }}
        >
          <ChevronRight
            size={12}
            style={{ transition: 'transform 200ms ease', transform: paletteOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
          Palette
        </button>
        <div style={{
          display: 'grid',
          gridTemplateRows: paletteOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          <div style={{ overflow: 'hidden' }}>
            <div className="px-4 pb-3">
              {/* Source option — image/video only */}
              {(effectId === 'image' || effectId === 'video') && (
                <button
                  onClick={() => onColorModeChange('source')}
                  className="w-full rounded h-11 lg:h-7 mb-1.5 transition-all text-sm lg:text-xs font-mono"
                  style={{
                    background: 'transparent',
                    border: colorMode === 'source' ? '2px solid var(--foreground)' : '1px solid var(--border)',
                    color: colorMode === 'source' ? 'var(--foreground)' : 'var(--muted-foreground)',
                    transform: colorMode === 'source' ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  Default
                </button>
              )}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => onColorChange(preset.colorA, preset.colorB)}
                    title={preset.label}
                    className="rounded h-11 lg:h-7 transition-all"
                    style={{
                      background: `linear-gradient(135deg, ${preset.colorA}, ${preset.colorB})`,
                      border: colorMode === 'palette' && colorA === preset.colorA && colorB === preset.colorB
                        ? '2px solid var(--foreground)'
                        : '1px solid transparent',
                      transform: colorMode === 'palette' && colorA === preset.colorA && colorB === preset.colorB ? 'scale(1.05)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm lg:text-xs" style={{ color: 'var(--muted-foreground)' }}>A</label>
                  <input
                    type="color"
                    value={colorA}
                    onChange={e => onColorChange(e.target.value, colorB)}
                    className="rounded cursor-pointer w-11 h-11 lg:w-7 lg:h-5"
                    style={{ padding: 2, background: 'none', border: '1px solid var(--border)' }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-sm lg:text-xs" style={{ color: 'var(--muted-foreground)' }}>B</label>
                  <input
                    type="color"
                    value={colorB}
                    onChange={e => onColorChange(colorA, e.target.value)}
                    className="rounded cursor-pointer w-11 h-11 lg:w-7 lg:h-5"
                    style={{ padding: 2, background: 'none', border: '1px solid var(--border)' }}
                  />
                </div>
                <div
                  className="flex-1 h-11 lg:h-5 rounded"
                  style={{ background: `linear-gradient(90deg, ${colorA}, ${colorB})` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Parameters */}
      {effect.params.length > 0 && (
        <div>
          <div className="flex items-center px-4 py-4 lg:py-3">
            <button
              onClick={() => setParamsOpen(o => !o)}
              className="flex items-center gap-1.5 text-sm lg:text-xs uppercase tracking-widest flex-1"
              style={{ color: 'var(--muted-foreground)' }}
            >
              <ChevronRight
                size={12}
                style={{ transition: 'transform 200ms ease', transform: paramsOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
              Parameters
            </button>
            <button
              onClick={handleReset}
              title="Reset to defaults"
              className="flex items-center justify-center w-11 h-11 lg:w-7 lg:h-7 rounded transition-colors hover:opacity-100 opacity-40"
            >
              <RotateCcw size={11} />
            </button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateRows: paramsOpen ? '1fr' : '0fr',
            transition: 'grid-template-rows 220ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            <div style={{ overflow: 'hidden' }}>
              <div className="flex flex-col gap-6 lg:gap-4 px-4 pb-4 lg:pb-3">
                {effect.params.filter(p => !(p.key === 'colorMix' && colorMode === 'source')).map(p => {
                  const val = params[p.key] ?? p.default
                  return (
                    <div key={p.key} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-baseline">
                        <label className="text-sm lg:text-xs font-mono" style={{ color: 'var(--muted-foreground)' }}>
                          {p.label}
                        </label>
                        <span className="text-sm lg:text-xs font-mono tabular-nums" style={{ color: 'var(--foreground)' }}>
                          {p.step < 1 ? val.toFixed(2) : Math.round(val)}
                          {p.unit ? ` ${p.unit}` : ''}
                        </span>
                      </div>
                      <div className="py-2 lg:py-0">
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
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm lg:text-xs tabular-nums" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>{p.min}</span>
                        <span className="text-sm lg:text-xs tabular-nums" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }}>{p.max}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      </div>{/* end fading panels */}

      {/* Footer */}
      <div className="mt-auto px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-sm lg:text-xs" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>
          {effect.description}
        </p>
      </div>
    </aside>
  )
}
