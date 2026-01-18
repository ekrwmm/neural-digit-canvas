type PredictionsProps = {
  predictions: number[] | null
  error?: string | null
  status?: 'loading' | 'training' | 'ready' | 'error'
}

const Predictions = ({ predictions, error, status }: PredictionsProps) => {
  if (error) {
    return <p className="hint error">Tahmin alınamadı.</p>
  }
  if (status === 'loading') {
    return <p className="hint">Model yükleniyor...</p>
  }
  if (status === 'training') {
    return <p className="hint">Model eğitiliyor...</p>
  }
  if (!predictions) {
    return <p className="hint">Henüz tahmin yapılmadı.</p>
  }

  const total = predictions.reduce((sum, value) => sum + value, 0) || 1
  const normalized = predictions.map((value) => (value / total) * 100)
  const topIndex = normalized.reduce((best, value, index) => (value > normalized[best] ? index : best), 0)

  return (
    <div className="predictions">
      <div className="prediction-highlight">
        En olası tahmin: <strong>{topIndex}</strong> (%{normalized[topIndex].toFixed(1)})
      </div>
      {normalized.map((value, digit) => (
        <div className="prediction-row" key={digit}>
          <span className="prediction-digit">{digit}</span>
          <div className="prediction-bar">
            <div className="prediction-bar-fill" style={{ width: `${value}%` }} />
          </div>
          <span className="prediction-value">%{value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

export default Predictions

