'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'

interface Props {
  onScan: (code: string) => void
  onClose: () => void
}

export default function CameraScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [erro, setErro] = useState('')
  const [lendo, setLendo] = useState(false)
  const scannedRef = useRef(false)

  useEffect(() => {
    let reader: import('@zxing/browser').BrowserMultiFormatReader | null = null
    let ativo = true

    async function iniciar() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        reader = new BrowserMultiFormatReader()

        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        // Prefere câmera traseira em dispositivos móveis
        const backCamera = devices.find((d) =>
          /back|rear|environment/i.test(d.label)
        )
        const deviceId = backCamera?.deviceId || devices[0]?.deviceId

        if (!devices.length) {
          setErro('Nenhuma câmera encontrada.')
          return
        }

        setLendo(true)

        await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result) => {
            if (result && !scannedRef.current && ativo) {
              scannedRef.current = true
              const code = result.getText()
              // Vibração háptica no celular
              if (navigator.vibrate) navigator.vibrate(100)
              onScan(code)
            }
          }
        )
      } catch (e: unknown) {
        if (ativo) {
          const msg = e instanceof Error ? e.message : String(e)
          if (msg.includes('Permission') || msg.includes('NotAllowed')) {
            setErro('Permissão de câmera negada. Verifique as configurações do navegador.')
          } else {
            setErro('Não foi possível acessar a câmera.')
          }
        }
      }
    }

    iniciar()

    return () => {
      ativo = false
      try {
        // Libera a câmera ao fechar
        const { BrowserMultiFormatReader } = require('@zxing/browser')
        BrowserMultiFormatReader.releaseAllStreams()
      } catch {}
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-safe pt-4 pb-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-white" />
          <span className="text-white font-semibold">Escanear código</span>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center active:bg-white/40 transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Vídeo */}
      {!erro && (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
      )}

      {/* Erro */}
      {erro && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <Camera className="w-16 h-16 text-white/30 mb-4" />
          <p className="text-white text-sm">{erro}</p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2.5 bg-white text-slate-900 rounded-xl font-semibold text-sm"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Mira de leitura */}
      {!erro && (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Overlay escuro nas bordas */}
            <div className="absolute inset-0 bg-black/40" />
            {/* Janela de leitura transparente */}
            <div className="relative z-10 w-72 h-36 rounded-lg overflow-hidden">
              <div className="absolute inset-0 bg-transparent border-2 border-white/50 rounded-lg" />
              {/* Cantos coloridos */}
              {[
                'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
                'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
                'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
                'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
              ].map((cls, i) => (
                <div key={i} className={`absolute w-7 h-7 border-indigo-400 ${cls}`} />
              ))}
              {/* Linha de scan animada */}
              {lendo && (
                <div className="absolute left-2 right-2 h-0.5 bg-indigo-400/80 animate-scan-line" />
              )}
            </div>
          </div>

          {/* Instrução */}
          <div className="absolute bottom-12 left-0 right-0 text-center pb-safe">
            <p className="text-white/80 text-sm">
              {lendo ? 'Aponte para o código de barras' : 'Iniciando câmera...'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
