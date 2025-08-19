import { useState } from "react"
import { ExamLanding } from "@/components/exam/ExamLanding"
import { ExamInterface } from "@/components/exam/ExamInterface"
import type { ExamState, ExamConfig, Student } from "@/types/exam"

const Index = () => {
  const [examStarted, setExamStarted] = useState(false)
  const [examState, setExamState] = useState<ExamState>({
    currentQuestion: 1,
    timeRemaining: 3600, // 60 minutes
    questions: [],
    student: { name: "", id: "", email: "" },
    isSubmitted: false,
    startTime: Date.now(),
  })

  const examConfig: ExamConfig = {
    title: "Advanced Computer Science Assessment",
    duration: 3600, // 60 minutes in seconds
    totalQuestions: 30,
    languages: ["English", "Hindi", "Spanish"],
    subject: "Computer Science",
    instructions: [
      "Read each question carefully before answering",
      "You can navigate between questions using the question palette",
      "Mark questions for review if you're unsure",
      "Ensure your webcam is working and you're clearly visible",
      "Do not switch tabs or exit fullscreen mode",
      "Only one person should be visible in the camera feed",
      "Any violations will be automatically detected and logged",
      "Submit your exam before time runs out"
    ]
  }

  const handleStartExam = (student: Student) => {
    setExamState(prev => ({
      ...prev,
      student,
      startTime: Date.now()
    }))
    setExamStarted(true)
  }

  const handleUpdateExamState = (updates: Partial<ExamState>) => {
    setExamState(prev => ({ ...prev, ...updates }))
  }

  if (!examStarted) {
    return <ExamLanding config={examConfig} onStartExam={handleStartExam} />
  }

  return (
    <ExamInterface
      examState={examState}
      config={examConfig}
      onUpdateState={handleUpdateExamState}
    />
  )
};

export default Index;
