import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FlaskConical, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function PostTestModal({ lesson, open, onComplete, onClose }) {
  const questions = lesson?.post_test || [];
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);

  if (!questions.length) return null;

  const q = questions[current];
  const allAnswered = Object.keys(answers).length === questions.length;

  const handleSubmit = async () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_answer) correct++;
    });
    setScore(correct);
    setSaving(true);
    // Save first, then show result
    await onComplete({ score: correct, total: questions.length, answers: Object.values(answers) });
    setSaving(false);
    setSubmitted(true);
  };

  if (submitted) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Post-Test Complete!</h2>
            <p className="text-slate-500 mb-1">Your score:</p>
            <p className="text-5xl font-bold text-indigo-600 mb-1">{score}/{questions.length}</p>
            <p className="text-lg text-slate-400 mb-6">{pct}%</p>
            <Button className="bg-indigo-600 hover:bg-indigo-700 w-full" onClick={onClose}>
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-600">Post-Test</span>
          </div>
          <DialogTitle className="text-xl">How much did you learn?</DialogTitle>
          <DialogDescription>
            {questions.length} questions to assess your understanding after the lesson.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-3">
            <span>Question {current + 1} of {questions.length}</span>
            <span>{Object.keys(answers).length} answered</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all"
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
                    ? "border-green-500 bg-green-50 text-green-800 font-medium"
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
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={answers[current] === undefined}
                onClick={() => setCurrent(c => c + 1)}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!allAnswered || saving}
                onClick={handleSubmit}
              >
                {saving ? 'Saving...' : 'Submit Post-Test'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-400">
              Skip
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}