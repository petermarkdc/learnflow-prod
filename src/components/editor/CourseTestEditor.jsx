import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, FlaskConical, Sparkles, Loader2, Save } from 'lucide-react';
import QuizEditor from './QuizEditor';
import { toast } from "sonner";

export default function CourseTestEditor({ courseId, user }) {
  const queryClient = useQueryClient();
  const [preTestEnabled, setPreTestEnabled] = useState(false);
  const [postTestEnabled, setPostTestEnabled] = useState(false);
  const [preTest, setPreTest] = useState([]);
  const [postTest, setPostTest] = useState([]);
  const [generating, setGenerating] = useState(null); // 'pre' | 'post' | null
  const [testCount, setTestCount] = useState(30);
  const [dirty, setDirty] = useState(false);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.Course.filter({ id: courseId }).then(r => r[0]),
    enabled: !!courseId,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => base44.entities.Lesson.filter({ course_id: courseId }),
    enabled: !!courseId,
  });

  useEffect(() => {
    if (course) {
      setPreTestEnabled(course.pre_test_enabled || false);
      setPostTestEnabled(course.post_test_enabled || false);
      setPreTest(course.pre_test || []);
      setPostTest(course.post_test || []);
      setDirty(false);
    }
  }, [course]);

  const saveMutation = useMutation({
    mutationFn: () => base44.entities.Course.update(courseId, {
      pre_test_enabled: preTestEnabled,
      post_test_enabled: postTestEnabled,
      pre_test: preTest,
      post_test: postTest,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      setDirty(false);
      toast.success('Course tests saved!');
    },
    onError: () => toast.error('Failed to save tests.'),
  });

  const buildLessonContext = () => {
    const contentParts = [];
    for (const lesson of lessons) {
      contentParts.push(`\n=== LESSON: ${lesson.title} ===`);
      if (lesson.content) {
        const text = lesson.content
          .filter(b => ['text', 'heading', 'note', 'tip', 'bullet_list', 'numbered_list'].includes(b.type))
          .map(b => b.content || (b.items || []).join(', '))
          .join('\n');
        if (text) contentParts.push(text);
      }
    }
    return contentParts.join('\n');
  };

  const collectLessonQuestions = () => {
    const qs = [];
    for (const lesson of lessons) {
      for (const q of (lesson.pre_test || [])) qs.push({ ...q, lesson_id: lesson.id });
      for (const q of (lesson.post_test || [])) {
        if (!qs.find(x => x.question === q.question)) qs.push({ ...q, lesson_id: lesson.id });
      }
    }
    return qs;
  };

  const generateWithAI = async (testType) => {
    if (lessons.length === 0) {
      toast.error('Please add lessons to the course first.');
      return;
    }
    setGenerating(testType);

    const lessonContext = buildLessonContext();
    const existingLessonQuestions = collectLessonQuestions();
    const existingCount = existingLessonQuestions.length;
    const newCount = Math.max(0, testCount - existingCount);

    const prompt = `You are creating a comprehensive ${testType === 'pre' ? 'pre-test' : 'post-test'} for a course with ${lessons.length} lessons.

Course lessons covered:
${lessonContext}

${existingCount > 0 ? `The following questions already exist from individual lessons (include ALL of them as-is, then add more):
${JSON.stringify(existingLessonQuestions.map(q => ({ type: q.type, question: q.question })), null, 2)}

Now generate ${newCount} ADDITIONAL questions to reach a total of ${testCount} questions.` : `Generate exactly ${testCount} questions.`}

Create a mix of: multiple choice, true/false, multiple answers (checkbox), and coding problems.
Cover ALL lessons proportionally. Questions should test deep understanding.

Return JSON with a "questions" array. Each question must have:
- type: "multiple_choice" | "true_false" | "multiple_answers" | "coding"
- question: string
- For multiple_choice/true_false: options (array), correct_answer (index number)
- For true_false: options must be exactly ["True","False"]
- For multiple_answers: options (array), correct_answers (array of correct index numbers)
- For coding: starter_code (optional skeleton), solution (model answer)
- explanation: string`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                question: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "number" },
                correct_answers: { type: "array", items: { type: "number" } },
                starter_code: { type: "string" },
                solution: { type: "string" },
                explanation: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Merge existing lesson questions + new AI questions
    const newAIQuestions = (result.questions || []).map((q, i) => ({ ...q, id: `ai-${Date.now()}-${i}` }));
    const merged = [
      ...existingLessonQuestions.map((q, i) => ({ ...q, id: q.id || `lesson-${i}` })),
      ...newAIQuestions,
    ].slice(0, testCount);

    if (testType === 'pre') {
      setPreTest(merged);
      setPreTestEnabled(true);
    } else {
      setPostTest(merged);
      setPostTestEnabled(true);
    }
    setDirty(true);
    setGenerating(null);
    toast.success(`Generated ${merged.length} questions (including ${existingLessonQuestions.length} from individual lessons)!`);
  };

  const isAuthorOrAdmin = user?.role === 'admin' || course?.created_by === user?.email || (course?.collaborators || []).includes(user?.email);
  if (!isAuthorOrAdmin) return null;

  return (
    <div className="bg-white rounded-2xl border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Course-Level Tests</h2>
          <p className="text-sm text-slate-500">Pre/Post tests covering all lessons in this course</p>
        </div>
        {dirty && (
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Tests
          </Button>
        )}
      </div>

      {/* AI Generation Controls */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <span className="text-sm font-medium text-indigo-800 flex-1">AI Generation — uses all lesson content for consistency</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-600">Questions:</span>
            <Input
              type="number" min={5} max={100}
              value={testCount}
              onChange={(e) => setTestCount(Math.max(5, Math.min(100, Number(e.target.value))))}
              className="w-20 h-7 text-xs text-center"
            />
          </div>
          <Button size="sm" variant="outline" disabled={!!generating}
            className="gap-2 text-indigo-600 border-indigo-300 hover:bg-indigo-100"
            onClick={() => generateWithAI('pre')}>
            {generating === 'pre' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
            Generate Pre-Test
          </Button>
          <Button size="sm" variant="outline" disabled={!!generating}
            className="gap-2 text-green-600 border-green-300 hover:bg-green-50"
            onClick={() => generateWithAI('post')}>
            {generating === 'post' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
            Generate Post-Test
          </Button>
        </div>
        {generating && (
          <p className="text-xs text-indigo-600 mt-2 animate-pulse">
            Generating {testCount} questions from {lessons.length} lessons... this may take a moment.
          </p>
        )}
      </div>

      <Tabs defaultValue="pre">
        <TabsList className="mb-4">
          <TabsTrigger value="pre" className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Pre-Test ({preTest.length})
          </TabsTrigger>
          <TabsTrigger value="post" className="gap-2">
            <FlaskConical className="w-4 h-4" />
            Post-Test ({postTest.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pre">
          <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-sm text-slate-800">Enable Pre-Test</p>
              <p className="text-xs text-slate-500">Students take this before starting the course</p>
            </div>
            <Switch checked={preTestEnabled} onCheckedChange={(v) => { setPreTestEnabled(v); setDirty(true); }} />
          </div>
          {preTestEnabled && (
            <QuizEditor questions={preTest} onChange={(q) => { setPreTest(q); setDirty(true); }} label="Course Pre-Test" />
          )}
        </TabsContent>

        <TabsContent value="post">
          <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-sm text-slate-800">Enable Post-Test</p>
              <p className="text-xs text-slate-500">Students take this after completing all lessons</p>
            </div>
            <Switch checked={postTestEnabled} onCheckedChange={(v) => { setPostTestEnabled(v); setDirty(true); }} />
          </div>
          {postTestEnabled && (
            <QuizEditor questions={postTest} onChange={(q) => { setPostTest(q); setDirty(true); }} label="Course Post-Test" />
          )}
        </TabsContent>
      </Tabs>

      {dirty && (
        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Course Tests
          </Button>
        </div>
      )}
    </div>
  );
}