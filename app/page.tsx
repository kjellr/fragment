'use client'
import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import ControlPanel from '@/components/ControlPanel'
import { DEFAULT_PARAMS, EFFECTS, type EffectId } from '@/lib/effects'

const ShaderCanvas = dynamic(() => import('@/components/ShaderCanvas'), { ssr: false })

const IMAGE_DEFAULTS: Record<string, number> = {
  count:        10000,
  spring:       15,
  damping:      3,
  noiseScale:   0,
  noiseSpeed:   0.40,
  repulRadius:  300,
  repulStrength: 8,
  particleSize: 2.5,
  colorMix:     0.70,
}

export default function Page() {
  const [effectId, setEffectId] = useState<EffectId>('image')
  const [params, setParams] = useState({ ...DEFAULT_PARAMS, ...IMAGE_DEFAULTS })
  const [colorA, setColorA] = useState('#78d2aa')
  const [colorB, setColorB] = useState('#3a7cbd')
  const [inputData, setInputData] = useState<any>({ type: 'none' })

  // Auto-load the default image on mount
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
    const img = new Image()
    img.onload = () => setInputData({ type: 'image', imageEl: img, preview: `${base}/kj_icon.png` })
    img.src = `${base}/kj_icon.png`
  }, [])

  const handleParamChange = useCallback((key: string, val: number) => {
    setParams(p => ({ ...p, [key]: val }))
  }, [])

  const handleColorChange = useCallback((a: string, b: string) => {
    setColorA(a)
    setColorB(b)
  }, [])

  const handleEffectChange = useCallback((id: EffectId) => {
    setEffectId(id)
    // Reset params to the new effect's defaults
    const effectDefaults = Object.fromEntries(
      EFFECTS.find(e => e.id === id)!.params.map(p => [p.key, p.default])
    )
    setParams(p => ({ ...p, ...effectDefaults }))
  }, [])

  return (
    <div className="flex h-full w-full" style={{ background: 'var(--void, #050507)' }}>
      {/* Canvas — fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        <ShaderCanvas
          effectId={effectId}
          params={params}
          colorA={colorA}
          colorB={colorB}
          inputData={inputData}
        />
      </div>

      {/* Control panel — fixed right */}
      <ControlPanel
        effectId={effectId}
        params={params}
        colorA={colorA}
        colorB={colorB}
        onEffectChange={handleEffectChange}
        onParamChange={handleParamChange}
        onColorChange={handleColorChange}
        onInputChange={setInputData}
      />
    </div>
  )
}
