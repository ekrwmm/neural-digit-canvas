type NetworkVizProps = {
  layers: Array<{ name: string; outputShape: string }>
  status: 'loading' | 'training' | 'ready' | 'error'
  error?: string | null
}

const NetworkViz = ({ layers, status, error }: NetworkVizProps) => {
  if (status === 'loading') {
    return <p className="hint">Katman bilgisi yükleniyor...</p>
  }

  if (status === 'training') {
    return <p className="hint">Model eğitiliyor, katmanlar hazırlanıyor...</p>
  }

  if (status === 'error') {
    return (
      <div>
        <p className="hint error">Katman bilgisi alınamadı.</p>
        {error && <p className="hint error">Detay: {error}</p>}
      </div>
    )
  }

  if (!layers.length) {
    return <p className="hint">Model hazır.</p>
  }

  return (
    <div className="network-viz">
      {layers.map((layer, index) => (
        <div className="network-layer" key={`${layer.name}-${index}`}>
          <div className="layer-node">
            <div className="layer-name">{layer.name}</div>
            <div className="layer-shape">{layer.outputShape}</div>
          </div>
          {index < layers.length - 1 && <div className="layer-connector" />}
        </div>
      ))}
    </div>
  )
}

export default NetworkViz

