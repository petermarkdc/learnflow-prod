import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, HelpCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function QuizEditor({ questions = [], onChange, maxQuestions, label = "Quiz" }) {
  const addQuestion = () => {
    const newQuestion = {
      id: Date.now().toString(),
      question: '',
      options: ['', '', '', ''],
      correct_answer: 0,
      explanation: ''
    };
    onChange([...questions, newQuestion]);
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
    updated[qIndex].options[oIndex] = value;
    onChange(updated);
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    onChange(updated);
  };

  const removeOption = (qIndex, oIndex) => {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.filter((_, i) => i !== oIndex);
    if (updated[qIndex].correct_answer >= updated[qIndex].options.length) {
      updated[qIndex].correct_answer = 0;
    }
    onChange(updated);
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
        <Button
          onClick={addQuestion}
          variant="outline"
          size="sm"
          disabled={maxQuestions ? questions.length >= maxQuestions : false}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed">
          <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p>No quiz questions yet</p>
          <p className="text-sm">Add questions to test student understanding</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="flex items-start gap-2">
                <div className="p-1 text-slate-400 cursor-grab">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Q{qIndex + 1}
                    </span>
                    <Input
                      value={q.question}
                      onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                      placeholder="Enter your question..."
                      className="flex-1"
                    />
                  </div>

                  <div className="pl-4 space-y-2">
                    <Label className="text-xs text-slate-500">Answer Options (select the correct one)</Label>
                    <RadioGroup
                      value={String(q.correct_answer)}
                      onValueChange={(v) => updateQuestion(qIndex, { correct_answer: Number(v) })}
                    >
                      {q.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <RadioGroupItem value={String(oIndex)} id={`q${qIndex}-o${oIndex}`} />
                          <Input
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`Option ${oIndex + 1}`}
                            className={cn(
                              "flex-1",
                              q.correct_answer === oIndex && "border-green-500 bg-green-50"
                            )}
                          />
                          {q.options.length > 2 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeOption(qIndex, oIndex)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                    {q.options.length < 6 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => addOption(qIndex)}
                        className="text-slate-500"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add option
                      </Button>
                    )}
                  </div>

                  <Textarea
                    value={q.explanation || ''}
                    onChange={(e) => updateQuestion(qIndex, { explanation: e.target.value })}
                    placeholder="Explanation (shown after answering)..."
                    className="text-sm"
                    rows={2}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteQuestion(qIndex)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}