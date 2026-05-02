'use client'
import { useEffect, useRef, useCallback } from 'react'
import { ParticleEngine } from '@/lib/ParticleEngine'
import type { EffectId } from '@/lib/effects'

interface Props {
  effectId: EffectId
  params: Record<string, number>
  colorA: string
  colorB: string
  inputData: {
    type: 'none' | 'text' | 'image' | 'video'
    text?: string
    imageEl?: HTMLImageElement | HTMLCanvasElement
    videoEl?: HTMLVideoElement
  }
  onEngineReady?: (engine: ParticleEngine) => void
}

export default function ShaderCanvas({ effectId, params, colorA, colorB, inputData, onEngineReady }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const engineRef  = useRef<ParticleEngine | null>(null)
  const prevEffect = useRef<EffectId | null>(null)
  const prevParams = useRef<Record<string, number>>({})
  const prevColors = useRef({ a: '', b: '' })

  // Init engine once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const engine = new ParticleEngine(canvas, params)
    engineRef.current = engine
    onEngineReady?.(engine)

    const onResize = () => {
      if (!canvas.parentElement) return
      engine.resize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight)
    }
    const ro = new ResizeObserver(onResize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    return () => {
      ro.disconnect()
      engine.dispose()
      engineRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync effect
  useEffect(() => {
    const e = engineRef.current
    if (!e || effectId === prevEffect.current) return
    e.setEffect(effectId)
    prevEffect.current = effectId
  }, [effectId])

  // Sync params
  useEffect(() => {
    const e = engineRef.current
    if (!e) return
    for (const [key, val] of Object.entries(params)) {
      if (prevParams.current[key] !== val) {
        e.setParam(key, val)
      }
    }
    prevParams.current = { ...params }
  }, [params])

  // Sync colors
  useEffect(() => {
    const e = engineRef.current
    if (!e) return
    if (prevColors.current.a !== colorA || prevColors.current.b !== colorB) {
      e.setColors(colorA, colorB)
      prevColors.current = { a: colorA, b: colorB }
    }
  }, [colorA, colorB])

  // Sync input
  useEffect(() => {
    const e = engineRef.current
    if (!e) return
    if (inputData.type === 'text' && inputData.text) {
      e.setTextTargets(inputData.text)
    } else if (inputData.type === 'image' && inputData.imageEl) {
      e.setImageTargets(inputData.imageEl, params.colorMix ?? 0.7)
    } else if (inputData.type === 'video' && inputData.videoEl) {
      e.setVideoElement(inputData.videoEl)
    }
  }, [inputData, params.colorMix])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ background: '#050507' }}
    />
  )
}
