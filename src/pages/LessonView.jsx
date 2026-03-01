import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  ChevronLeft, ChevronRight, Menu, CheckCircle2, 
  BookOpen, Edit, Copy, Printer, FlaskConical, Clock
} from 'lucide-react';
import ContentRenderer from '../components/viewer/ContentRenderer';
import QuizViewer from '../components/viewer/QuizViewer';
import LessonSidebar from '../components/course/LessonSidebar';
import TableOfContents from '../components/viewer/TableOfContents';
import PreTestModal from '../components/lesson/PreTestModal';
import PostTestModal from '../components/lesson/PostTestModal';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LessonView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPreTest, setShowPreTest] = useState(false);
  const [preTestDone, setPreTestDone] = useState(false);
  const [showPostTest, setShowPostTest] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const lessonId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => base44.entities.Lesson.filter({ id: lessonId }).then(res => res[0]),
    enabled: !!lessonId,
  });

  const { data: course } = useQuery({
    queryKey: ['course', lesson?.course_id],
    queryFn: () => base44.entities.Course.filter({ id: lesson.course_id }).then(res => res[0]),
    enabled: !!lesson?.course_id,
  });

  const { data: allLessons = [] } = useQuery({
    queryKey: ['courseLessons', lesson?.course_id],
    queryFn: () => base44.entities.Lesson.filter({ course_id: lesson.course_id }),
    enabled: !!lesson?.course_id,
  });

  const { data: progress } = useQuery({
    queryKey: ['progress', lesson?.course_id, user?.email],
    queryFn: () => base44.entities.Progress.filter({ 
      course_id: lesson.course_id, 
      user_email: user.email 
    }).then(res => res[0]),
    enabled: !!lesson?.course_id && !!user?.email,
  });

  // Check if pre-test was already taken
  const { data: existingPreTest } = useQuery({
    queryKey: ['pretest', lessonId, user?.email],
    queryFn: () => base44.entities.TestResult.filter({ lesson_id: lessonId, user_email: user.email, test_type: 'pre_test' }).then(res => res[0]),
    enabled: !!lessonId && !!user?.email,
  });

  // Show pre-test modal once when lesson loads if pre_test exists and not yet taken
  useEffect(() => {
    if (lesson && user && !preTestDone && existingPreTest === null && lesson.pre_test?.length > 0) {
      setShowPreTest(true);
      setPreTestDone(true);
    }
  }, [lesson, user, existingPreTest, preTestDone]);

  const sortedLessons = [...allLessons].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const currentIndex = sortedLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null;
  const completedLessons = progress?.completed_lessons || [];
  const isCompleted = completedLessons.includes(lessonId);
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  // Only the course owner, collaborator, or admin can edit/duplicate lessons
  const isOwner = user?.role === 'admin' || 
    (course && (course.created_by === user?.email || (course.collaborators || []).includes(user?.email)));

  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      if (progress) {
        const newCompleted = isCompleted 
          ? completedLessons.filter(id => id !== lessonId)
          : [...completedLessons, lessonId];
        return base44.entities.Progress.update(progress.id, {
          completed_lessons: newCompleted,
          last_lesson_id: lessonId,
        });
      } else {
        return base44.entities.Progress.create({
          user_email: user.email,
          course_id: lesson.course_id,
          completed_lessons: [lessonId],
          last_lesson_id: lessonId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['progress']);
      toast.success(isCompleted ? 'Marked as incomplete' : 'Lesson completed!');
    },
  });

  const duplicateLessonMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Lesson.create({
        ...lesson,
        id: undefined,
        title: `${lesson.title} (Copy)`,
        order_index: (lesson.order_index || 0) + 1,
      });
    },
    onSuccess: (newLesson) => {
      queryClient.invalidateQueries(['courseLessons']);
      toast.success('Lesson duplicated!');
      navigate(createPageUrl('LessonEditor') + `?id=${newLesson.id}`);
    },
  });

  const handlePreTestComplete = async ({ score, total, answers }) => {
    await base44.entities.TestResult.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      course_id: lesson.course_id,
      lesson_id: lessonId,
      lesson_title: lesson.title,
      test_type: 'pre_test',
      score,
      total,
      answers,
    });
    queryClient.invalidateQueries(['pretest', lessonId, user?.email]);
    setShowPreTest(false);
  };

  const handlePostTestComplete = async ({ score, total, answers }) => {
    await base44.entities.TestResult.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      course_id: lesson.course_id,
      lesson_id: lessonId,
      lesson_title: lesson.title,
      test_type: 'post_test',
      score,
      total,
      answers,
    });
    queryClient.invalidateQueries(['posttest', lessonId, user?.email]);
    setShowPostTest(false);
    toast.success('Post-test submitted!');
  };

  const handleQuizComplete = async (score) => {
    if (!progress) {
      await base44.entities.Progress.create({
        user_email: user.email,
        course_id: lesson.course_id,
        completed_lessons: [lessonId],
        last_lesson_id: lessonId,
        quiz_scores: { [lessonId]: score },
      });
    } else {
      await base44.entities.Progress.update(progress.id, {
        quiz_scores: { ...progress.quiz_scores, [lessonId]: score },
        completed_lessons: completedLessons.includes(lessonId) 
          ? completedLessons 
          : [...completedLessons, lessonId],
        last_lesson_id: lessonId,
      });
    }
    queryClient.invalidateQueries(['progress']);
  };

  if (lessonLoading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-2/3 mb-6" />
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-4 w-3/4 mb-6" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Lesson not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Desktop Sidebar */}
      {course && (
        <div className="hidden lg:block w-80 border-r bg-slate-50 flex-shrink-0">
          <LessonSidebar
            course={course}
            lessons={sortedLessons}
            currentLessonId={lessonId}
            completedLessons={completedLessons}
          />
        </div>
      )}

      {/* Main Content + TOC */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b px-4 py-3">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              {/* Mobile menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  {course && (
                    <LessonSidebar
                      course={course}
                      lessons={sortedLessons}
                      currentLessonId={lessonId}
                      completedLessons={completedLessons}
                      onClose={() => setSidebarOpen(false)}
                    />
                  )}
                </SheetContent>
              </Sheet>
              
              <span className="text-sm text-slate-500">
                Lesson {currentIndex + 1} of {sortedLessons.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  <Link to={createPageUrl('LessonEditor') + `?id=${lessonId}`}>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => duplicateLessonMutation.mutate()}
                    disabled={duplicateLessonMutation.isPending}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.print()}
                title="Print to PDF"
              >
                <Printer className="w-4 h-4" />
              </Button>

              {user && (
                <Button
                  variant={isCompleted ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => markCompleteMutation.mutate()}
                  disabled={markCompleteMutation.isPending}
                  className={cn(isCompleted && "bg-green-100 text-green-700 hover:bg-green-200")}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {isCompleted ? 'Completed' : 'Mark Complete'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content row */}
        <div className="flex-1 flex">
          {/* Article */}
          <div className="flex-1 px-4 py-8 min-w-0">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-8">
                {lesson.title}
              </h1>

              <ContentRenderer blocks={lesson.content || []} />

              {/* Quiz Section */}
              {lesson.quiz && lesson.quiz.length > 0 && (
                <div className="mt-12 pt-8 border-t">
                  <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    Knowledge Check
                  </h2>
                  <QuizViewer
                    questions={lesson.quiz}
                    onComplete={handleQuizComplete}
                  />
                </div>
              )}
            </div>
          </div>

          {/* TOC Sidebar */}
          <div className="hidden xl:block w-56 flex-shrink-0 px-4 py-8 border-l bg-white">
            <TableOfContents blocks={lesson.content || []} />
          </div>
        </div>

        {/* Navigation */}
        <div className="border-t bg-slate-50 px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            {prevLesson ? (
              <Link to={createPageUrl('LessonView') + `?id=${prevLesson.id}`}>
                <Button variant="ghost" className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Previous:</span>
                  <span className="max-w-[150px] truncate">{prevLesson.title}</span>
                </Button>
              </Link>
            ) : (
              <div />
            )}

            {nextLesson ? (
              <Link to={createPageUrl('LessonView') + `?id=${nextLesson.id}`}>
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <span className="hidden sm:inline">Next:</span>
                  <span className="max-w-[150px] truncate">{nextLesson.title}</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Link to={createPageUrl('CourseView') + `?id=${lesson.course_id}`}>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  Finish Course
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}