import { useEffect, useState } from "react";
import type { Question } from "@/lib/questions";
import { Progress } from "@/components/ui/progress";

interface Props {
  questions: Question[];
  onComplete: (score: number) => void;
}

const TIMER = 20;

export function Quiz({ questions, onComplete }: Props) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER);

  const q = questions[idx];

  useEffect(() => {
    setTimeLeft(TIMER);
    setPicked(null);
    const start = Date.now();
    const t = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, TIMER - elapsed);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(t);
        advance(null);
      }
    }, 100);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const advance = (choice: number | null) => {
    const finalScore = choice === q.answer ? score + 1 : score;
    if (choice === q.answer) setScore(finalScore);
    setTimeout(() => {
      if (idx + 1 >= questions.length) onComplete(finalScore);
      else setIdx(idx + 1);
    }, 400);
  };

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    advance(i);
  };

  const pct = (timeLeft / TIMER) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        <span>Question {idx + 1} / {questions.length}</span>
        <span>Score {score}</span>
        <span className={timeLeft < 3 ? "text-destructive" : ""}>{timeLeft.toFixed(1)}s</span>
      </div>
      <Progress value={pct} className="h-1 mb-8" />

      <h2 className="text-2xl md:text-3xl font-semibold leading-snug mb-8">{q.q}</h2>

      <div className="grid gap-3">
        {q.options.map((opt, i) => {
          const isCorrect = picked !== null && i === q.answer;
          const isWrongPick = picked === i && i !== q.answer;
          return (
            <button
              key={i}
              disabled={picked !== null}
              onClick={() => choose(i)}
              className={`group text-left px-5 py-4 rounded-lg border bg-card/50 backdrop-blur transition-all
                hover:border-primary hover:bg-card disabled:cursor-not-allowed
                ${isCorrect ? "border-primary bg-primary/10" : ""}
                ${isWrongPick ? "border-destructive bg-destructive/10" : ""}
              `}
            >
              <span className="font-mono text-xs text-muted-foreground mr-3">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="font-medium">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
