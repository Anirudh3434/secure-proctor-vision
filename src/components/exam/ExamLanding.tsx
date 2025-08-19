import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Clock, Shield, Camera, Monitor, User } from "lucide-react"
import type { ExamConfig, Student } from "@/types/exam"

interface ExamLandingProps {
  config: ExamConfig
  onStartExam: (student: Student) => void
}

export function ExamLanding({ config, onStartExam }: ExamLandingProps) {
  const [studentName, setStudentName] = useState("")
  const [studentId, setStudentId] = useState("")
  const [studentEmail, setStudentEmail] = useState("")
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [systemCheckPassed, setSystemCheckPassed] = useState(false)

  const handleSystemCheck = () => {
    // Simulate system check
    setTimeout(() => {
      setSystemCheckPassed(true)
    }, 1000)
  }

  const handleStartExam = () => {
    if (!studentName.trim() || !studentId.trim() || !studentEmail.trim() || !agreedToTerms || !systemCheckPassed) {
      return
    }

    onStartExam({
      name: studentName.trim(),
      id: studentId.trim(),
      email: studentEmail.trim(),
    })
  }

  return (
    <div className="min-h-screen bg-exam-bg flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Secure Exam Platform
          </h1>
          <p className="text-muted-foreground text-lg">
            Advanced AI-powered proctoring system for secure online examinations
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Exam Information */}
          <Card className="bg-exam-surface border-exam-surface-secondary shadow-elegant">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-exam-primary" />
                Exam Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">{config.title}</h3>
                  <p className="text-sm text-muted-foreground">Subject: {config.subject}</p>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-exam-primary" />
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium text-foreground">{Math.floor(config.duration / 60)} minutes</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4 text-exam-primary" />
                    <span className="text-muted-foreground">Questions:</span>
                    <span className="font-medium text-foreground">{config.totalQuestions}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-2">Available Languages:</h4>
                  <div className="flex flex-wrap gap-2">
                    {config.languages.map((lang) => (
                      <Badge key={lang} variant="secondary" className="bg-exam-surface-secondary text-foreground">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Alert className="border-exam-primary/30 bg-exam-primary/10">
                <Shield className="h-4 w-4 text-exam-primary" />
                <AlertDescription className="text-foreground">
                  This exam uses advanced AI proctoring technology to ensure integrity and security.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Student Registration */}
          <Card className="bg-exam-surface border-exam-surface-secondary shadow-elegant">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-exam-primary" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name" className="text-foreground">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter your full name"
                    className="bg-exam-surface-secondary border-exam-surface-secondary focus:border-exam-primary"
                  />
                </div>

                <div>
                  <Label htmlFor="studentId" className="text-foreground">Student ID</Label>
                  <Input
                    id="studentId"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Enter your student ID"
                    className="bg-exam-surface-secondary border-exam-surface-secondary focus:border-exam-primary"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="text-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="bg-exam-surface-secondary border-exam-surface-secondary focus:border-exam-primary"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleSystemCheck}
                  variant="outline"
                  className={`w-full border-exam-surface-secondary transition-smooth ${
                    systemCheckPassed 
                      ? "bg-exam-success/20 border-exam-success text-exam-success" 
                      : "hover:bg-exam-surface-secondary"
                  }`}
                  disabled={systemCheckPassed}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  {systemCheckPassed ? "System Check Passed ✓" : "Run System Check"}
                </Button>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 accent-exam-primary"
                  />
                  <span className="text-sm text-muted-foreground">
                    I agree to the exam terms and conditions. I understand that this exam is monitored and any 
                    violations will be reported.
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions & Security Features */}
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          {/* Instructions */}
          <Card className="bg-exam-surface border-exam-surface-secondary shadow-elegant">
            <CardHeader>
              <CardTitle className="text-foreground">Exam Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {config.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-exam-primary font-bold">•</span>
                    {instruction}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Security Features */}
          <Card className="bg-exam-surface border-exam-surface-secondary shadow-elegant">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-exam-primary" />
                Security Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Camera className="w-4 h-4 text-exam-primary" />
                  <span>Real-time webcam monitoring</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Monitor className="w-4 h-4 text-exam-primary" />
                  <span>Fullscreen mode enforcement</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-4 h-4 text-exam-primary" />
                  <span>Tab switching detection</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4 text-exam-primary" />
                  <span>Multiple person detection</span>
                </div>
                
                <Alert className="border-exam-warning/30 bg-exam-warning/10 mt-4">
                  <AlertDescription className="text-foreground text-xs">
                    <strong>Warning:</strong> Any attempts to cheat will be automatically detected and logged. 
                    Multiple violations may result in exam suspension.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Start Exam Button */}
        <div className="mt-8 text-center">
          <Button
            onClick={handleStartExam}
            disabled={!studentName.trim() || !studentId.trim() || !studentEmail.trim() || !agreedToTerms || !systemCheckPassed}
            className="bg-gradient-primary hover:opacity-90 transition-smooth shadow-primary text-lg px-8 py-3"
          >
            Start Secure Exam
          </Button>
          
          {(!studentName.trim() || !studentId.trim() || !studentEmail.trim() || !agreedToTerms || !systemCheckPassed) && (
            <p className="text-sm text-muted-foreground mt-2">
              Please complete all requirements above to start the exam
            </p>
          )}
        </div>
      </div>
    </div>
  )
}