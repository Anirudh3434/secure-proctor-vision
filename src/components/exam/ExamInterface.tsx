"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Clock, User, Shield, AlertTriangle } from "lucide-react"
import { WebcamMonitor } from "./WebcamMonitor"
import type { ExamState, ExamConfig, Question, ExamStats, CheatingViolation, ApiQuestion } from "@/types/exam"

interface ExamInterfaceProps {
  examState: ExamState
  config: ExamConfig
  onUpdateState: (updates: Partial<ExamState>) => void
}

interface ApiResponse {
  success: boolean
  question: ApiQuestion
  total_questions: number
}

export function ExamInterface({ examState, config, onUpdateState }: ExamInterfaceProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLanguage, setSelectedLanguage] = useState("english")
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [currentApiQuestion, setCurrentApiQuestion] = useState<ApiQuestion | null>(null)
  const [loadingQuestion, setLoadingQuestion] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalQuestions, setTotalQuestions] = useState(30)
  
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [violations, setViolations] = useState<CheatingViolation[]>([])
  const [currentViolation, setCurrentViolation] = useState<CheatingViolation | null>(null)
  const [isTabActive, setIsTabActive] = useState(true)
  const [warningCount, setWarningCount] = useState(0)

  const sampleQuestions: ApiQuestion[] = [
    {
      question_id: 1,
      question_text: "What is the capital of France?",
      question_media: null,
      option_a_text: "London",
      option_a_media: null,
      option_b_text: "Berlin",
      option_b_media: null,
      option_c_text: "Paris",
      option_c_media: null,
      option_d_text: "Madrid",
      option_d_media: null,
      correct_option: "C",
      marks: 1,
      class: 10,
      subject: "Geography"
    },
    {
      question_id: 2,
      question_text: "Which of the following is a programming language?",
      question_media: null,
      option_a_text: "HTML",
      option_a_media: null,
      option_b_text: "CSS",
      option_b_media: null,
      option_c_text: "JavaScript",
      option_c_media: null,
      option_d_text: "XML",
      option_d_media: null,
      correct_option: "C",
      marks: 1,
      class: 10,
      subject: "Computer Science"
    },
    {
      question_id: 3,
      question_text: "What is the largest planet in our solar system?",
      question_media: null,
      option_a_text: "Earth",
      option_a_media: null,
      option_b_text: "Jupiter",
      option_b_media: null,
      option_c_text: "Saturn",
      option_c_media: null,
      option_d_text: "Mars",
      option_d_media: null,
      correct_option: "B",
      marks: 1,
      class: 10,
      subject: "Science"
    }
  ]

  const addViolation = useCallback((violation: CheatingViolation) => {
    setViolations((prev) => [...prev, violation])
    setCurrentViolation(violation)
    setWarningCount((prev) => prev + 1)

    // Auto-hide violation after 5 seconds
    setTimeout(() => {
      setCurrentViolation(null)
    }, 5000)
  }, [])

  const enterFullScreen = useCallback(() => {
    const element = document.documentElement
    if (element.requestFullscreen) {
      element.requestFullscreen()
    } else if ((element as any).webkitRequestFullscreen) {
      ;(element as any).webkitRequestFullscreen()
    } else if ((element as any).msRequestFullscreen) {
      ;(element as any).msRequestFullscreen()
    }
  }, [])

  const exitFullScreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if ((document as any).webkitExitFullscreen) {
      ;(document as any).webkitExitFullscreen()
    } else if ((document as any).msExitFullscreen) {
      ;(document as any).msExitFullscreen()
    }
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const forbiddenKeys = ["F12", "F11", "Tab", "Escape"]

      if (
        forbiddenKeys.includes(e.key) ||
        (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "a" || e.key === "t" || e.key === "w")) ||
        (e.altKey && e.key === "Tab") ||
        (e.ctrlKey && e.shiftKey && e.key === "I")
      ) {
        e.preventDefault()
        addViolation({
          type: "suspicious_movement",
          timestamp: Date.now(),
          severity: "medium",
          description: `Attempted to use forbidden key: ${e.key}`,
        })
      }
    },
    [addViolation]
  )

  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden
    setIsTabActive(isVisible)

    if (!isVisible) {
      addViolation({
        type: "tab_switch",
        timestamp: Date.now(),
        severity: "high",
        description: "Student switched away from exam tab",
      })
    }
  }, [addViolation])

  const handleFullScreenChange = useCallback(() => {
    const isCurrentlyFullScreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement
    )

    setIsFullScreen(isCurrentlyFullScreen)

    if (!isCurrentlyFullScreen && examState.currentQuestion > 0) {
      addViolation({
        type: "fullscreen_exit",
        timestamp: Date.now(),
        severity: "high",
        description: "Student exited fullscreen mode",
      })
    }
  }, [addViolation, examState.currentQuestion])

  const getQuestion = async (questionNumber: number) => {
    setLoadingQuestion(true)
    setError(null)
    
    try {
      // Simulate API call with sample data
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const questionIndex = (questionNumber - 1) % sampleQuestions.length
      const question = sampleQuestions[questionIndex]
      
      setCurrentApiQuestion(question)
      setTotalQuestions(30)
      
      return question
    } catch (error) {
      console.error("Failed to fetch question:", error)
      setError("Failed to load question. Please try again.")
      return null
    } finally {
      setLoadingQuestion(false)
    }
  }

  const initializeQuestionsArray = () => {
    return Array.from({ length: totalQuestions }, (_, i) => ({
      id: i + 1,
      text: "",
      options: [],
      selectedAnswer: undefined,
      isMarkedForReview: false,
      isAnswered: false,
    }))
  }

  const getQuestionOptions = (apiQuestion: ApiQuestion): string[] => {
    return [
      apiQuestion.option_a_text,
      apiQuestion.option_b_text,
      apiQuestion.option_c_text,
      apiQuestion.option_d_text,
    ].filter(Boolean)
  }

  useEffect(() => {
    const initializeExam = async () => {
      setIsLoading(true)

      // Force fullscreen mode
      await enterFullScreen()

      // Setup event listeners
      document.addEventListener("keydown", handleKeyDown)
      document.addEventListener("visibilitychange", handleVisibilityChange)
      document.addEventListener("fullscreenchange", handleFullScreenChange)
      document.addEventListener("webkitfullscreenchange", handleFullScreenChange)
      document.addEventListener("msfullscreenchange", handleFullScreenChange)

      const firstQuestion = await getQuestion(1)
      const initialQuestions = initializeQuestionsArray()
      onUpdateState({ questions: initialQuestions })

      setIsLoading(false)
    }

    initializeExam()

    const timer = setInterval(() => {
      onUpdateState({
        timeRemaining: Math.max(0, examState.timeRemaining - 1),
      })
    }, 1000)

    return () => {
      clearInterval(timer)
      document.removeEventListener("keydown", handleKeyDown)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      document.removeEventListener("fullscreenchange", handleFullScreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullScreenChange)
      document.removeEventListener("msfullscreenchange", handleFullScreenChange)
    }
  }, [])

  useEffect(() => {
    if (examState.currentQuestion && examState.questions.length > 0) {
      getQuestion(examState.currentQuestion)
    }
  }, [examState.currentQuestion])

  useEffect(() => {
    const currentQuestion = examState.questions[examState.currentQuestion - 1]
    if (currentQuestion) {
      setSelectedAnswer(currentQuestion.selectedAnswer ?? null)
    }
  }, [examState.currentQuestion, examState.questions])

  useEffect(() => {
    if (examState.timeRemaining <= 0 && !examState.isSubmitted) {
      handleSubmitExam()
    }
  }, [examState.timeRemaining])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getCurrentQuestion = () => {
    return examState.questions[examState.currentQuestion - 1]
  }

  const getQuestionStatus = (question: Question) => {
    if (question.isAnswered && question.isMarkedForReview) return "answered-marked"
    if (question.isAnswered) return "answered"
    if (question.isMarkedForReview) return "marked"
    return "not-answered"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "answered":
        return "bg-exam-success text-white"
      case "marked":
        return "bg-exam-secondary text-white"
      case "answered-marked":
        return "bg-purple-500 text-white"
      default:
        return "bg-exam-danger text-white"
    }
  }

  const updateQuestion = (questionIndex: number, updates: Partial<Question>) => {
    const updatedQuestions = [...examState.questions]
    updatedQuestions[questionIndex] = { ...updatedQuestions[questionIndex], ...updates }
    onUpdateState({ questions: updatedQuestions })
  }

  const handleAnswerSelect = (optionIndex: number) => {
    setSelectedAnswer(optionIndex)
  }

  const saveResponse = async () => {
    if (!currentApiQuestion) return
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  const handleSaveAndNext = async () => {
    await saveResponse()

    const currentIndex = examState.currentQuestion - 1
    updateQuestion(currentIndex, {
      selectedAnswer,
      isAnswered: selectedAnswer !== null,
    })

    if (examState.currentQuestion < totalQuestions) {
      onUpdateState({ currentQuestion: examState.currentQuestion + 1 })
    }
  }

  const handleMarkForReviewAndNext = async () => {
    await saveResponse()

    const currentIndex = examState.currentQuestion - 1
    updateQuestion(currentIndex, {
      selectedAnswer,
      isAnswered: selectedAnswer !== null,
      isMarkedForReview: true,
    })

    if (examState.currentQuestion < totalQuestions) {
      onUpdateState({ currentQuestion: examState.currentQuestion + 1 })
    }
  }

  const handleClearResponse = () => {
    setSelectedAnswer(null)
    const currentIndex = examState.currentQuestion - 1
    updateQuestion(currentIndex, {
      selectedAnswer: undefined,
      isAnswered: false,
    })
  }

  const handlePrevious = () => {
    if (examState.currentQuestion > 1) {
      onUpdateState({ currentQuestion: examState.currentQuestion - 1 })
    }
  }

  const handleNext = () => {
    if (examState.currentQuestion < totalQuestions) {
      onUpdateState({ currentQuestion: examState.currentQuestion + 1 })
    }
  }

  const handleQuestionJump = (questionNumber: number) => {
    onUpdateState({ currentQuestion: questionNumber })
  }

  const handleSubmitExam = () => {
    onUpdateState({ isSubmitted: true })
    setShowSubmitConfirm(false)
    exitFullScreen()
    alert("Exam submitted successfully!")
  }

  const getExamStats = (): ExamStats => {
    const answered = examState.questions.filter((q) => q.isAnswered && !q.isMarkedForReview).length
    const markedForReview = examState.questions.filter((q) => q.isMarkedForReview && !q.isAnswered).length
    const answeredAndMarkedForReview = examState.questions.filter((q) => q.isAnswered && q.isMarkedForReview).length
    const notAnswered = examState.questions.length - answered - markedForReview - answeredAndMarkedForReview

    return {
      answered,
      notAnswered,
      markedForReview,
      answeredAndMarkedForReview,
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-exam-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-exam-primary mx-auto mb-4"></div>
          <p className="text-foreground">Initializing secure exam environment...</p>
          <p className="text-sm text-muted-foreground mt-2">Setting up fullscreen mode and proctoring...</p>
        </div>
      </div>
    )
  }

  const currentQuestion = getCurrentQuestion()
  const stats = getExamStats()

  return (
    <div className="min-h-screen bg-exam-bg">
      {currentViolation && (
        <Alert className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md bg-gradient-danger border-exam-danger shadow-danger">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-white font-medium">
            <strong>Security Alert:</strong> {currentViolation.description}
          </AlertDescription>
        </Alert>
      )}

      {!isFullScreen && examState.currentQuestion > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-exam-surface rounded-lg p-6 max-w-md w-full mx-4 text-center border border-exam-surface-secondary">
            <h3 className="text-lg font-semibold text-exam-danger mb-4">Fullscreen Required</h3>
            <p className="text-muted-foreground mb-6">
              You must remain in fullscreen mode during the exam. Click below to return to fullscreen.
            </p>
            <Button onClick={enterFullScreen} className="bg-gradient-danger hover:opacity-90 transition-smooth shadow-danger">
              Return to Fullscreen
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-exam-surface rounded-2xl shadow-elegant overflow-hidden border border-exam-surface-secondary">
          <div className="flex h-[calc(100vh-2rem)]">
            {/* Main Exam Area */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-exam-surface-secondary bg-gradient-surface">
                <div className="flex justify-between items-start mb-4">
                  <h1 className="text-2xl font-bold text-foreground">Secure Exam Platform</h1>
                  <div className="flex gap-2 text-xs">
                    <Badge variant={isFullScreen ? "default" : "destructive"} className={
                      isFullScreen ? "bg-exam-success" : "bg-exam-danger"
                    }>
                      <Shield className="w-3 h-3 mr-1" />
                      {isFullScreen ? "Secure" : "Unsecure"}
                    </Badge>
                    <Badge variant={isTabActive ? "default" : "destructive"} className={
                      isTabActive ? "bg-exam-success" : "bg-exam-danger"
                    }>
                      👁️ {isTabActive ? "Focused" : "Unfocused"}
                    </Badge>
                    <Badge variant="secondary" className="bg-exam-warning text-black">
                      ⚠️ {warningCount} Warnings
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <p className="text-lg text-foreground">
                    Question No. <span className="font-bold text-exam-primary">{examState.currentQuestion}</span> of {totalQuestions}
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">View in</span>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger className="w-32 bg-exam-surface-secondary border-exam-surface-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-exam-surface border-exam-surface-secondary">
                        {config.languages?.map((lang) => (
                          <SelectItem key={lang.toLowerCase()} value={lang.toLowerCase()}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {currentApiQuestion && (
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>
                      Subject: <span className="font-medium text-foreground">{currentApiQuestion.subject}</span>
                    </span>
                    <span>
                      Class: <span className="font-medium text-foreground">{currentApiQuestion.class}</span>
                    </span>
                    <span>
                      Marks: <span className="font-medium text-exam-primary">{currentApiQuestion.marks}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Question Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {loadingQuestion ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-exam-primary mx-auto mb-2"></div>
                      <p className="text-muted-foreground">Loading question...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <p className="text-exam-danger mb-4">{error}</p>
                      <Button
                        onClick={() => getQuestion(examState.currentQuestion)}
                        className="bg-gradient-primary hover:opacity-90 transition-smooth shadow-primary"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : currentApiQuestion ? (
                  <div className="space-y-6">
                    <div>
                      <p className="text-lg text-foreground leading-relaxed mb-4">{currentApiQuestion.question_text}</p>
                      {currentApiQuestion.question_media && (
                        <div className="mb-4">
                          <img
                            src={currentApiQuestion.question_media || "/placeholder.svg"}
                            alt="Question media"
                            className="max-w-full h-auto rounded-lg border border-exam-surface-secondary"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {getQuestionOptions(currentApiQuestion).map((option, index) => (
                        <label
                          key={index}
                          className={`flex items-start p-4 border rounded-lg cursor-pointer transition-smooth ${
                            selectedAnswer === index
                              ? "border-exam-primary bg-exam-primary/10 shadow-primary"
                              : "border-exam-surface-secondary hover:border-exam-primary/50 bg-exam-surface-secondary/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentApiQuestion.question_id}`}
                            value={index}
                            checked={selectedAnswer === index}
                            onChange={() => handleAnswerSelect(index)}
                            className="mr-3 mt-1 accent-exam-primary"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-exam-primary">{String.fromCharCode(65 + index)}.</span>
                            </div>
                            <span className="text-foreground">{option}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">No question available</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-6 border-t border-exam-surface-secondary bg-exam-surface-secondary/50">
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleSaveAndNext}
                    className="bg-gradient-primary hover:opacity-90 transition-smooth shadow-primary"
                    disabled={loadingQuestion}
                  >
                    Save & Next
                  </Button>
                  <Button
                    onClick={handleMarkForReviewAndNext}
                    className="bg-exam-secondary hover:bg-exam-secondary/90 transition-smooth"
                    disabled={loadingQuestion}
                  >
                    Mark for Review & Next
                  </Button>
                  <Button
                    onClick={handleClearResponse}
                    variant="outline"
                    className="border-exam-surface-secondary hover:bg-exam-surface-secondary"
                    disabled={loadingQuestion}
                  >
                    Clear Response
                  </Button>
                  <Button
                    onClick={handlePrevious}
                    variant="outline"
                    className="border-exam-surface-secondary hover:bg-exam-surface-secondary"
                    disabled={examState.currentQuestion === 1 || loadingQuestion}
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleNext}
                    variant="outline"
                    className="border-exam-surface-secondary hover:bg-exam-surface-secondary"
                    disabled={examState.currentQuestion === totalQuestions || loadingQuestion}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-80 border-l border-exam-surface-secondary bg-exam-surface-secondary/30 flex flex-col">
              {/* Webcam Monitor */}
              <div className="p-4">
                <WebcamMonitor onViolation={addViolation} isActive={true} />
              </div>

              {/* Student Info */}
              <div className="p-4">
                <Card className="bg-exam-surface border-exam-surface-secondary">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold mx-auto mb-3 shadow-primary">
                      <User className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-foreground text-sm">{examState.student?.name || "Student"}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-2">
                      <Clock className="w-3 h-3" />
                      Time Left:
                    </p>
                    <p className="font-bold text-lg text-exam-primary">{formatTime(examState.timeRemaining)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Question Palette */}
              <div className="flex-1 p-4">
                <h3 className="font-semibold text-foreground mb-3">Question Palette</h3>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {Array.from({ length: totalQuestions }, (_, i) => {
                    const questionNumber = i + 1
                    const question = examState.questions[i]
                    return (
                      <button
                        key={questionNumber}
                        onClick={() => handleQuestionJump(questionNumber)}
                        disabled={loadingQuestion}
                        className={`w-8 h-8 text-xs font-semibold rounded transition-smooth ${
                          question ? getStatusColor(getQuestionStatus(question)) : "bg-exam-danger text-white"
                        } ${
                          examState.currentQuestion === questionNumber ? "ring-2 ring-exam-primary ring-offset-2 ring-offset-exam-surface" : ""
                        } ${loadingQuestion ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
                      >
                        {questionNumber}
                      </button>
                    )
                  })}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-exam-success rounded"></div>
                    <span className="text-muted-foreground">Answered ({stats.answered})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-exam-danger rounded"></div>
                    <span className="text-muted-foreground">Not Answered ({stats.notAnswered})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-exam-secondary rounded"></div>
                    <span className="text-muted-foreground">Marked for Review ({stats.markedForReview})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-500 rounded"></div>
                    <span className="text-muted-foreground">Answered & Marked ({stats.answeredAndMarkedForReview})</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="p-4 border-t border-exam-surface-secondary">
                <Button
                  onClick={() => setShowSubmitConfirm(true)}
                  className="w-full bg-gradient-danger hover:opacity-90 transition-smooth shadow-danger"
                  disabled={examState.isSubmitted || loadingQuestion}
                >
                  Submit Exam
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-exam-surface rounded-lg p-6 max-w-md w-full mx-4 border border-exam-surface-secondary">
            <h3 className="text-lg font-semibold text-foreground mb-4">Confirm Submission</h3>
            <p className="text-muted-foreground mb-4">
              Are you sure you want to submit the exam? You cannot make changes after submission.
            </p>
            {violations.length > 0 && (
              <div className="mb-4 p-3 bg-exam-warning/20 border border-exam-warning/30 rounded">
                <p className="text-sm text-exam-warning font-medium">Security Summary:</p>
                <p className="text-xs text-muted-foreground">{violations.length} violations detected during exam</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button onClick={() => setShowSubmitConfirm(false)} variant="outline" className="flex-1 border-exam-surface-secondary">
                Cancel
              </Button>
              <Button onClick={handleSubmitExam} className="flex-1 bg-gradient-danger hover:opacity-90 transition-smooth shadow-danger">
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}