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
  BookOpen, Upload, Loader2, Eye 
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

export default function CourseEditor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    cover_image: '',
    category: '',
    difficulty: 'beginner',
    is_published: false,
  });
  const [uploading, setUploading] = useState(false);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.Course.filter({ id: courseId }).then(res => res[0]),
    enabled: !!courseId,
  });

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
      });
    }
  }, [course]);

  const sortedLessons = [...lessons].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (courseId) {
        return base44.entities.Course.update(courseId, formData);
      } else {
        return base44.entities.Course.create(formData);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['course']);
      queryClient.invalidateQueries(['courses']);
      toast.success('Course saved!');
      if (!courseId) {
        navigate(createPageUrl('CourseEditor') + `?id=${result.id}`);
      }
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId) => base44.entities.Lesson.delete(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries(['lessons']);
      toast.success('Lesson deleted');
    },
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
                      <SelectItem value="web-development">Web Development</SelectItem>
                      <SelectItem value="programming-basics">Programming Basics</SelectItem>
                      <SelectItem value="devops">DevOps</SelectItem>
                      <SelectItem value="data-science">Data Science</SelectItem>
                      <SelectItem value="mobile-development">Mobile Development</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                                  className={`flex items-center gap-3 p-3 bg-slate-50 rounded-xl border ${
                                    snapshot.isDragging ? 'shadow-lg border-indigo-300' : 'border-transparent'
                                  }`}
                                >
                                  <div {...provided.dragHandleProps} className="cursor-grab text-slate-400">
                                    <GripVertical className="w-5 h-5" />
                                  </div>
                                  <span className="text-sm font-medium text-slate-400 w-8">
                                    {String(index + 1).padStart(2, '0')}
                                  </span>
                                  <span className="flex-1 font-medium text-slate-700 truncate">
                                    {lesson.title}
                                  </span>
                                  <div className="flex gap-1">
                                    <Link to={createPageUrl('LessonEditor') + `?id=${lesson.id}`}>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                    </Link>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}