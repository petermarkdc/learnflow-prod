import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, Save, Plus, GripVertical, Edit, Trash2, 
  BookOpen, Upload, Loader2, Eye, Users, Globe, Lock, Indent, Copy, ArrowRightLeft, UserPlus, X
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

const ALL_CATEGORIES = [
  { value: 'web-development', label: 'Web Development' },
  { value: 'programming-basics', label: 'Programming Basics' },
  { value: 'devops', label: 'DevOps' },
  { value: 'data-science', label: 'Data Science' },
  { value: 'mobile-development', label: 'Mobile Development' },
  { value: 'robotics', label: 'Robotics' },
  { value: 'arduino', label: 'Arduino' },
  { value: 'raspberry-pi', label: 'Raspberry Pi' },
  { value: 'other', label: 'Other' },
  ...(() => { try { return JSON.parse(localStorage.getItem('learnflow_custom_categories') || '[]'); } catch { return []; } })(),
];

export default function CourseEditor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');

  const generateCode = () => Math.random().toString(36).substr(2, 6).toUpperCase();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_image: '',
    category: '',
    difficulty: 'beginner',
    is_published: false,
    access_type: 'free',
    course_code: generateCode(),
    collaborators: [],
  });
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [transferLesson, setTransferLesson] = useState(null); // lesson to transfer
  const [transferCourseId, setTransferCourseId] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.Course.filter({ id: courseId }).then(res => res[0]),
    enabled: !!courseId,
  });

  // Only owner, collaborator, or admin can edit this course
  const isOwner = !courseId || !user || user.role === 'admin' || 
    (course && (course.created_by === user?.email || (course.collaborators || []).includes(user?.email)));

  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => base44.entities.Lesson.filter({ course_id: courseId }),
    enabled: !!courseId,
  });

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title || '',
        description: course.description || '',
        cover_image: course.cover_image || '',
        category: course.category || '',
        difficulty: course.difficulty || 'beginner',
        is_published: course.is_published || false,
        access_type: course.access_type || 'free',
        course_code: course.course_code || '',
        collaborators: course.collaborators || [],
      });
    }
  }, [course]);

  const sortedLessons = [...lessons].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { _override_created_by, ...cleanData } = formData;
      if (courseId) {
        const payload = user?.role === 'admin' && _override_created_by
          ? { ...cleanData, created_by: _override_created_by }
          : cleanData;
        return base44.entities.Course.update(courseId, payload);
      } else {
        return base44.entities.Course.create(cleanData);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['course']);
      queryClient.invalidateQueries(['courses']);
      toast.success('Course saved successfully!');
      if (!courseId) {
        navigate(createPageUrl('CourseEditor') + `?id=${result.id}`);
      }
    },
    onError: () => {
      toast.error('Failed to save course. Please try again.');
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId) => base44.entities.Lesson.delete(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons']);
      toast.success('Lesson deleted!');
    },
    onError: () => toast.error('Failed to delete lesson.'),
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorderedLessons) => {
      const updates = reorderedLessons.map((lesson, index) => 
        base44.entities.Lesson.update(lesson.id, { order_index: index })
      );
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons']);
    },
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = [...sortedLessons];
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    reorderMutation.mutate(items);
  };

  const toggleSubtopic = (lesson) => {
    base44.entities.Lesson.update(lesson.id, { is_subtopic: !lesson.is_subtopic }).then(() => {
      queryClient.invalidateQueries(['lessons']);
    });
  };

  const duplicateLessonMutation = useMutation({
    mutationFn: async (lesson) => {
      const { id, created_date, updated_date, created_by, ...lessonData } = lesson;
      return base44.entities.Lesson.create({
        ...lessonData,
        title: `${lesson.title} (Copy)`,
        order_index: (lesson.order_index || 0) + 0.5,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons']);
      toast.success('Lesson duplicated!');
    },
    onError: () => toast.error('Failed to duplicate lesson.'),
  });

  const transferLessonMutation = useMutation({
    mutationFn: async ({ lesson, targetCourseId }) => {
      const allTargetLessons = await base44.entities.Lesson.filter({ course_id: targetCourseId });
      return base44.entities.Lesson.update(lesson.id, {
        course_id: targetCourseId,
        order_index: allTargetLessons.length,
        is_subtopic: false,
        parent_lesson_id: '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons']);
      setTransferLesson(null);
      setTransferCourseId('');
      toast.success('Lesson transferred!');
    },
  });

  // Fetch teacher's other courses for transfer
  const { data: myCourses = [] } = useQuery({
    queryKey: ['my-courses', user?.email],
    queryFn: () => base44.entities.Course.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, cover_image: file_url });
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  if (courseLoading && courseId) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={courseId ? createPageUrl('CourseView') + `?id=${courseId}` : createPageUrl('Home')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-slate-900">
              {courseId ? 'Edit Course' : 'Create Course'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {courseId && (
              <Link to={createPageUrl('CourseView') + `?id=${courseId}`}>
                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </Link>
            )}
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

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border p-6 space-y-6">
              <div>
                <Label htmlFor="title">Course Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Introduction to Python"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What will students learn in this course?"
                  className="mt-1.5 min-h-[100px]"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cover Image */}
              <div>
                <Label>Cover Image</Label>
                <div className="mt-1.5">
                  {formData.cover_image ? (
                    <div className="relative rounded-xl overflow-hidden">
                      <img 
                        src={formData.cover_image} 
                        alt="Cover" 
                        className="w-full h-48 object-cover"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-3 right-3"
                        onClick={() => setFormData({ ...formData, cover_image: '' })}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        className="hidden"
                      />
                      {uploading ? (
                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-sm text-slate-500">Click to upload cover image</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>

              {/* Access Type */}
              <div>
                <Label>Access Type</Label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {[
                    { value: 'public', icon: Globe, label: 'Public', desc: 'No login needed', color: 'border-green-400 bg-green-50' },
                    { value: 'free', icon: Users, label: 'Free', desc: 'Login required', color: 'border-blue-400 bg-blue-50' },
                    { value: 'paid', icon: Lock, label: 'Private', desc: 'Invite / code only', color: 'border-amber-400 bg-amber-50' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, access_type: opt.value })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                        formData.access_type === opt.value ? opt.color + ' border-2' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <opt.icon className="w-5 h-5 text-slate-700" />
                      <span className="text-sm font-semibold text-slate-900">{opt.label}</span>
                      <span className="text-xs text-slate-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Course Code - always visible */}
              <div>
                <Label>Course Code</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={formData.course_code}
                    onChange={(e) => setFormData({ ...formData, course_code: e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) })}
                    placeholder="e.g., AB12CD"
                    className="font-mono tracking-widest uppercase font-bold"
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, course_code: generateCode() })}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">6-character alphanumeric code. Students enter this to self-enroll.</p>
              </div>

              {/* Admin: Change Author */}
              {courseId && user?.role === 'admin' && (
                <div>
                  <Label>Author (created_by)</Label>
                  <p className="text-xs text-slate-500 mb-2">Admin only — change the course owner</p>
                  <Input
                    value={formData._override_created_by ?? course?.created_by ?? ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, _override_created_by: e.target.value.trim() }))}
                    placeholder="owner@email.com"
                  />
                </div>
              )}

              {/* Collaborators */}
              {courseId && user && (course?.created_by === user?.email || user?.role === 'admin') && (
                <div>
                  <Label>Collaborators</Label>
                  <p className="text-xs text-slate-500 mb-2">Other teachers who can edit this course</p>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={collaboratorInput}
                      onChange={(e) => setCollaboratorInput(e.target.value)}
                      placeholder="teacher@email.com"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const email = collaboratorInput.trim().toLowerCase();
                          if (email && !formData.collaborators.includes(email)) {
                            setFormData(prev => ({ ...prev, collaborators: [...prev.collaborators, email] }));
                          }
                          setCollaboratorInput('');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const email = collaboratorInput.trim().toLowerCase();
                        if (email && !formData.collaborators.includes(email)) {
                          setFormData(prev => ({ ...prev, collaborators: [...prev.collaborators, email] }));
                        }
                        setCollaboratorInput('');
                      }}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                  {formData.collaborators.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.collaborators.map(email => (
                        <div key={email} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-lg">
                          <span>{email}</span>
                          <button
                            onClick={() => setFormData(prev => ({ ...prev, collaborators: prev.collaborators.filter(e => e !== email) }))}
                            className="hover:text-indigo-900"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Publish Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-900">Publish Course</p>
                  <p className="text-sm text-slate-500">Make this course visible to students</p>
                </div>
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(v) => setFormData({ ...formData, is_published: v })}
                />
              </div>
            </div>

            {/* Lessons Section */}
            {courseId && (
              <div className="bg-white rounded-2xl border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Lessons ({sortedLessons.length})
                  </h2>
                  <Link to={createPageUrl('LessonEditor') + `?courseId=${courseId}`}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Lesson
                    </Button>
                  </Link>
                </div>

                {lessonsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 rounded-xl" />
                    ))}
                  </div>
                ) : sortedLessons.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-xl">
                    <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">No lessons yet</p>
                    <p className="text-sm text-slate-400">Add your first lesson to get started</p>
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="lessons">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {sortedLessons.map((lesson, index) => (
                            <Draggable key={lesson.id} draggableId={lesson.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                    snapshot.isDragging ? 'shadow-lg border-indigo-300 bg-white' : 'border-transparent bg-slate-50'
                                  } ${lesson.is_subtopic ? 'ml-6' : ''}`}
                                >
                                  <div {...provided.dragHandleProps} className="cursor-grab text-slate-400">
                                    <GripVertical className="w-5 h-5" />
                                  </div>
                                  <span className="text-sm font-medium text-slate-400 w-6 flex-shrink-0">
                                    {String(index + 1).padStart(2, '0')}
                                  </span>
                                  <span className={`flex-1 font-medium text-slate-700 truncate ${lesson.is_subtopic ? 'text-sm' : ''}`}>
                                    {lesson.title}
                                  </span>
                                  <button
                                    title={lesson.is_subtopic ? 'Remove sub-topic indent' : 'Make sub-topic (indent)'}
                                    onClick={() => toggleSubtopic(lesson)}
                                    className={`p-1 rounded hover:bg-slate-200 transition-colors flex-shrink-0 ${lesson.is_subtopic ? 'text-indigo-500' : 'text-slate-300 hover:text-slate-500'}`}
                                  >
                                    <Indent className="w-4 h-4" />
                                  </button>
                                  <div className="flex gap-1">
                                     <Link to={createPageUrl('LessonEditor') + `?id=${lesson.id}`}>
                                       <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit">
                                         <Edit className="w-4 h-4" />
                                       </Button>
                                     </Link>
                                     <Button
                                       variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600"
                                       title="Duplicate"
                                       onClick={() => duplicateLessonMutation.mutate(lesson)}
                                     >
                                       <Copy className="w-4 h-4" />
                                     </Button>
                                     <Button
                                       variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-600"
                                       title="Transfer to another course"
                                       onClick={() => { setTransferLesson(lesson); setTransferCourseId(''); }}
                                     >
                                       <ArrowRightLeft className="w-4 h-4" />
                                     </Button>
                                     <AlertDialog>
                                       <AlertDialogTrigger asChild>
                                         <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" title="Delete">
                                           <Trash2 className="w-4 h-4" />
                                         </Button>
                                       </AlertDialogTrigger>
                                       <AlertDialogContent>
                                         <AlertDialogHeader>
                                           <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
                                           <AlertDialogDescription>
                                             Are you sure you want to delete "{lesson.title}"? This action cannot be undone.
                                           </AlertDialogDescription>
                                         </AlertDialogHeader>
                                         <AlertDialogFooter>
                                           <AlertDialogCancel>Cancel</AlertDialogCancel>
                                           <AlertDialogAction
                                             onClick={() => deleteLessonMutation.mutate(lesson.id)}
                                             className="bg-red-600 hover:bg-red-700"
                                           >
                                             Delete
                                           </AlertDialogAction>
                                         </AlertDialogFooter>
                                       </AlertDialogContent>
                                     </AlertDialog>
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
                )}
              </div>
            )}
          </div>

          {/* Bottom Save Button (below lessons) */}
          {courseId && (
            <div className="bg-white rounded-2xl border p-4 flex justify-end">
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
                Save Course Settings
              </Button>
            </div>
          )}
        </div>

          {/* Sidebar Tips */}

          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
              <h3 className="font-semibold text-slate-900 mb-3">💡 Tips for a great course</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Write a clear, descriptive title</li>
                <li>• Add an engaging cover image</li>
                <li>• Break content into small lessons</li>
                <li>• Include code examples</li>
                <li>• Add quizzes to test understanding</li>
              </ul>
            </div>

            {courseId && (
              <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-semibold text-slate-900 mb-3">Course Status</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lessons</span>
                    <span className="font-medium">{sortedLessons.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className={`font-medium ${formData.is_published ? 'text-green-600' : 'text-amber-600'}`}>
                      {formData.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Access</span>
                    <span className="font-medium capitalize">{formData.access_type}</span>
                  </div>
                </div>
                <Link to={createPageUrl('CourseStudents') + `?id=${courseId}`} className="mt-4 block">
                  <Button variant="outline" size="sm" className="w-full">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Students
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    {/* Transfer Lesson Dialog */}
      <Dialog open={!!transferLesson} onOpenChange={(o) => { if (!o) setTransferLesson(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Lesson</DialogTitle>
            <DialogDescription>
              Move "{transferLesson?.title}" to another course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Target Course</Label>
              <Select value={transferCourseId} onValueChange={setTransferCourseId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                  {myCourses.filter(c => c.id !== courseId).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setTransferLesson(null)}>Cancel</Button>
              <Button
                disabled={!transferCourseId || transferLessonMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => transferLessonMutation.mutate({ lesson: transferLesson, targetCourseId: transferCourseId })}
              >
                {transferLessonMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Transfer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}