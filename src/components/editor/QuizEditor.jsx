import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, HelpCircle, Code } from 'lucide-react';
import { cn } from "@/lib/utils";

const TYPE_LABELS = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  multiple_answers: 'Multiple Answers',
  coding: 'Coding Problem',
};

const makeQuestion = (type = 'multiple_choice') => {
  const base = { id: Date.now().toString(), type, question: '', explanation: '' };
  if (type === 'true_false') return { ...base, options: ['True', 'False'], correct_answer: 0 };
  if (type === 'multiple_choice') return { ...base, options: ['', '', '', ''], correct_answer: 0 };
  if (type === 'multiple_answers') return { ...base, options: ['', '', '', ''], correct_answers: [] };
  if (type === 'coding') return { ...base, starter_code: '', solution: '' };
  return base;
};

export default function QuizEditor({ questions = [], onChange, maxQuestions, label = 'Quiz', defaultCount }) {
  const addQuestion = (type = 'multiple_choice') => {
    onChange([...questions, makeQuestion(type)]);
  };

  const updateQuestion = (index, updates) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const deleteQuestion = (index) => {
    onChange(questions.filter((_, i) => i !== index));
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], options: updated[qIndex].options.map((o, i) => i === oIndex ? value : o) };
    onChange(updated);
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex] = { ...updated[qIndex], options: [...updated[qIndex].options, ''] };
    onChange(updated);
  };

  const removeOption = (qIndex, oIndex) => {
    const updated = [...questions];
    const opts = updated[qIndex].options.filter((_, i) => i !== oIndex);
    updated[qIndex] = {
      ...updated[qIndex],
      options: opts,
      correct_answer: updated[qIndex].correct_answer >= opts.length ? 0 : updated[qIndex].correct_answer,
      correct_answers: (updated[qIndex].correct_answers || []).filter(i => i !== oIndex).map(i => i > oIndex ? i - 1 : i),
    };
    onChange(updated);
  };

  const changeType = (qIndex, newType) => {
    const q = questions[qIndex];
    const newQ = makeQuestion(newType);
    newQ.id = q.id;
    newQ.question = q.question;
    newQ.explanation = q.explanation || '';
    updateQuestion(qIndex, newQ);
  };

  const toggleCorrectAnswer = (qIndex, oIndex, checked) => {
    const current = questions[qIndex].correct_answers || [];
    const next = checked ? [...current, oIndex] : current.filter(i => i !== oIndex);
    updateQuestion(qIndex, { correct_answers: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-slate-900">{label} Questions</h3>
          {maxQuestions && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {questions.length}/{maxQuestions}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {['multiple_choice', 'true_false', 'multiple_answers', 'coding'].map(type => (
            <Button
              key={type}
              onClick={() => addQuestion(type)}
              variant="outline"
              size="sm"
              disabled={maxQuestions ? questions.length >= maxQuestions : false}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              {TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed">
          <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p>No questions yet</p>
          <p className="text-sm">Add questions using the buttons above or generate with AI</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, qIndex) => {
            const qtype = q.type || 'multiple_choice';
            return (
              <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="p-1 text-slate-400 cursor-grab mt-1">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-3">
                    {/* Header row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Q{qIndex + 1}</span>
                      <Select value={qtype} onValueChange={(v) => changeType(qIndex, v)}>
                        <SelectTrigger className="h-7 text-xs w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_LABELS).map(([v, l]) => (
                            <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Question text */}
                    <Input
                      value={q.question}
                      onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                      placeholder="Enter your question..."
                    />

                    {/* Type-specific inputs */}
                    {(qtype === 'multiple_choice' || qtype === 'true_false') && (
                      <div className="pl-2 space-y-2">
                        <Label className="text-xs text-slate-500">Options — select the correct answer</Label>
                        <RadioGroup
                          value={String(q.correct_answer ?? 0)}
                          onValueChange={(v) => updateQuestion(qIndex, { correct_answer: Number(v) })}
                        >
                          {(q.options || []).map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <RadioGroupItem value={String(oIndex)} id={`q${qIndex}-o${oIndex}`} />
                              <Input
                                value={option}
                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                placeholder={qtype === 'true_false' ? option : `Option ${oIndex + 1}`}
                                disabled={qtype === 'true_false'}
                                className={cn("flex-1 h-8 text-sm", q.correct_answer === oIndex && "border-green-500 bg-green-50")}
                              />
                              {qtype === 'multiple_choice' && q.options.length > 2 && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOption(qIndex, oIndex)}>
                                  <Trash2 className="w-3 h-3 text-slate-400" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </RadioGroup>
                        {qtype === 'multiple_choice' && q.options.length < 6 && (
                          <Button variant="ghost" size="sm" onClick={() => addOption(qIndex)} className="text-xs text-slate-500">
                            <Plus className="w-3 h-3 mr-1" /> Add option
                          </Button>
                        )}
                      </div>
                    )}

                    {qtype === 'multiple_answers' && (
                      <div className="pl-2 space-y-2">
                        <Label className="text-xs text-slate-500">Options — check all correct answers</Label>
                        {(q.options || []).map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <Checkbox
                              checked={(q.correct_answers || []).includes(oIndex)}
                              onCheckedChange={(c) => toggleCorrectAnswer(qIndex, oIndex, c)}
                              id={`q${qIndex}-ma${oIndex}`}
                            />
                            <Input
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              placeholder={`Option ${oIndex + 1}`}
                              className={cn("flex-1 h-8 text-sm", (q.correct_answers || []).includes(oIndex) && "border-green-500 bg-green-50")}
                            />
                            {q.options.length > 2 && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOption(qIndex, oIndex)}>
                                <Trash2 className="w-3 h-3 text-slate-400" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {q.options.length < 6 && (
                          <Button variant="ghost" size="sm" onClick={() => addOption(qIndex)} className="text-xs text-slate-500">
                            <Plus className="w-3 h-3 mr-1" /> Add option
                          </Button>
                        )}
                      </div>
                    )}

                    {qtype === 'coding' && (
                      <div className="pl-2 space-y-3">
                        <div>
                          <Label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                            <Code className="w-3 h-3" /> Starter Code (optional)
                          </Label>
                          <Textarea
                            value={q.starter_code || ''}
                            onChange={(e) => updateQuestion(qIndex, { starter_code: e.target.value })}
                            placeholder="// Code skeleton for students..."
                            className="text-xs font-mono"
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500 flex items-center gap-1 mb-1">
                            <Code className="w-3 h-3" /> Solution / Model Answer <span className="text-red-400">(visible to author/admin only)</span>
                          </Label>
                          <Textarea
                            value={q.solution || ''}
                            onChange={(e) => updateQuestion(qIndex, { solution: e.target.value })}
                            placeholder="// Expected solution..."
                            className="text-xs font-mono border-green-300"
                            rows={3}
                          />
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    <Textarea
                      value={q.explanation || ''}
                      onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                      placeholder="Explanation (shown after answering)..."
                      className="text-sm"
                      rows={2}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteQuestion(qIndex)} className="text-slate-400 hover:text-red-500 flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}