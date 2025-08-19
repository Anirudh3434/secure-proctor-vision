export interface Question {
  id: number
  text: string
  options: string[]
  selectedAnswer?: number
  isMarkedForReview: boolean
  isAnswered: boolean
}

export interface Student {
  name: string
  id: string
  email: string
}

export interface ExamConfig {
  title: string
  duration: number // in seconds
  totalQuestions: number
  languages: string[]
  subject: string
  instructions: string[]
}

export interface ExamState {
  currentQuestion: number
  timeRemaining: number
  questions: Question[]
  student: Student
  isSubmitted: boolean
  startTime: number
}

export interface ExamStats {
  answered: number
  notAnswered: number
  markedForReview: number
  answeredAndMarkedForReview: number
}

export interface CheatingViolation {
  type: "face_not_detected" | "multiple_faces" | "tab_switch" | "fullscreen_exit" | "suspicious_movement"
  timestamp: number
  severity: "low" | "medium" | "high"
  description: string
}

export interface FaceDetectionResult {
  faces: number
  confidence: number
  detectionQuality: "high" | "medium" | "low"
  frameAnalysis: {
    skinPixels: number
    faceRegions: number
    movementDetected: boolean
  }
}

export interface ApiQuestion {
  question_id: number
  question_text: string
  question_media: string | null
  option_a_text: string
  option_a_media: string | null
  option_b_text: string
  option_b_media: string | null
  option_c_text: string
  option_c_media: string | null
  option_d_text: string
  option_d_media: string | null
  correct_option: string
  marks: number
  class: number
  subject: string
}