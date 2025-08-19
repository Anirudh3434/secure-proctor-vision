import { useRef, useEffect, useState, useCallback } from "react"
import Webcam from "react-webcam"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import type { FaceDetectionResult, CheatingViolation } from "@/types/exam"

interface WebcamMonitorProps {
  onViolation: (violation: CheatingViolation) => void
  isActive: boolean
}

export function WebcamMonitor({ onViolation, isActive }: WebcamMonitorProps) {
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousFrameRef = useRef<ImageData | null>(null)
  const detectionHistoryRef = useRef<number[]>([])
  const multiplePersonWarningsRef = useRef<number>(0)
  
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [faceDetectionResult, setFaceDetectionResult] = useState<FaceDetectionResult>({
    faces: 0,
    confidence: 0,
    detectionQuality: "low",
    frameAnalysis: {
      skinPixels: 0,
      faceRegions: 0,
      movementDetected: false,
    },
  })
  const [currentWarning, setCurrentWarning] = useState<string | null>(null)

  const isSkinTone = (r: number, g: number, b: number): boolean => {
    // RGB-based detection
    const rgbSkin = r > 95 && g > 40 && b > 20 && 
                   Math.max(r, g, b) - Math.min(r, g, b) > 15 && 
                   Math.abs(r - g) > 15 && r > g && r > b

    // YCbCr color space detection
    const y = 0.299 * r + 0.587 * g + 0.114 * b
    const cb = -0.169 * r - 0.331 * g + 0.5 * b + 128
    const cr = 0.5 * r - 0.419 * g - 0.081 * b + 128
    const ycbcrSkin = cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173

    // HSV-based detection
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const diff = max - min
    let h = 0
    if (diff !== 0) {
      if (max === r) h = ((g - b) / diff) % 6
      else if (max === g) h = (b - r) / diff + 2
      else h = (r - g) / diff + 4
    }
    h = h * 60
    if (h < 0) h += 360
    const s = max === 0 ? 0 : diff / max
    const v = max / 255
    const hsvSkin = h >= 0 && h <= 50 && s >= 0.23 && s <= 0.68 && v >= 0.35

    return rgbSkin || ycbcrSkin || hsvSkin
  }

  const checkSkinRegion = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    startX: number,
    startY: number
  ): number => {
    let regionSize = 0
    const checked = new Set<string>()
    const stack = [{ x: startX, y: startY }]

    while (stack.length > 0 && regionSize < 200) {
      const { x, y } = stack.pop()!
      const key = `${x},${y}`

      if (checked.has(key) || x < 0 || x >= width || y < 0 || y >= height) continue
      checked.add(key)

      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      if (isSkinTone(r, g, b)) {
        regionSize++
        stack.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 })
      }
    }

    return regionSize
  }

  const clusterSkinRegions = (
    regions: Array<{ x: number; y: number; size: number }>,
    width: number,
    height: number
  ): Array<{ x: number; y: number; size: number }> => {
    if (regions.length === 0) return []

    const clusters: Array<{ x: number; y: number; size: number }> = []
    const used = new Set<number>()

    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue

      const cluster = { x: regions[i].x, y: regions[i].y, size: regions[i].size }
      used.add(i)

      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue

        const distance = Math.sqrt(
          Math.pow(regions[i].x - regions[j].x, 2) + 
          Math.pow(regions[i].y - regions[j].y, 2)
        )

        if (distance < Math.min(width, height) * 0.15) {
          cluster.size += regions[j].size
          used.add(j)
        }
      }

      if (cluster.size > 80) {
        clusters.push(cluster)
      }
    }

    return clusters
  }

  const performFaceDetection = async (
    imageData: ImageData,
    previousFrame: ImageData | null
  ): Promise<FaceDetectionResult> => {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height

    let skinPixels = 0
    let faceRegions = 0
    let movementDetected = false

    const skinToneRegions: Array<{ x: number; y: number; size: number }> = []

    // Analyze image for skin tone regions
    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        if (isSkinTone(r, g, b)) {
          skinPixels++

          const regionSize = checkSkinRegion(data, width, height, x, y)
          if (regionSize > 50) {
            skinToneRegions.push({ x, y, size: regionSize })
          }
        }
      }
    }

    // Detect movement
    if (previousFrame && previousFrame.data.length === data.length) {
      let movementPixels = 0
      for (let i = 0; i < data.length; i += 16) {
        const diff = Math.abs(data[i] - previousFrame.data[i]) +
                    Math.abs(data[i + 1] - previousFrame.data[i + 1]) +
                    Math.abs(data[i + 2] - previousFrame.data[i + 2])
        if (diff > 30) movementPixels++
      }
      movementDetected = movementPixels > (width * height) / 1000
    }

    const clusteredRegions = clusterSkinRegions(skinToneRegions, width, height)
    faceRegions = clusteredRegions.length

    const skinThreshold = width * height * 0.015
    const hasEnoughSkin = skinPixels > skinThreshold

    let detectedFaces = 0
    let confidence = 0
    let quality: "high" | "medium" | "low" = "low"

    if (hasEnoughSkin && faceRegions > 0) {
      detectedFaces = Math.min(faceRegions, 3)

      const skinRatio = skinPixels / (width * height)
      const regionConfidence = Math.min(faceRegions / 2, 1)
      const movementBonus = movementDetected ? 0.1 : 0

      confidence = Math.min(skinRatio * 50 + regionConfidence * 0.4 + movementBonus, 1)

      if (confidence > 0.7 && faceRegions >= detectedFaces) {
        quality = "high"
      } else if (confidence > 0.4) {
        quality = "medium"
      }
    }

    return {
      faces: detectedFaces,
      confidence,
      detectionQuality: quality,
      frameAnalysis: {
        skinPixels,
        faceRegions,
        movementDetected,
      },
    }
  }

  const detectFaces = useCallback(async () => {
    if (!webcamRef.current || !canvasRef.current || !isActive) return

    const video = webcamRef.current.video
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!video || !ctx || video.videoWidth === 0 || video.videoHeight === 0) return

    const videoWidth = video.videoWidth
    const videoHeight = video.videoHeight

    if (videoWidth < 100 || videoHeight < 100) return

    canvas.width = videoWidth
    canvas.height = videoHeight

    try {
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight)
      const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight)

      const detectionResult = await performFaceDetection(imageData, previousFrameRef.current)
      previousFrameRef.current = imageData

      // Keep history for consensus
      detectionHistoryRef.current.push(detectionResult.faces)
      if (detectionHistoryRef.current.length > 5) {
        detectionHistoryRef.current.shift()
      }

      const recentDetections = detectionHistoryRef.current
      const averageFaces = recentDetections.reduce((a, b) => a + b, 0) / recentDetections.length
      const consensusFaces = Math.round(averageFaces)

      const finalResult: FaceDetectionResult = {
        ...detectionResult,
        faces: consensusFaces,
        confidence: detectionResult.confidence * (recentDetections.length / 5),
      }

      setFaceDetectionResult(finalResult)

      // Check for violations
      if (finalResult.detectionQuality === "high" || finalResult.detectionQuality === "medium") {
        if (consensusFaces === 0) {
          setCurrentWarning("No person detected in camera")
          onViolation({
            type: "face_not_detected",
            timestamp: Date.now(),
            severity: "high",
            description: "No person detected in camera feed",
          })
        } else if (consensusFaces > 1) {
          multiplePersonWarningsRef.current += 1
          
          if (multiplePersonWarningsRef.current <= 3) {
            setCurrentWarning(`Warning ${multiplePersonWarningsRef.current}/3: Multiple people detected!`)
            
            if (multiplePersonWarningsRef.current === 3) {
              // Trigger exam suspense after 3 warnings
              setTimeout(() => {
                alert("⚠️ EXAM SUSPENDED: Multiple violations detected. Contact your proctor.")
              }, 1000)
            }
          }

          onViolation({
            type: "multiple_faces",
            timestamp: Date.now(),
            severity: "high",
            description: `Multiple people detected: ${consensusFaces} (Warning ${multiplePersonWarningsRef.current})`,
          })
        } else {
          // Single person detected - clear warnings
          if (currentWarning) {
            setCurrentWarning(null)
          }
        }
      }
    } catch (error) {
      console.error("Face detection error:", error)
    }
  }, [isActive, onViolation, currentWarning])

  useEffect(() => {
    if (isActive && isCameraReady) {
      detectionIntervalRef.current = setInterval(detectFaces, 1500)
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [isActive, isCameraReady, detectFaces])

  // Auto-hide warnings after 5 seconds
  useEffect(() => {
    if (currentWarning) {
      const timeout = setTimeout(() => {
        setCurrentWarning(null)
      }, 5000)
      return () => clearTimeout(timeout)
    }
  }, [currentWarning])

  return (
    <div className="space-y-4">
      {currentWarning && (
        <Alert className="border-exam-danger bg-gradient-danger shadow-danger animate-pulse">
          <AlertDescription className="text-white font-medium">
            🚨 {currentWarning}
          </AlertDescription>
        </Alert>
      )}

      <Card className="bg-exam-surface border-exam-surface-secondary">
        <div className="p-4 space-y-4">
          <div className="bg-exam-surface-secondary rounded-xl h-40 flex items-center justify-center overflow-hidden relative">
            <Webcam
              ref={webcamRef}
              audio={false}
              width={320}
              height={160}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 640,
                height: 480,
                facingMode: "user",
              }}
              onUserMedia={() => setIsCameraReady(true)}
              onUserMediaError={() => setIsCameraReady(false)}
              className="w-full h-full object-cover rounded-xl"
              style={{ transform: "scaleX(-1)" }}
            />
            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                <div className="bg-exam-surface bg-opacity-90 px-3 py-2 rounded-lg">
                  Camera Loading...
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Camera Status</span>
              <Badge variant={isCameraReady ? "default" : "destructive"} className={
                isCameraReady ? "bg-exam-success" : "bg-exam-danger"
              }>
                {isCameraReady ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className={`p-3 rounded-lg ${
                faceDetectionResult.faces === 1 
                  ? "bg-exam-success/20 border border-exam-success/30" 
                  : "bg-exam-danger/20 border border-exam-danger/30"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Person Detection</span>
                  <Badge variant={faceDetectionResult.faces === 1 ? "default" : "destructive"} className={
                    faceDetectionResult.faces === 1 ? "bg-exam-success" : "bg-exam-danger"
                  }>
                    {faceDetectionResult.faces} person(s)
                  </Badge>
                </div>
                
                {faceDetectionResult.faces > 1 && (
                  <div className="mt-2 text-exam-danger font-bold text-sm">
                    ⚠️ MULTIPLE PEOPLE DETECTED!
                  </div>
                )}
                
                <div className="mt-2 text-xs text-muted-foreground">
                  Quality: <span className={`font-medium ${
                    faceDetectionResult.detectionQuality === "high" ? "text-exam-success" :
                    faceDetectionResult.detectionQuality === "medium" ? "text-exam-warning" :
                    "text-exam-danger"
                  }`}>
                    {faceDetectionResult.detectionQuality.toUpperCase()}
                  </span>
                  {" | "}
                  Confidence: {Math.round(faceDetectionResult.confidence * 100)}%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-exam-surface-secondary rounded-lg">
                  <div className="text-muted-foreground">Regions</div>
                  <div className="font-medium text-foreground">{faceDetectionResult.frameAnalysis.faceRegions}</div>
                </div>
                <div className="p-2 bg-exam-surface-secondary rounded-lg">
                  <div className="text-muted-foreground">Movement</div>
                  <div className="font-medium text-foreground">
                    {faceDetectionResult.frameAnalysis.movementDetected ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}
