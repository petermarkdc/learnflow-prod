import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, HelpCircle, RotateCcw, Code } from 'lucide-react';
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

function scoreQuestion(q, answer) {
  const type = q.type || 'multiple_choice';
  if (type === 'coding') return true; // manual grading
  if (type === 'multiple_answers') {
    const a = [...(answer || [])].sort((x, y) => x - y);
    const b = [...(q.correct_answers || [])].sort((x, y) => x - y);
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return answer === q.correct_answer;
}

export default function QuizViewer({ questions = [], onComplete, showAnswers = false }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [submitted, setSubmitted] = useState({});

  const question = questions[currentQuestion];
  const qtype = question?.type || 'multiple_choice';
  const hasAnswered = submitted[question?.id];
  const selectedAnswer = answers[question?.id];
  const isCorrect = hasAnswered && scoreQuestion(question, selectedAnswer);

  const handleSingleSelect = (value) => {
    if (!hasAnswered) setAnswers({ ...answers, [question.id]: Number(value) });
  };

  const handleMultiSelect = (oIndex, checked) => {
    if (hasAnswered) return;
    const current = answers[question.id] || [];
    const next = checked ? [...current, oIndex] : current.filter(i => i !== oIndex);
    setAnswers({ ...answers, [question.id]: next });
  };

  const handleCodeChange = (val) => {
    if (!hasAnswered) setAnswers({ ...answers, [question.id]: val });
  };

  const handleSubmit = () => {
    setSubmitted({ ...submitted, [question.id]: true });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      const scorable = questions.filter(q => (q.type || 'multiple_choice') !== 'coding');
      const correctCount = scorable.filter(q => scoreQuestion(q, answers[q.id])).length;
      const score = scorable.length ? Math.round((correctCount / scorable.length) * 100) : 100;
      setShowResult(true);
      onComplete?.(score);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted({});
    setShowResult(false);
  };

  if (questions.length === 0) return null;

  if (showResult) {
    const scorable = questions.filter(q => (q.type || 'multiple_choice') !== 'coding');
    const correctCount = scorable.filter(q => scoreQuestion(q, answers[q.id])).length;
    const score = scorable.length ? Math.round((correctCount / scorable.length) * 100) : 100;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 text-center"
      >
        <div className={cn("w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4",
          score >= 70 ? "bg-green-100" : score >= 50 ? "bg-yellow-100" : "bg-red-100")}>
          {score >= 70 ? <CheckCircle2 className="w-12 h-12 text-green-600" /> : <HelpCircle className="w-12 h-12 text-yellow-600" />}
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Quiz Complete!</h3>
        <p className="text-4xl font-bold text-indigo-600 mb-2">{score}%</p>
        <p className="text-slate-600 mb-6">
          {scorable.length > 0 ? `You got ${correctCount} out of ${scorable.length} scored questions correct` : 'All coding problems — check manually'}
        </p>
        <Button onClick={handleReset} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" /> Try Again
        </Button>
      </motion.div>
    );
  }

  const canSubmit = (() => {
    if (qtype === 'coding') return true;
    if (qtype === 'multiple_answers') return (selectedAnswer || []).length > 0;
    return selectedAnswer !== undefined;
  })();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-6 py-3 border-b">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 capitalize">
            {(qtype).replace('_', ' ')}
          </span>
        </div>
        <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={question.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6">
          <h4 className="text-xl font-semibold text-slate-900 mb-6">{question.question}</h4>

          {/* Multiple Choice & True/False */}
          {(qtype === 'multiple_choice' || qtype === 'true_false') && (
            <div className="space-y-3">
              {(question.options || []).map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectOption = index === question.correct_answer;
                return (
                  <Label key={index} htmlFor={`opt-${index}`}
                    className={cn("flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      !hasAnswered && "hover:bg-slate-50 hover:border-indigo-200",
                      !hasAnswered && isSelected && "border-indigo-500 bg-indigo-50",
                      !hasAnswered && !isSelected && "border-slate-200",
                      hasAnswered && isCorrectOption && "border-green-500 bg-green-50",
                      hasAnswered && isSelected && !isCorrectOption && "border-red-500 bg-red-50",
                      hasAnswered && !isSelected && !isCorrectOption && "border-slate-200 opacity-50"
                    )}
                  >
                    <input type="radio" id={`opt-${index}`} name={`q-${question.id}`} value={index}
                      checked={isSelected} onChange={() => handleSingleSelect(index)} disabled={hasAnswered} className="w-4 h-4" />
                    <span className="flex-1">{option}</span>
                    {hasAnswered && isCorrectOption && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    {hasAnswered && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-red-600" />}
                  </Label>
                );
              })}
            </div>
          )}

          {/* Multiple Answers */}
          {qtype === 'multiple_answers' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-2">Select all correct answers</p>
              {(question.options || []).map((option, index) => {
                const isSelected = (selectedAnswer || []).includes(index);
                const isCorrectOption = (question.correct_answers || []).includes(index);
                return (
                  <Label key={index} htmlFor={`ma-${index}`}
                    className={cn("flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all",
                      !hasAnswered && "hover:bg-slate-50 hover:border-indigo-200",
                      !hasAnswered && isSelected && "border-indigo-500 bg-indigo-50",
                      !hasAnswered && !isSelected && "border-slate-200",
                      hasAnswered && isCorrectOption && "border-green-500 bg-green-50",
                      hasAnswered && isSelected && !isCorrectOption && "border-red-500 bg-red-50",
                      hasAnswered && !isSelected && !isCorrectOption && "border-slate-200 opacity-50"
                    )}
                  >
                    <Checkbox id={`ma-${index}`} checked={isSelected}
                      onCheckedChange={(c) => handleMultiSelect(index, c)} disabled={hasAnswered} />
                    <span className="flex-1">{option}</span>
                    {hasAnswered && isCorrectOption && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    {hasAnswered && isSelected && !isCorrectOption && <XCircle className="w-5 h-5 text-red-600" />}
                  </Label>
                );
              })}
            </div>
          )}

          {/* Coding */}
          {qtype === 'coding' && (
            <div className="space-y-3">
              {question.starter_code && (
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-sm whitespace-pre">
                  {question.starter_code}
                </div>
              )}
              <Textarea
                value={selectedAnswer || ''}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Write your code here..."
                className="font-mono text-sm min-h-[120px]"
                disabled={hasAnswered}
              />
              {hasAnswered && question.solution && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                    <Code className="w-3 h-3" /> Model Solution
                  </p>
                  <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap">{question.solution}</pre>
                </div>
              )}
            </div>
          )}

          {/* Explanation */}
          {hasAnswered && question.explanation && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={cn("mt-4 p-4 rounded-xl", isCorrect ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200")}>
              <p className="text-sm font-medium text-slate-700 mb-1">
                {qtype === 'coding' ? 'Explanation' : isCorrect ? 'Correct!' : 'Not quite right'}
              </p>
              <p className="text-sm text-slate-600">{question.explanation}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3">
        {!hasAnswered ? (
          <Button onClick={handleSubmit} disabled={!canSubmit} className="bg-indigo-600 hover:bg-indigo-700">
            {qtype === 'coding' ? 'Submit Code' : 'Check Answer'}
          </Button>
        ) : (
          <Button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-700">
            {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'}
          </Button>
        )}
      </div>
    </div>
  );
}