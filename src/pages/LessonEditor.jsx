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
  ClipboardList, FlaskConical, Sparkles, CheckSquare, Clock, Trash2, GripVertical, BookOpen,
  ExternalLink, BookOpenCheck
} from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import ContentBlockEditor from '../components/editor/ContentBlockEditor';
import QuizEditor from '../components/editor/QuizEditor';
import ContentRenderer from '../components/viewer/ContentRenderer';
import AISuggestions from '../components/editor/AISuggestions';
import DocumentReference from '../components/editor/DocumentReference';
import LessonTemplate from '../components/editor/LessonTemplate';
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
    is_hidden: false,
  });
  const [isDirty, setIsDirty] = useState(false);
  const initialLoaded = React.useRef(false);
  const [pendingNav, setPendingNav] = useState(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [saveAndNew, setSaveAndNew] = useState(false);
  const [showSaveNewConfirm, setShowSaveNewConfirm] = useState(false);
  const [showSavedBanner, setShowSavedBanner] = useState(false);
  const [showPostSaveDialog, setShowPostSaveDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [activeTab, setActiveTab] = useState('edit');
  const [insertAfterIndex, setInsertAfterIndex] = useState(null);
  const [showPreTest, setShowPreTest] = useState(false);
  const [showPostTest, setShowPostTest] = useState(false);
  const [generatingTests, setGeneratingTests] = useState(false);
  const [testCount, setTestCount] = useState(5);

  const handleNavWithGuard = (url) => {
    if (isDirty) {
      setPendingNav(url);
      setShowUnsavedDialog(true);
    } else {
      navigate(url);
    }
  };

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
      initialLoaded.current = false;
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
        is_hidden: lesson.is_hidden || false,
      });
      if (preTest.length > 0) setShowPreTest(true);
      if (postTest.length > 0) setShowPostTest(true);
      setTimeout(() => { initialLoaded.current = true; }, 0);
    } else if (!lessonId) {
      setTimeout(() => { initialLoaded.current = true; }, 0);
    }
  }, [lesson]);

  // Track dirty state whenever formData changes after initial load
  const prevFormData = React.useRef(null);
  useEffect(() => {
    if (!initialLoaded.current) return;
    if (prevFormData.current !== null) setIsDirty(true);
    prevFormData.current = formData;
  }, [formData]);

  const validateAndSave = (andNew = false) => {
    const errors = [];
    if (!formData.title?.trim()) errors.push('title');
    setValidationErrors(errors);
    if (errors.length > 0) return;
    setSaveAndNew(andNew);
    saveMutation.mutate();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        ...formData,
        estimated_time: formData.estimated_time ? Number(formData.estimated_time) : null,
        activities: {
          ...formData.activities,
          suggested_time: formData.activities?.suggested_time ? Number(formData.activities.suggested_time) : null,
        },
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
      queryClient.invalidateQueries({ queryKey: ['lesson'] });
      queryClient.invalidateQueries({ queryKey: ['lessons'] });
      setIsDirty(false);
      setShowSavedBanner(true);
      setTimeout(() => setShowSavedBanner(false), 2500);
      if (saveAndNew) {
        setSaveAndNew(false);
        setFormData({ title: '', content: [], quiz: [], pre_test: [], post_test: [], activities: { suggested_time: '', items: [] }, estimated_time: '', is_subtopic: false, parent_lesson_id: '' });
        navigate(createPageUrl('LessonEditor') + `?courseId=${result.course_id || effectiveCourseId}`);
      } else if (!lessonId) {
        navigate(createPageUrl('LessonEditor') + `?id=${result.id}`);
      } else {
        setShowPostSaveDialog(true);
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
      ...(type === 'heading' && { level: 3 }),
      ...((type === 'bullet_list' || type === 'numbered_list') && { items: [''] }),
    };
    setFormData(prev => {
      const newContent = [...prev.content];
      if (insertAfterIndex === -1) {
        newContent.unshift(newBlock);
      } else if (insertAfterIndex !== null) {
        newContent.splice(insertAfterIndex + 1, 0, newBlock);
      } else {
        newContent.push(newBlock);
      }
      return { ...prev, content: newContent };
    });
    setInsertAfterIndex(null);
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
      .filter(b => ['text', 'heading', 'note', 'tip', 'bullet_list', 'numbered_list'].includes(b.type))
      .map(b => b.content || (b.items || []).join(', '))
      .join('\n');

    if (!formData.title && !contentText) {
      toast.error('Please add a lesson title or some content first');
      return;
    }

    setGeneratingTests(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate exactly ${testCount} test questions for a lesson titled: "${formData.title}".
${contentText ? `\nLesson content:\n${contentText}` : ''}

Create a mix of: multiple choice, true/false, multiple answers (checkbox), and coding problems.
Questions must directly test understanding of this lesson's content.

Return JSON with a "questions" array. Each question must have:
- type: "multiple_choice" | "true_false" | "multiple_answers" | "coding"
- question: string
- For multiple_choice/true_false: options (array), correct_answer (index number)
- For true_false: options must be exactly ["True","False"]
- For multiple_answers: options (array), correct_answers (array of correct index numbers)
- For coding: starter_code (optional skeleton), solution (model answer)
- explanation: string`,
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
            <span>&#10003; Lesson Saved!</span>
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
            {lessonId && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                onClick={() => handleNavWithGuard(createPageUrl('LessonView') + `?id=${lessonId}`)}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Lesson
              </Button>
            )}
            {effectiveCourseId && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-slate-600"
                onClick={() => handleNavWithGuard(createPageUrl('CourseView') + `?id=${effectiveCourseId}`)}
              >
                <BookOpenCheck className="w-3.5 h-3.5" />
                View Course
              </Button>
            )}
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
              onClick={() => validateAndSave()}
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
          <div className="grid lg:grid-cols-4 gap-6">
            {/* LEFT SIDEBAR - sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-16 space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto pb-4">
                {/* Save Actions */}
                <div className="bg-white rounded-2xl border p-4 space-y-2">
                   <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Actions</p>
                  {isDirty && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1.5">Unsaved changes</p>
                  )}
                  <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${formData.is_hidden ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200'}`}>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Hidden from students</p>
                      <p className="text-xs text-slate-400">{formData.is_hidden ? 'Lesson is hidden' : 'Lesson is visible'}</p>
                    </div>
                    <Switch
                      checked={formData.is_hidden || false}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_hidden: v }))}
                    />
                  </div>
                  <Button
                    onClick={() => validateAndSave(false)}
                    disabled={saveMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700 w-full"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Lesson
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { const errors = []; if (!formData.title?.trim()) errors.push('title'); setValidationErrors(errors); if (errors.length === 0) setShowSaveNewConfirm(true); }}
                    disabled={saveMutation.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Save &amp; Add New
                  </Button>
                </div>

                {/* Add Content Block */}
                <div className="bg-white rounded-2xl border p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Add Content Block</p>
                  {insertAfterIndex !== null && (
                    <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-2 py-1 mb-2">
                      Inserting after block {insertAfterIndex + 1}
                      <button className="ml-2 underline" onClick={() => setInsertAfterIndex(null)}>clear</button>
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    {BLOCK_TYPES.map((block) => (
                      <button
                        key={block.type}
                        onClick={() => addBlock(block.type)}
                        className="flex items-center gap-1.5 px-2 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-all text-left text-xs"
                      >
                        <block.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{block.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Other sidebar tools */}
                <LessonTemplate
                  onInsertBlocks={(blocks) => setFormData(prev => ({ ...prev, content: [...prev.content, ...blocks] }))}
                />

                <AISuggestions
                  lessonTitle={formData.title}
                  onInsertBlock={(block) => setFormData(prev => ({ ...prev, content: [...prev.content, block] }))}
                />

                <DocumentReference
                  onInsertBlock={(block) => setFormData(prev => ({ ...prev, content: [...prev.content, block] }))}
                />

                <div className="bg-white rounded-2xl border p-4">
                  <h3 className="font-semibold text-slate-900 mb-3 text-sm">Formatting Tips</h3>
                  <div className="text-xs text-slate-600 space-y-1.5">
                    <p className="text-slate-500"><strong className="text-slate-700">Text block</strong> — use the toolbar to bold, italicize, color, resize, add links, lists, and more by selecting text first.</p>
                    <p className="text-slate-500 mt-2"><strong className="text-slate-700">Heading colors</strong> — only for heading blocks:</p>
                    <p><code className="bg-slate-100 px-1 rounded">[red:text]</code> <code className="bg-slate-100 px-1 rounded">[blue:text]</code></p>
                    <p><code className="bg-slate-100 px-1 rounded">[green:text]</code> <code className="bg-slate-100 px-1 rounded">[orange:text]</code></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Editor */}
            <div className="lg:col-span-3 space-y-6">
              {/* Validation Errors Banner */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 mb-1">Please fill in the required fields before saving:</p>
                    <ul className="text-sm text-red-600 list-disc list-inside">
                      {validationErrors.includes('title') && <li>Lesson Title is required</li>}
                    </ul>
                  </div>
                </div>
              )}

              {/* Title & Meta */}
              <div className={`bg-white rounded-2xl border p-6 space-y-4 ${validationErrors.includes('title') ? 'border-red-400 ring-1 ring-red-300' : ''}`}>
                <div>
                  <Label htmlFor="title" className={validationErrors.includes('title') ? 'text-red-600' : ''}>
                    Lesson Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      if (e.target.value.trim()) setValidationErrors(prev => prev.filter(e => e !== 'title'));
                    }}
                    placeholder="e.g., Getting Started with Variables"
                    className={`mt-1.5 text-lg ${validationErrors.includes('title') ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
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
                      <div {...provided.droppableProps} ref={provided.innerRef}>
                        {/* Insert zone at top */}
                        {formData.content.length > 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              onClick={() => setInsertAfterIndex(-1)}
                              className={`flex-1 h-6 rounded border-2 border-dashed transition-all text-xs flex items-center justify-center gap-1 ${insertAfterIndex === -1 ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-400'}`}
                            >
                              <Plus className="w-3 h-3" /> Insert at top
                            </button>
                          </div>
                        )}
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
                                {/* Insert zone after each block */}
                                <div className="flex items-center gap-2 my-1">
                                  <button
                                    onClick={() => setInsertAfterIndex(index)}
                                    className={`flex-1 h-6 rounded border-2 border-dashed transition-all text-xs flex items-center justify-center gap-1 ${insertAfterIndex === index ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-400'}`}
                                  >
                                    <Plus className="w-3 h-3" /> Insert here
                                  </button>
                                </div>
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
                    <p className="text-sm text-slate-400">Click a block type in the left panel to add content</p>
                  </div>
                )}
              </div>

              {/* Pre-Test Section */}
              <div className="bg-white rounded-2xl border p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Pre-Test</h3>
                      <p className="text-xs text-slate-500">Given before the lesson (up to 5 items)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Count:</span>
                      <input
                        type="number" min={3} max={10}
                        value={testCount}
                        onChange={(e) => setTestCount(Math.max(3, Math.min(10, Number(e.target.value))))}
                        className="w-14 h-7 text-xs text-center border rounded px-1"
                      />
                    </div>
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
                      <p className="text-xs text-slate-500">Given after the lesson (up to 5 items)</p>
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

              {/* Unsaved Changes Dialog */}
              <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
                    <AlertDialogDescription>
                      You have unsaved changes. Do you want to save before leaving, or leave without saving?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <AlertDialogCancel onClick={() => { setShowUnsavedDialog(false); setPendingNav(null); }}>
                      Stay &amp; Keep Editing
                    </AlertDialogCancel>
                    <Button
                      variant="outline"
                      onClick={() => { setShowUnsavedDialog(false); if (pendingNav) navigate(pendingNav); setPendingNav(null); }}
                    >
                      Leave Without Saving
                    </Button>
                    <AlertDialogAction
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => {
                        setShowUnsavedDialog(false);
                        const dest = pendingNav;
                        setPendingNav(null);
                        const errors = [];
                        if (!formData.title?.trim()) errors.push('title');
                        setValidationErrors(errors);
                        if (errors.length === 0) {
                          setSaveAndNew(false);
                          saveMutation.mutate(undefined, {
                            onSuccess: () => { if (dest) navigate(dest); }
                          });
                        }
                      }}
                    >
                      Save &amp; Leave
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Post-Save "What's next?" Dialog */}
              <Dialog open={showPostSaveDialog} onOpenChange={setShowPostSaveDialog}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Lesson saved! What's next?</DialogTitle>
                    <DialogDescription>
                      Would you like to add another lesson, create a new course, or keep editing?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-2 mt-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => { setShowPostSaveDialog(false); navigate(createPageUrl('LessonEditor') + `?courseId=${effectiveCourseId}`); }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Another Lesson
                    </Button>
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 w-full"
                      onClick={() => { setShowPostSaveDialog(false); navigate(createPageUrl('CourseEditor')); }}
                    >
                      <BookOpen className="w-4 h-4 mr-1" /> Create New Course
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={() => setShowPostSaveDialog(false)}>
                      Keep Editing
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

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
                      onClick={() => { setShowSaveNewConfirm(false); validateAndSave(true); }}
                    >
                      Save &amp; Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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