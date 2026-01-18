import { useEffect, useRef, useState } from 'react'
import DrawingCanvas, { type DrawingCanvasHandle } from './components/DrawingCanvas'
import NetworkViz from './components/NetworkViz'
import Predictions from './components/Predictions'
import { getModelLayers, predictDigit, resetModel } from './lib/model'

function App() {
  const canvasRef = useRef<DrawingCanvasHandle>(null)
  const [layers, setLayers] = useState<Array<{ name: string; outputShape: string }>>([])
  const [predictions, setPredictions] = useState<number[] | null>(null)
  const [modelStatus, setModelStatus] = useState<'loading' | 'training' | 'ready' | 'error'>('loading')
  const [isPredicting, setIsPredicting] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        setModelError(null)
        setModelStatus('loading')
        const modelLayers = await getModelLayers((status) => {
          if (status === 'training') {
            setModelStatus('training')
          }
        })
        if (isMounted) {
          setLayers(modelLayers)
          setModelStatus('ready')
        }
      } catch (error) {
        console.error('Model yüklenemedi:', error)
        if (isMounted) {
          setModelStatus('error')
          setModelError(error instanceof Error ? error.message : 'Model yüklenemedi')
        }
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const handlePredict = async () => {
    if (!canvasRef.current) {
      return
    }
    setIsPredicting(true)
    try {
      const data = canvasRef.current.getImageData()
      const result = await predictDigit(data)
      setPredictions(result)
      setModelError(null)
    } catch (error) {
      console.error('Tahmin başarısız:', error)
      setModelError(error instanceof Error ? error.message : 'Tahmin başarısız')
    } finally {
      setIsPredicting(false)
    }
  }

  const handleClear = () => {
    canvasRef.current?.clear()
    setPredictions(null)
  }

  const handleReload = () => {
    resetModel()
    setModelStatus('loading')
    setPredictions(null)
    setLayers([])
    setModelError(null)
    void (async () => {
      try {
        const modelLayers = await getModelLayers((status) => {
          if (status === 'training') {
            setModelStatus('training')
          }
        })
        setLayers(modelLayers)
        setModelStatus('ready')
      } catch (error) {
        console.error('Model yeniden yüklenemedi:', error)
        setModelStatus('error')
        setModelError(error instanceof Error ? error.message : 'Model yüklenemedi')
      }
    })()
  }

  return (
    <div className="app">
      <header className="header">
        <h1>MNIST Çizim ve Tahmin</h1>
        <p>28x28 alanda sayı çizin, modeli çalıştırıp olasılıkları görün.</p>
      </header>

      <div className="grid">
        <section className="panel">
          <h2>1) Çizim Alanı</h2>
          <DrawingCanvas ref={canvasRef} />
          <div className="button-row">
            <button type="button" onClick={handleClear}>
              Temizle
            </button>
            <button type="button" onClick={handlePredict} disabled={modelStatus !== 'ready' || isPredicting}>
              {isPredicting ? 'Tahmin ediliyor...' : 'Tahmin Et'}
            </button>
            {modelStatus === 'error' && (
              <button type="button" onClick={handleReload}>
                Modeli Yeniden Yükle
              </button>
            )}
          </div>
          {modelStatus === 'loading' && <p className="hint">Model yükleniyor...</p>}
          {modelStatus === 'training' && <p className="hint">Model eğitiliyor, lütfen bekleyin...</p>}
          {modelStatus === 'error' && <p className="hint error">Model yüklenemedi.</p>}
          {modelError && <p className="hint error">Detay: {modelError}</p>}
        </section>

        <section className="panel">
          <h2>2) Nöral Ağ Görseli</h2>
          <NetworkViz layers={layers} status={modelStatus} error={modelError} />
        </section>

        <section className="panel">
          <h2>3) Tahmin Yüzdeleri</h2>
          <Predictions predictions={predictions} error={modelError} status={modelStatus} />
        </section>
      </div>
    </div>
  )
}

export default App
