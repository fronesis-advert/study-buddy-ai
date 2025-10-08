"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type StudySessionPanelProps = {
  onSessionChange?: (sessionId: string) => void;
};

const DEFAULT_LENGTH_MINUTES = 25;

export function StudySessionPanel({ onSessionChange }: StudySessionPanelProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(DEFAULT_LENGTH_MINUTES);
  const [secondsRemaining, setSecondsRemaining] = useState(
    minutes * 60
  );
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");
  const [weakAreas, setWeakAreas] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSecondsRemaining(minutes * 60);
  }, [minutes]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsRunning(false);
          setCompletedPomodoros((count) => count + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

  const formattedTime = useMemo(() => {
    const minutesPart = Math.floor(secondsRemaining / 60)
      .toString()
      .padStart(2, "0");
    const secondsPart = (secondsRemaining % 60).toString().padStart(2, "0");
    return `${minutesPart}:${secondsPart}`;
  }, [secondsRemaining]);

  const startSession = async () => {
    setError(null);
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "study",
          meta: { goals },
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to start study session.");
      }

      const payload = await response.json();
      setSessionId(payload.sessionId);
      onSessionChange?.(payload.sessionId);
      setIsRunning(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  const saveSummary = async () => {
    if (!sessionId) return;
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta: {
            goals,
            notes,
            summary,
            weakAreas,
            completedPomodoros,
          },
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save session summary.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  const resetSession = () => {
    setIsRunning(false);
    setSecondsRemaining(minutes * 60);
    setNotes("");
    setSummary("");
    setWeakAreas("");
    setSessionId(null);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Pomodoro focus block</CardTitle>
          <CardDescription>
            Stay on task with a 25-minute sprint, then record insights for spaced review.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-md border bg-muted/40 px-4 py-6">
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-4xl font-semibold tracking-tight">
                {formattedTime}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              <Badge variant="secondary">
                Session {sessionId ? sessionId.slice(0, 8) : "not started"}
              </Badge>
              <span className="text-muted-foreground">
                {completedPomodoros} pomodoro
                {completedPomodoros === 1 ? "" : "s"} completed
              </span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="study-length">Block length (minutes)</Label>
              <Input
                id="study-length"
                type="number"
                min={15}
                max={60}
                value={minutes}
                onChange={(event) => {
                  const value = Number(event.target.value ?? DEFAULT_LENGTH_MINUTES);
                  setMinutes(value);
                  setSecondsRemaining(value * 60);
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="study-goals">Goals for this block</Label>
              <Input
                id="study-goals"
                placeholder="Outline lecture notes, review flashcards..."
                value={goals}
                onChange={(event) => setGoals(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={sessionId ? () => setIsRunning((prev) => !prev) : startSession}
          >
            {isRunning ? "Pause" : sessionId ? "Resume" : "Start session"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetSession}
          >
            Reset
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session notes</CardTitle>
          <CardDescription>
            Capture breakthroughs, blockers, and concepts that need reinforcement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="session-notes">Notes</Label>
            <Textarea
              id="session-notes"
              rows={4}
              placeholder="Key ideas, diagrams, or resources worth revisiting."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="session-summary">Summary</Label>
            <Textarea
              id="session-summary"
              rows={3}
              placeholder="Summarize what you covered."
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="weak-areas">Weak areas</Label>
            <Textarea
              id="weak-areas"
              rows={3}
              placeholder="Concepts to revisit or questions to ask StudyBuddy."
              value={weakAreas}
              onChange={(event) => setWeakAreas(event.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setNotes("");
                setSummary("");
                setWeakAreas("");
              }}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={saveSummary}
              disabled={!sessionId}
            >
              Save summary
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
