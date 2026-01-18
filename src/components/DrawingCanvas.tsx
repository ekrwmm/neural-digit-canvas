import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type PointerEvent } from 'react'

const CANVAS_SIZE = 280
const GRID_SIZE = 28

export type DrawingCanvasHandle = {
  getImageData: () => Float32Array
  clear: () => void
}

type Point = {
  x: number
  y: number
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPointRef = useRef<Point | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 20
  }, [])

  useImperativeHandle(ref, () => ({
    getImageData: () => {
      const canvas = canvasRef.current
      if (!canvas) {
        return new Float32Array(GRID_SIZE * GRID_SIZE)
      }
      const source = canvas.getContext('2d', { willReadFrequently: true })
      if (!source) {
        return new Float32Array(GRID_SIZE * GRID_SIZE)
      }
      const { width, height } = canvas
      const imageData = source.getImageData(0, 0, width, height)
      const data = imageData.data

      let minX = width
      let minY = height
      let maxX = 0
      let maxY = 0
      let hasInk = false

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const idx = (y * width + x) * 4
          if (data[idx] > 10) {
            hasInk = true
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, x)
            maxY = Math.max(maxY, y)
          }
        }
      }

      if (!hasInk) {
        return new Float32Array(GRID_SIZE * GRID_SIZE)
      }

      const padding = 20
      minX = Math.max(minX - padding, 0)
      minY = Math.max(minY - padding, 0)
      maxX = Math.min(maxX + padding, width)
      maxY = Math.min(maxY + padding, height)

      const boxWidth = maxX - minX
      const boxHeight = maxY - minY
      const boxSize = Math.max(boxWidth, boxHeight)

      const cropped = document.createElement('canvas')
      cropped.width = boxSize
      cropped.height = boxSize
      const croppedCtx = cropped.getContext('2d', { willReadFrequently: true })
      if (!croppedCtx) {
        return new Float32Array(GRID_SIZE * GRID_SIZE)
      }
      croppedCtx.fillStyle = '#000000'
      croppedCtx.fillRect(0, 0, boxSize, boxSize)

      const offsetX = Math.floor((boxSize - boxWidth) / 2)
      const offsetY = Math.floor((boxSize - boxHeight) / 2)
      croppedCtx.drawImage(
        canvas,
        minX,
        minY,
        boxWidth,
        boxHeight,
        offsetX,
        offsetY,
        boxWidth,
        boxHeight,
      )

      const target = document.createElement('canvas')
      target.width = GRID_SIZE
      target.height = GRID_SIZE
      const targetCtx = target.getContext('2d', { willReadFrequently: true })
      if (!targetCtx) {
        return new Float32Array(GRID_SIZE * GRID_SIZE)
      }
      targetCtx.fillStyle = '#000000'
      targetCtx.fillRect(0, 0, GRID_SIZE, GRID_SIZE)
      targetCtx.drawImage(cropped, 0, 0, GRID_SIZE, GRID_SIZE)

      const { data: finalData } = targetCtx.getImageData(0, 0, GRID_SIZE, GRID_SIZE)
      const result = new Float32Array(GRID_SIZE * GRID_SIZE)
      let maxValue = 0
      for (let i = 0; i < GRID_SIZE * GRID_SIZE; i += 1) {
        const idx = i * 4
        const value = finalData[idx] / 255
        result[i] = value
        if (value > maxValue) {
          maxValue = value
        }
      }
      if (maxValue > 0) {
        for (let i = 0; i < result.length; i += 1) {
          result[i] /= maxValue
        }
      }
      return result
    },
    clear: () => {
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    },
  }))

  const getPoint = (event: PointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    canvas.setPointerCapture(event.pointerId)
    setIsDrawing(true)
    lastPointRef.current = getPoint(event)
  }

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }
    const currentPoint = getPoint(event)
    const lastPoint = lastPointRef.current
    if (!lastPoint) {
      lastPointRef.current = currentPoint
      return
    }
    ctx.beginPath()
    ctx.moveTo(lastPoint.x, lastPoint.y)
    ctx.lineTo(currentPoint.x, currentPoint.y)
    ctx.stroke()
    lastPointRef.current = currentPoint
  }

  const stopDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      return
    }
    const canvas = canvasRef.current
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId)
    }
    setIsDrawing(false)
    lastPointRef.current = null
  }

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="drawing-canvas"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
      />
      <div className="canvas-label">28x28</div>
    </div>
  )
})

DrawingCanvas.displayName = 'DrawingCanvas'

export default DrawingCanvas

