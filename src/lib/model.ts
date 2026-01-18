import * as tf from '@tensorflow/tfjs'

const MODEL_STORAGE_KEY = 'indexeddb://mnist-demo-model-v2'
const IMAGE_H = 28
const IMAGE_W = 28
const IMAGE_SIZE = IMAGE_H * IMAGE_W
const NUM_CLASSES = 10
const NUM_DATASET_ELEMENTS = 65000
const NUM_TRAIN_ELEMENTS = 55000

const TRAIN_SIZE = 8000
const TEST_SIZE = 1000

const MNIST_IMAGES_SPRITE_PATH =
  'https://storage.googleapis.com/learnjs-data/model-builder/mnist_images.png'
const MNIST_LABELS_PATH =
  'https://storage.googleapis.com/learnjs-data/model-builder/mnist_labels_uint8'

let cachedModel: tf.LayersModel | null = null
let cachedPromise: Promise<tf.LayersModel> | null = null

const formatShape = (shape: tf.Shape | tf.Shape[] | null): string => {
  if (!shape) {
    return 'Bilinmiyor'
  }
  if (Array.isArray(shape) && Array.isArray(shape[0])) {
    return shape
      .map((entry) => (Array.isArray(entry) ? `[${entry.join(', ')}]` : String(entry)))
      .join(' | ')
  }
  if (Array.isArray(shape)) {
    return `[${shape.join(', ')}]`
  }
  return String(shape)
}

const ensureBackend = async () => {
  const candidates = ['webgl', 'cpu'] as const
  for (const backend of candidates) {
    try {
      const ok = await tf.setBackend(backend)
      if (ok) {
        await tf.ready()
        return
      }
    } catch {
      continue
    }
  }
  await tf.ready()
}

const loadMnistData = async () => {
  const img = new Image()
  img.crossOrigin = 'anonymous'

  const imgRequest = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('MNIST görsel verisi yüklenemedi.'))
    img.src = MNIST_IMAGES_SPRITE_PATH
  })

  const labelsRequest = fetch(MNIST_LABELS_PATH).then((response) => {
    if (!response.ok) {
      throw new Error('MNIST etiket verisi yüklenemedi.')
    }
    return response.arrayBuffer()
  })

  await Promise.all([imgRequest, labelsRequest])
  const labelsResponse = await labelsRequest

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Canvas bağlamı oluşturulamadı.')
  }

  const datasetBytesBuffer = new ArrayBuffer(NUM_DATASET_ELEMENTS * IMAGE_SIZE * 4)
  const chunkSize = 5000

  canvas.width = img.width
  canvas.height = chunkSize

  for (let i = 0; i < NUM_DATASET_ELEMENTS / chunkSize; i += 1) {
    const datasetBytesView = new Float32Array(
      datasetBytesBuffer,
      i * IMAGE_SIZE * chunkSize * 4,
      IMAGE_SIZE * chunkSize,
    )
    ctx.drawImage(img, 0, i * chunkSize, img.width, chunkSize, 0, 0, img.width, chunkSize)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    for (let j = 0; j < imageData.data.length / 4; j += 1) {
      datasetBytesView[j] = imageData.data[j * 4] / 255
    }
  }

  const labels = new Uint8Array(labelsResponse)
  const trainImages = new Float32Array(datasetBytesBuffer, 0, IMAGE_SIZE * NUM_TRAIN_ELEMENTS)
  const testImages = new Float32Array(
    datasetBytesBuffer,
    IMAGE_SIZE * NUM_TRAIN_ELEMENTS * 4,
    IMAGE_SIZE * (NUM_DATASET_ELEMENTS - NUM_TRAIN_ELEMENTS),
  )
  const trainLabels = labels.slice(0, NUM_CLASSES * NUM_TRAIN_ELEMENTS)
  const testLabels = labels.slice(NUM_CLASSES * NUM_TRAIN_ELEMENTS)

  return {
    trainImages,
    testImages,
    trainLabels,
    testLabels,
  }
}

const createModel = () => {
  const model = tf.sequential()
  model.add(
    tf.layers.conv2d({
      inputShape: [IMAGE_H, IMAGE_W, 1],
      filters: 16,
      kernelSize: 3,
      activation: 'relu',
    }),
  )
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }))
  model.add(
    tf.layers.conv2d({
      filters: 32,
      kernelSize: 3,
      activation: 'relu',
    }),
  )
  model.add(tf.layers.maxPooling2d({ poolSize: 2, strides: 2 }))
  model.add(tf.layers.flatten())
  model.add(
    tf.layers.dense({
      units: 128,
      activation: 'relu',
    }),
  )
  model.add(tf.layers.dropout({ rate: 0.3 }))
  model.add(
    tf.layers.dense({
      units: NUM_CLASSES,
      activation: 'softmax',
    }),
  )
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  })
  return model
}

const trainModel = async (): Promise<tf.LayersModel> => {
  const { trainImages, trainLabels, testImages, testLabels } = await loadMnistData()

  const trainXs = tf.tensor4d(trainImages, [NUM_TRAIN_ELEMENTS, IMAGE_H, IMAGE_W, 1])
  const testXs = tf.tensor4d(testImages, [NUM_DATASET_ELEMENTS - NUM_TRAIN_ELEMENTS, IMAGE_H, IMAGE_W, 1])
  const trainYs = tf.tensor2d(trainLabels, [NUM_TRAIN_ELEMENTS, NUM_CLASSES])
  const testYs = tf.tensor2d(testLabels, [NUM_DATASET_ELEMENTS - NUM_TRAIN_ELEMENTS, NUM_CLASSES])

  const model = createModel()
  const trainIndices = Array.from(tf.util.createShuffledIndices(NUM_TRAIN_ELEMENTS)).slice(0, TRAIN_SIZE)
  const testIndices = Array.from(
    tf.util.createShuffledIndices(NUM_DATASET_ELEMENTS - NUM_TRAIN_ELEMENTS),
  ).slice(0, TEST_SIZE)

  const trainIndexTensor = tf.tensor1d(trainIndices, 'int32')
  const testIndexTensor = tf.tensor1d(testIndices, 'int32')

  const trainSubset = tf.gather(trainXs, trainIndexTensor)
  const trainLabelsSubset = tf.gather(trainYs, trainIndexTensor)
  const testSubset = tf.gather(testXs, testIndexTensor)
  const testLabelsSubset = tf.gather(testYs, testIndexTensor)

  await model.fit(trainSubset, trainLabelsSubset, {
    epochs: 5,
    batchSize: 128,
    validationData: [testSubset, testLabelsSubset],
    shuffle: true,
  })

  trainXs.dispose()
  trainYs.dispose()
  testXs.dispose()
  testYs.dispose()
  trainSubset.dispose()
  trainLabelsSubset.dispose()
  testSubset.dispose()
  testLabelsSubset.dispose()
  trainIndexTensor.dispose()
  testIndexTensor.dispose()

  await model.save(MODEL_STORAGE_KEY)
  return model
}

export const loadModel = async (onStatus?: (status: string) => void): Promise<tf.LayersModel> => {
  if (cachedModel) {
    return cachedModel
  }
  if (!cachedPromise) {
    cachedPromise = (async () => {
      await ensureBackend()
      try {
        onStatus?.('cached')
        return await tf.loadLayersModel(MODEL_STORAGE_KEY)
      } catch {
        onStatus?.('training')
        return trainModel()
      }
    })()
  }
  cachedModel = await cachedPromise
  return cachedModel
}

export const resetModel = () => {
  cachedModel = null
  cachedPromise = null
}

export const getModelLayers = async (onStatus?: (status: string) => void) => {
  const model = await loadModel(onStatus)
  return model.layers.map((layer) => ({
    name: layer.getClassName(),
    outputShape: formatShape(layer.outputShape ?? null),
  }))
}

export const predictDigit = async (data: Float32Array): Promise<number[]> => {
  const model = await loadModel()
  const output = tf.tidy(() => {
    const input = tf.tensor(data, [1, IMAGE_H, IMAGE_W, 1])
    const result = model.predict(input) as tf.Tensor
    return result.dataSync()
  })
  return Array.from(output)
}

