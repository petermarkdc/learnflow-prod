import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ClipboardList, FlaskConical } from 'lucide-react';

export default function TestResultDetailModal({ result, onClose }) {
  const isCourseLevel = result?.lesson_id === 'course_level';

  const { data: lesson } = useQuery({
    queryKey: ['lesson-detail', result?.lesson_id],
    queryFn: () => base44.entities.Lesson.filter({ id: result.lesson_id }).then(r => r[0]),
    enabled: !!result && !isCourseLevel,
  });

  const { data: course } = useQuery({
    queryKey: ['course-detail', result?.course_id],
    queryFn: () => base44.entities.Course.filter({ id: result.course_id }).then(r => r[0]),
    enabled: !!result && isCourseLevel,
  });

  if (!result) return null;

  const source = isCourseLevel ? course : lesson;
  const questions = source
    ? (result.test_type === 'pre_test' ? source.pre_test : source.post_test) || []
    : [];

  const pct = Math.round((result.score / result.total) * 100);

  return (
    <Dialog open={!!result} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.test_type === 'pre_test'
              ? <><ClipboardList className="w-5 h-5 text-blue-600" /> Pre-Test Review</>
              : <><FlaskConical className="w-5 h-5 text-green-600" /> Post-Test Review</>
            }
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b mb-4">
          <div>
            <p className="font-semibold text-slate-900">{result.user_name || result.user_email}</p>
            <p className="text-xs text-slate-400">{result.user_email}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{result.score}/{result.total}</p>
            <p className={`text-sm font-semibold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</p>
          </div>
        </div>

        {questions.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">Question details not available.</p>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const userAnswer = result.answers?.[idx];
              const isCorrect = q.type === 'multiple_answers'
                ? JSON.stringify([...(q.correct_answers || [])].sort()) === JSON.stringify([...(Array.isArray(userAnswer) ? userAnswer : [userAnswer])].sort())
                : userAnswer === q.correct_answer;

              return (
                <div key={q.id || idx} className={`rounded-xl border p-4 ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start gap-2 mb-3">
                    {isCorrect
                      ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    }
                    <p className="text-sm font-medium text-slate-800">
                      <span className="text-slate-400 mr-1">Q{idx + 1}.</span>
                      {q.question}
                    </p>
                  </div>

                  {q.options && q.options.length > 0 && (
                    <div className="space-y-1.5 ml-7">
                      {q.options.map((opt, oi) => {
                        const isUserChoice = Array.isArray(userAnswer) ? userAnswer.includes(oi) : userAnswer === oi;
                        const isCorrectChoice = Array.isArray(q.correct_answers) ? q.correct_answers.includes(oi) : q.correct_answer === oi;

                        let rowStyle = 'text-slate-600 bg-white border border-slate-100';
                        if (isCorrectChoice && isUserChoice) rowStyle = 'bg-green-100 text-green-800 font-medium border border-green-300';
                        else if (isCorrectChoice) rowStyle = 'bg-green-100 text-green-800 font-semibold border border-green-400';
                        else if (isUserChoice) rowStyle = 'bg-red-100 text-red-700 border border-red-300';

                        return (
                          <div key={oi} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${rowStyle}`}>
                            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs flex-shrink-0 font-bold">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isUserChoice && isCorrectChoice && (
                              <Badge className="text-xs bg-green-200 text-green-800">Your answer ✓</Badge>
                            )}
                            {isUserChoice && !isCorrectChoice && (
                              <Badge className="text-xs bg-red-200 text-red-700">Your answer ✗</Badge>
                            )}
                            {isCorrectChoice && !isUserChoice && (
                              <Badge className="text-xs bg-green-300 text-green-900 font-semibold">Correct answer</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.explanation && (
                    <p className="mt-2 ml-7 text-xs text-slate-500 italic">{q.explanation}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}