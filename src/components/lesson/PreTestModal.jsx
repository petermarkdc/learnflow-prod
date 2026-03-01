import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function PreTestModal({ lesson, user, onComplete, onSkip }) {
  const questions = lesson?.pre_test || [];
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  if (!questions.length) return null;

  const q = questions[current];
  const allAnswered = Object.keys(answers).length === questions.length;

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    onComplete({ score: correct, total: questions.length, answers: Object.values(answers) });
  };

  if (submitted) {
    return (
      <Dialog open>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Pre-Test Complete!</h2>
            <p className="text-slate-500 mb-1">Your score:</p>
            <p className="text-5xl font-bold text-indigo-600 mb-2">{score}/{questions.length}</p>
            <p className="text-sm text-slate-400 mb-6">This helps track your progress before the lesson.</p>
            <Button className="bg-indigo-600 hover:bg-indigo-700 w-full" onClick={onSkip}>
              Start Lesson
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Pre-Test</span>
          </div>
          <DialogTitle className="text-xl">Before you begin: {lesson.title}</DialogTitle>
          <DialogDescription>
            Answer these {questions.length} questions to assess your current knowledge.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {/* Progress */}
          <div className="flex justify-between text-xs text-slate-400 mb-3">
            <span>Question {current + 1} of {questions.length}</span>
            <span>{Object.keys(answers).length} answered</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>

          <p className="font-semibold text-slate-900 mb-4">{q.question}</p>

          <div className="space-y-2 mb-6">
            {(q.options || []).map((opt, i) => (
              <button
                key={i}
                onClick={() => setAnswers(prev => ({ ...prev, [current]: i }))}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                  answers[current] === i
                    ? "border-blue-500 bg-blue-50 text-blue-800 font-medium"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <span className="font-bold mr-2 text-slate-400">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {current < questions.length - 1 ? (
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={answers[current] === undefined}
                onClick={() => setCurrent(c => c + 1)}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!allAnswered}
                onClick={handleSubmit}
              >
                Submit Pre-Test
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-slate-400">
              Skip
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}