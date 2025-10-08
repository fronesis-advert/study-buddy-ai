"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DocumentSummary = {
  id: string;
  title: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  type: "multiple-choice" | "short-answer";
  options?: string[];
  answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
};

type QuizResult = {
  score: {
    correct: number;
    total: number;
  };
  breakdown: Array<{
    id: string;
    correct: boolean;
    feedback: string;
  }>;
};

type QuizPanelProps = {
  documents: DocumentSummary[];
  onSessionChange?: (sessionId: string) => void;
};

export function QuizPanel({ documents, onSessionChange }: QuizPanelProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grading, setGrading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          questionCount,
          sessionId,
          documentIds: selectedDocs,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate quiz. Please try again.");
      }

      const payload = await response.json();
      setQuestions(payload.questions ?? []);
      setAnswers({});
      setQuizId(payload.quizId);
      setSessionId(payload.sessionId);
      onSessionChange?.(payload.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!quizId || questions.length === 0) return;
    setGrading(true);
    setError(null);
    try {
      const response = await fetch("/api/quiz/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          quizId,
          answers,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to grade quiz.");
      }

      const payload = await response.json();
      console.log("Grade payload:", payload);
      console.log("Result object:", payload.result);
      setResult(payload.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setGrading(false);
    }
  };

  const unanswered = useMemo(
    () => questions.filter((question) => !answers[question.id]),
    [questions, answers]
  );

  return (
    <div className="flex h-full flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Build a custom quiz</CardTitle>
          <CardDescription>
            Generate adaptive questions from a topic or your uploaded sources.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="quiz-topic">Topic or prompt</Label>
              <Input
                id="quiz-topic"
                placeholder="e.g. Cellular respiration basics"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="question-count">Questions</Label>
              <Input
                id="question-count"
                type="number"
                min={3}
                max={10}
                value={questionCount}
                onChange={(event) =>
                  setQuestionCount(Number(event.target.value ?? 5))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Optional: reinforce with your documents</Label>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Upload documents to include them in quiz generation.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {documents.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                    />
                    <span>{doc.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">
                {sessionId ? `Session ${sessionId}` : "New session"}
              </Badge>
              {selectedDocs.length > 0 && (
                <span>{selectedDocs.length} doc context</span>
              )}
            </div>
            <Button type="button" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating..." : "Generate quiz"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <div className="flex flex-col gap-4">
          {questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  Q{index + 1}. {question.prompt}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant="outline">{question.difficulty}</Badge>
                  <Badge variant="secondary">{question.type}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {question.type === "multiple-choice" ? (
                  <div className="grid gap-2">
                    {question.options?.map((option) => (
                      <label
                        key={option}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:border-primary",
                          answers[question.id] === option &&
                            "border-primary bg-primary/10"
                        )}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answers[question.id] === option}
                          onChange={(event) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: event.target.value,
                            }))
                          }
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    placeholder="Type your response..."
                    value={answers[question.id] ?? ""}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [question.id]: event.target.value,
                      }))
                    }
                  />
                )}

                {result && (
                  <div
                    className={cn(
                      "rounded-md border p-3 text-sm",
                      result.breakdown.find(
                        (entry) => entry.id === question.id
                      )?.correct
                        ? "border-emerald-400 text-emerald-600"
                        : "border-destructive/60 text-destructive"
                    )}
                  >
                    <p className="font-medium">
                      {result.breakdown.find(
                        (entry) => entry.id === question.id
                      )?.correct
                        ? "Great job!"
                        : "Keep practicing"}
                    </p>
                    <p>
                      {
                        result.breakdown.find(
                          (entry) => entry.id === question.id
                        )?.feedback
                      }
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Answer: {question.answer}. {question.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm">
            <div className="text-sm text-muted-foreground">
              {unanswered.length === 0
                ? "All questions answered"
                : `${unanswered.length} question${
                    unanswered.length > 1 ? "s" : ""
                  } remaining`}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setQuestions([]);
                  setAnswers({});
                  setResult(null);
                }}
              >
                New quiz
              </Button>
              <Button
                type="button"
                onClick={handleGrade}
                disabled={grading || unanswered.length > 0}
              >
                {grading ? "Scoring..." : "Grade quiz"}
              </Button>
            </div>
          </div>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Score</CardTitle>
                <CardDescription>
                  You answered {result.score.correct} out of {result.score.total} correctly.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
