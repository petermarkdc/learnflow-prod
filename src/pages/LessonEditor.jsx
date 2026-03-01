import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Save, Plus, Eye, Loader2,
  Type, Code, Image as ImageIcon, Link as LinkIcon, Heading, Minus,
  Table, Video, Paperclip, Info, AlertTriangle, Lightbulb, Indent, List, ListOrdered,
  ClipboardList, FlaskConical, Sparkles, CheckSquare, Clock, Trash2, GripVertical
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ContentBlockEditor from '../components/editor/ContentBlockEditor';
import QuizEditor from '../components/editor/QuizEditor';
import ContentRenderer from '../components/viewer/ContentRenderer';
import AISuggestions from '../components/editor/AISuggestions';
import QuizViewer from '../components/viewer/QuizViewer';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from "sonner";

const BLOCK_TYPES = [
  { type: 'heading', icon: Heading, label: 'Heading' },
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'bullet_list', icon: List, label: 'Bullet List' },
  { type: 'numbered_list', icon: ListOrdered, label: 'Numbered List' },
  { type: 'code', icon: Code, label: 'Code' },
  { type: 'image', icon: ImageIcon, label: 'Image' },
  { type: 'video', icon: Video, label: 'Video' },
  { type: 'attachment', icon: Paperclip, label: 'Attachment' },
  { type: 'link', icon: LinkIcon, label: 'Link' },
  { type: 'table', icon: Table, label: 'Table' },
  { type: 'divider', icon: Minus, label: 'Divider' },
  { type: 'note', icon: Info, label: 'Note' },
  { type: 'warning', icon: AlertTriangle, label: 'Warning' },
  { type: 'tip', icon: Lightbulb, label: 'Tip' },
];

export default function LessonEditor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const lessonId = urlParams.get('id');
  const courseId = urlParams.get('courseId');

  const [formData, setFormData] = useState({
    title: '',
    content: [],
    quiz: [],
    pre_test: [],
    post_test: [],
    activities: { suggested_time: '', items: [] },
    estimated_time: '',
    is_subtopic: false,
    parent_lesson_id: '',
  });
  const [saveAndNew, setSaveAndNew] = useState(false);
  const [showSaveNewConfirm, setShowSaveNewConfirm] = useState(false);
  const [showSavedBanner, setShowSavedBanner] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  const [showPreTest, setShowPreTest] = useState(false);
  const [showPostTest, setShowPostTest] = useState(false);
  const [generatingTests, setGeneratingTests] = useState(false);

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => base44.entities.Lesson.filter({ id: lessonId }).then(res => res[0]),
    enabled: !!lessonId,
  });

  const { data: course } = useQuery({
    queryKey: ['course', lesson?.course_id || courseId],
    queryFn: () => base44.entities.Course.filter({ id: lesson?.course_id || courseId }).then(res => res[0]),
    enabled: !!(lesson?.course_id || courseId),
  });

  const effectiveCourseId = lesson?.course_id || courseId;

  const { data: allCourseLessons = [] } = useQuery({
    queryKey: ['lessons', effectiveCourseId],
    queryFn: () => base44.entities.Lesson.filter({ course_id: effectiveCourseId }),
    enabled: !!effectiveCourseId,
  });

  const parentLessonOptions = allCourseLessons
    .filter(l => !l.is_subtopic && l.id !== lessonId)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  useEffect(() => {
    if (lesson) {
      const preTest = lesson.pre_test || [];
      const postTest = lesson.post_test || [];
      setFormData({
        title: lesson.title || '',
        content: lesson.content || [],
        quiz: lesson.quiz || [],
        pre_test: preTest,
        post_test: postTest,
        activities: lesson.activities || { suggested_time: '', items: [] },
        estimated_time: lesson.estimated_time || '',
        is_subtopic: lesson.is_subtopic || false,
        parent_lesson_id: lesson.parent_lesson_id || '',
      });
      if (preTest.length > 0) setShowPreTest(true);
      if (postTest.length > 0) setShowPostTest(true);
    }
  }, [lesson]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...formData,
        estimated_time: formData.estimated_time ? Number(formData.estimated_time) : null,
      };
      
      if (lessonId) {
        return base44.entities.Lesson.update(lessonId, data);
      } else {
        const allLessons = await base44.entities.Lesson.filter({ course_id: courseId });
        return base44.entities.Lesson.create({
          ...data,
          course_id: courseId,
          order_index: allLessons.length,
        });
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['lesson']);
      queryClient.invalidateQueries(['lessons']);
      // Center-screen notification
      setShowSavedBanner(true);
      setTimeout(() => setShowSavedBanner(false), 2500);
      if (saveAndNew) {
        setSaveAndNew(false);
        setFormData({ title: '', content: [], quiz: [], pre_test: [], post_test: [], activities: { suggested_time: '', items: [] }, estimated_time: '', is_subtopic: false, parent_lesson_id: '' });
        navigate(createPageUrl('LessonEditor') + `?courseId=${result.course_id || effectiveCourseId}`);
      } else if (!lessonId) {
        navigate(createPageUrl('LessonEditor') + `?id=${result.id}`);
      }
    },
    onError: () => {
      toast.error('Failed to save lesson. Please try again.');
    },
  });

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now().toString(),
      type,
      content: '',
      ...(type === 'code' && { language: 'javascript' }),
      ...(type === 'heading' && { level: 2 }),
      ...((type === 'bullet_list' || type === 'numbered_list') && { items: [''] }),
    };
    setFormData(prev => ({ ...prev, content: [...prev.content, newBlock] }));
  };

  const updateBlock = (index, updatedBlock) => {
    setFormData(prev => {
      const newContent = [...prev.content];
      newContent[index] = updatedBlock;
      return { ...prev, content: newContent };
    });
  };

  const deleteBlock = (index) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content.filter((_, i) => i !== index),
    }));
  };

  const generateTestsWithAI = async () => {
    const contentText = formData.content
      .filter(b => b.type === 'text' || b.type === 'heading' || b.type === 'note' || b.type === 'tip')
      .map(b => b.content || (b.items || []).join(', '))
      .join('\n');

    if (!formData.title && !contentText) {
      toast.error('Please add a lesson title or some content first');
      return;
    }

    setGeneratingTests(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate 10 multiple-choice quiz questions for a lesson titled: "${formData.title}".
${contentText ? `\nLesson content:\n${contentText}` : ''}

Create questions that test understanding of the key concepts. Each question should have 4 options with one correct answer and a brief explanation.

Return JSON:
{
  "questions": [
    {
      "question": "...",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": 0,
      "explanation": "..."
    }
  ]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "number" },
                explanation: { type: "string" }
              }
            }
          }
        }
      }
    });

    const questions = (result.questions || []).map((q, i) => ({ ...q, id: `ai-${Date.now()}-${i}` }));
    setFormData(prev => ({ ...prev, pre_test: questions, post_test: questions }));
    setShowPreTest(true);
    setShowPostTest(true);
    setGeneratingTests(false);
    toast.success(`Generated ${questions.length} questions for pre-test and post-test!`);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    setFormData(prev => {
      const items = [...prev.content];
      const [reorderedItem] = items.splice(result.source.index, 1);
      items.splice(result.destination.index, 0, reorderedItem);
      return { ...prev, content: items };
    });
  };

  if (lessonLoading && lessonId) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  const targetCourseId = lesson?.course_id || courseId;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Save Success Banner */}
      {showSavedBanner && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
          <div className="bg-green-500 text-white px-10 py-5 rounded-2xl shadow-2xl text-lg font-semibold flex items-center gap-3 animate-in fade-in zoom-in-95">
            <span>✓ Lesson Saved!</span>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={targetCourseId ? createPageUrl('CourseEditor') + `?id=${targetCourseId}` : createPageUrl('Home')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <p className="text-sm text-slate-500">{course?.title || 'Course'}</p>
              <h1 className="text-lg font-semibold text-slate-900">
                {lessonId ? 'Edit Lesson' : 'New Lesson'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'edit' ? (
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Editor */}
            <div className="lg:col-span-3 space-y-6">
              {/* Title & Meta */}
              <div className="bg-white rounded-2xl border p-6 space-y-4">
                <div>
                  <Label htmlFor="title">Lesson Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Getting Started with Variables"
                    className="mt-1.5 text-lg"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="w-48">
                    <Label htmlFor="time">Estimated Time (minutes)</Label>
                    <Input
                      id="time"
                      type="number"
                      value={formData.estimated_time}
                      onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                      placeholder="15"
                      className="mt-1.5"
                    />
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                      <Indent className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">Sub-topic</p>
                        <p className="text-xs text-slate-500">Indent in sidebar</p>
                      </div>
                      <Switch
                        checked={formData.is_subtopic}
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_subtopic: v, parent_lesson_id: v ? prev.parent_lesson_id : '' }))}
                      />
                    </div>
                    {formData.is_subtopic && (
                      <div>
                        <Label className="text-xs text-slate-500 mb-1 block">Parent Lesson</Label>
                        <Select
                          value={formData.parent_lesson_id}
                          onValueChange={(v) => setFormData(prev => ({ ...prev, parent_lesson_id: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select parent lesson" />
                          </SelectTrigger>
                          <SelectContent>
                            {parentLessonOptions.map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Blocks */}
              <div className="bg-white rounded-2xl border p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Content</h2>
                
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="content-blocks">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                        {formData.content.map((block, index) => (
                          <Draggable key={block.id} draggableId={block.id} index={index}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps}>
                                <ContentBlockEditor
                                  block={block}
                                  onChange={(updated) => updateBlock(index, updated)}
                                  onDelete={() => deleteBlock(index)}
                                  dragHandleProps={provided.dragHandleProps}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>

                {formData.content.length === 0 && (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <Type className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500 mb-2">No content blocks yet</p>
                    <p className="text-sm text-slate-400">Add blocks from the sidebar to build your lesson</p>
                  </div>
                )}

                {/* Quick add buttons */}
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-slate-500 mb-3">Add content block:</p>
                  <div className="flex flex-wrap gap-2">
                    {BLOCK_TYPES.map((block) => (
                      <Button
                        key={block.type}
                        variant="outline"
                        size="sm"
                        onClick={() => addBlock(block.type)}
                        className="gap-2"
                      >
                        <block.icon className="w-4 h-4" />
                        {block.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pre-Test Section */}
              <div className="bg-white rounded-2xl border p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Pre-Test</h3>
                      <p className="text-xs text-slate-500">Given before the lesson (up to 20 items)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={generateTestsWithAI}
                      disabled={generatingTests}
                      className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                      {generatingTests ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Generate with AI
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{showPreTest ? 'Enabled' : 'Disabled'}</span>
                      <Switch
                        checked={showPreTest}
                        onCheckedChange={(v) => {
                          setShowPreTest(v);
                          if (!v) setFormData(prev => ({ ...prev, pre_test: [] }));
                        }}
                      />
                    </div>
                  </div>
                </div>
                {showPreTest && (
                  <div className="mt-4">
                    <QuizEditor
                      questions={formData.pre_test}
                      onChange={(pre_test) => setFormData(prev => ({ ...prev, pre_test }))}
                      maxQuestions={20}
                      label="Pre-Test"
                    />
                  </div>
                )}
              </div>

              {/* Activities Section */}
              <div className="bg-white rounded-2xl border p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-amber-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Activities</h3>
                      <p className="text-xs text-slate-500">Numbered to-do list for this lesson</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      placeholder="Time (min)"
                      className="w-32 h-8 text-sm"
                      value={formData.activities?.suggested_time || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        activities: { ...prev.activities, suggested_time: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {(formData.activities?.items || []).map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 group">
                      <span className="w-6 h-6 flex-shrink-0 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <Input
                        value={item.task}
                        onChange={(e) => {
                          const items = [...(formData.activities?.items || [])];
                          items[idx] = { ...item, task: e.target.value };
                          setFormData(prev => ({ ...prev, activities: { ...prev.activities, items } }));
                        }}
                        placeholder={`Activity ${idx + 1}...`}
                        className="flex-1 h-9"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                        onClick={() => {
                          const items = (formData.activities?.items || []).filter((_, i) => i !== idx);
                          setFormData(prev => ({ ...prev, activities: { ...prev.activities, items } }));
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {(formData.activities?.items || []).length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-xl mb-3">
                    <CheckSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">No activities yet. Add tasks for students to complete.</p>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => {
                    const newItem = { id: Date.now().toString(), task: '' };
                    setFormData(prev => ({
                      ...prev,
                      activities: {
                        ...prev.activities,
                        items: [...(prev.activities?.items || []), newItem]
                      }
                    }));
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Activity
                </Button>
              </div>

              {/* Post-Test Section */}
              <div className="bg-white rounded-2xl border p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Post-Test</h3>
                      <p className="text-xs text-slate-500">Given after the lesson (up to 20 items)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">{showPostTest ? 'Enabled' : 'Disabled'}</span>
                    <Switch
                      checked={showPostTest}
                      onCheckedChange={(v) => {
                        setShowPostTest(v);
                        if (!v) setFormData(prev => ({ ...prev, post_test: [] }));
                      }}
                    />
                  </div>
                </div>
                {showPostTest && (
                  <div className="mt-4">
                    <QuizEditor
                      questions={formData.post_test}
                      onChange={(post_test) => setFormData(prev => ({ ...prev, post_test }))}
                      maxQuestions={20}
                      label="Post-Test"
                    />
                  </div>
                )}
              </div>

              {/* Bottom Save Bar */}
              <div className="bg-white rounded-2xl border p-4 flex items-center gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveNewConfirm(true)}
                  disabled={saveMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Save & Add New Lesson
                </Button>
                <Button
                  onClick={() => { setSaveAndNew(false); saveMutation.mutate(); }}
                  disabled={saveMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Lesson
                </Button>
              </div>

              {/* Save & New Confirmation Dialog */}
              <AlertDialog open={showSaveNewConfirm} onOpenChange={setShowSaveNewConfirm}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Save and create new lesson?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will save the current lesson and open a blank editor for a new lesson in the same course.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => { setShowSaveNewConfirm(false); setSaveAndNew(true); saveMutation.mutate(); }}
                    >
                      Save & Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <AISuggestions
                lessonTitle={formData.title}
                onInsertBlock={(block) => setFormData(prev => ({ ...prev, content: [...prev.content, block] }))}
              />

              <div className="bg-white rounded-2xl border p-5">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Formatting</h3>
                <div className="text-xs text-slate-600 space-y-2">
                  <p><code className="bg-slate-100 px-1 rounded">**bold**</code> for <strong>bold</strong></p>
                  <p><code className="bg-slate-100 px-1 rounded">*italic*</code> for <em>italic</em></p>
                  <p><code className="bg-slate-100 px-1 rounded">`code`</code> for <code className="bg-slate-100 px-1 rounded text-pink-600">code</code></p>
                  <p><code className="bg-slate-100 px-1 rounded">- item</code> for bullets</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Preview Tab */
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border p-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-8">
                {formData.title || 'Untitled Lesson'}
              </h1>
              
              <ContentRenderer blocks={formData.content} />

              {formData.activities?.items?.length > 0 && (
                <div className="mt-12 pt-8 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-slate-900">Activities</h2>
                    {formData.activities.suggested_time && (
                      <span className="flex items-center gap-1.5 text-sm text-slate-500 bg-amber-50 px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4 text-amber-500" />
                        {formData.activities.suggested_time} min suggested
                      </span>
                    )}
                  </div>
                  <ol className="space-y-3">
                    {formData.activities.items.map((item, idx) => (
                      <li key={item.id} className="flex items-start gap-3">
                        <span className="w-7 h-7 flex-shrink-0 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-slate-700 pt-1">{item.task}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {formData.quiz && formData.quiz.length > 0 && (
                <div className="mt-12 pt-8 border-t">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">Knowledge Check</h2>
                  <QuizViewer questions={formData.quiz} />
                </div>
              )}

              {formData.content.length === 0 && !formData.activities?.items?.length && (
                <div className="text-center py-12 text-slate-400">
                  <p>No content to preview yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}