import React, { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, ChevronRight, CheckCircle2, Code } from 'lucide-react';
import { cn } from "@/lib/utils";

function scoreQuestion(q, answer) {
  const type = q.type || 'multiple_choice';
  if (type === 'coding') return true;
  if (type === 'multiple_answers') {
    const a = [...(answer || [])].sort((x, y) => x - y);
    const b = [...(q.correct_answers || [])].sort((x, y) => x - y);
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return answer === q.correct_answer;
}

export default function PreTestModal({ lesson, user, onComplete, onSkip }) {
  const questions = lesson?.pre_test || [];
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);

  if (!questions.length) return null;

  const q = questions[current];
  const qtype = q?.type || 'multiple_choice';
  const currentAnswer = answers[current];

  const allAnswered = questions.every((q, i) => {
    const t = q.type || 'multiple_choice';
    if (t === 'coding') return true;
    if (t === 'multiple_answers') return (answers[i] || []).length > 0;
    return answers[i] !== undefined;
  });

  const canProceed = (() => {
    if (qtype === 'coding') return true;
    if (qtype === 'multiple_answers') return (currentAnswer || []).length > 0;
    return currentAnswer !== undefined;
  })();

  const handleSingle = (i) => setAnswers(prev => ({ ...prev, [current]: i }));
  const handleMulti = (i, checked) => {
    const curr = answers[current] || [];
    setAnswers(prev => ({ ...prev, [current]: checked ? [...curr, i] : curr.filter(x => x !== i) }));
  };

  const handleSubmit = async () => {
    let correct = 0;
    questions.forEach((q, i) => { if (scoreQuestion(q, answers[i])) correct++; });
    setScore(correct);
    setSaving(true);
    try {
      await onComplete({ score: correct, total: questions.length, answers: Object.values(answers) });
      setSubmitted(true);
    } catch (e) {
      toast.error('Failed to save your test result. Please try again.');
    } finally {
      setSaving(false);
    }
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
            <Button className="bg-indigo-600 hover:bg-indigo-700 w-full" onClick={onSkip}>Start Lesson</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Pre-Test</span>
            <span className="ml-auto text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full capitalize">
              {qtype.replace('_', ' ')}
            </span>
          </div>
          <DialogTitle className="text-xl">Before you begin: {lesson.title}</DialogTitle>
          <DialogDescription>Answer these {questions.length} questions to assess your current knowledge.</DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-3">
            <span>Question {current + 1} of {questions.length}</span>
            <span>{Object.keys(answers).length} answered</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
          </div>

          <p className="font-semibold text-slate-900 mb-4">{q.question}</p>

          {/* Multiple Choice & True/False */}
          {(qtype === 'multiple_choice' || qtype === 'true_false') && (
            <div className="space-y-2 mb-6">
              {(q.options || []).map((opt, i) => (
                <button key={i} onClick={() => handleSingle(i)}
                  className={cn("w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                    currentAnswer === i ? "border-blue-500 bg-blue-50 text-blue-800 font-medium" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50")}>
                  <span className="font-bold mr-2 text-slate-400">{String.fromCharCode(65 + i)}.</span>{opt}
                </button>
              ))}
            </div>
          )}

          {/* Multiple Answers */}
          {qtype === 'multiple_answers' && (
            <div className="space-y-2 mb-6">
              <p className="text-xs text-slate-500 mb-2">Select all correct answers</p>
              {(q.options || []).map((opt, i) => (
                <Label key={i} htmlFor={`pre-ma-${i}`}
                  className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border text-sm cursor-pointer transition-all",
                    (currentAnswer || []).includes(i) ? "border-blue-500 bg-blue-50 text-blue-800 font-medium" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50")}>
                  <Checkbox id={`pre-ma-${i}`} checked={(currentAnswer || []).includes(i)}
                    onCheckedChange={(c) => handleMulti(i, c)} />
                  <span className="font-bold mr-2 text-slate-400">{String.fromCharCode(65 + i)}.</span>{opt}
                </Label>
              ))}
            </div>
          )}

          {/* Coding */}
          {qtype === 'coding' && (
            <div className="space-y-3 mb-6">
              {q.starter_code && (
                <div className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-xs whitespace-pre">{q.starter_code}</div>
              )}
              <Textarea
                value={currentAnswer || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [current]: e.target.value }))}
                placeholder="Write your code here..."
                className="font-mono text-sm min-h-[100px]"
              />
              <p className="text-xs text-slate-400 flex items-center gap-1"><Code className="w-3 h-3" />Coding questions are not auto-graded</p>
            </div>
          )}

          <div className="flex gap-2">
            {current < questions.length - 1 ? (
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={!canProceed} onClick={() => setCurrent(c => c + 1)}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={!allAnswered || saving} onClick={handleSubmit}>
                {saving ? 'Saving...' : 'Submit Pre-Test'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-slate-400">Skip</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}