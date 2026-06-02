import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, Clock, ChevronRight, CheckCircle2, Circle, 
  Play, Edit, Copy, Trash2, ArrowLeft, Lock, Globe, Users
} from 'lucide-react';
import AccessGate from '../components/course/AccessGate';
import PreTestModal from '../components/lesson/PreTestModal';
import PostTestModal from '../components/lesson/PostTestModal';
import CourseAuthors from '../components/course/CourseAuthors';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
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
import { toast } from "sonner";

const difficultyColors = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

export default function CourseView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showCoursePreTest, setShowCoursePreTest] = useState(false);
  const [coursePreTestDone, setCoursePreTestDone] = useState(false);
  const [showCoursePostTest, setShowCoursePostTest] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

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

  const { data: progress } = useQuery({
    queryKey: ['progress', courseId, user?.email],
    queryFn: () => base44.entities.Progress.filter({ 
      course_id: courseId, 
      user_email: user.email 
    }).then(res => res[0]),
    enabled: !!courseId && !!user?.email,
  });

  // Check if course-level pre-test was already taken
  const { data: existingCoursePreTest } = useQuery({
    queryKey: ['course-pretest', courseId, user?.email],
    queryFn: () => base44.entities.TestResult.filter({ course_id: courseId, user_email: user.email, test_type: 'pre_test', lesson_id: 'course_level' }),
    enabled: !!courseId && !!user?.email,
  });

  const { data: enrollment, isSuccess: enrollmentLoaded } = useQuery({
    queryKey: ['enrollment', courseId, user?.email],
    queryFn: () => base44.entities.Enrollment.filter({ course_id: courseId, user_email: user.email, status: 'active' }).then(r => r[0]),
    enabled: !!courseId && !!user?.email,
  });

  // Auto-enroll students who access free courses (so they appear in enrollment summary)
  useEffect(() => {
    if (!user || !course || course.access_type !== 'free' || !enrollmentLoaded || enrollment) return;
    base44.entities.Enrollment.filter({ course_id: course.id, user_email: user.email }).then(existing => {
      if (existing.length === 0) {
        base44.entities.Enrollment.create({ course_id: course.id, user_email: user.email, enrolled_by: 'self', status: 'active' });
      } else if (existing[0].status === 'removed') {
        base44.entities.Enrollment.update(existing[0].id, { status: 'active' });
      }
    });
  }, [user, course, enrollment, enrollmentLoaded]);

  // Trigger course-level pre-test when course loads
  useEffect(() => {
    if (course && user && !coursePreTestDone && existingCoursePreTest !== undefined) {
      const alreadyTaken = existingCoursePreTest && existingCoursePreTest.length > 0;
      if (!alreadyTaken && course.pre_test_enabled && course.pre_test?.length > 0) {
        setShowCoursePreTest(true);
        setCoursePreTestDone(true);
      }
    }
  }, [course, user, existingCoursePreTest, coursePreTestDone]);

  const handleCoursePreTestComplete = async ({ score, total, answers }) => {
    await base44.entities.TestResult.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      course_id: courseId,
      lesson_id: 'course_level',
      lesson_title: 'Course Pre-Test',
      test_type: 'pre_test',
      score, total, answers,
    });
    queryClient.invalidateQueries(['course-pretest', courseId, user?.email]);
  };

  const handleCoursePostTestComplete = async ({ score, total, answers }) => {
    await base44.entities.TestResult.create({
      user_email: user.email,
      user_name: user.full_name || user.email,
      course_id: courseId,
      lesson_id: 'course_level',
      lesson_title: 'Course Post-Test',
      test_type: 'post_test',
      score, total, answers,
    });
  };

  const sortedLessons = [...lessons].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const completedSet = new Set(progress?.completed_lessons || []);
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  // Admin can edit any course; teacher can edit their own or collaborated courses
  const isOwner = user?.role === 'admin' || 
    (isTeacher && course && (course.created_by === user?.email || (course.collaborators || []).includes(user?.email)));

  // Access check
  const hasAccess = () => {
    if (isTeacher) return true;
    if (!course) return false;
    if (course.access_type === 'public') return true;
    if (course.access_type === 'free') return !!user;
    if (course.access_type === 'paid') return !!enrollment;
    return !!user;
  };

  const accessBadgeMap = {
    public: { label: 'Public', icon: Globe, color: 'bg-green-100 text-green-700' },
    free: { label: 'Free', icon: Users, color: 'bg-blue-100 text-blue-700' },
    paid: { label: 'Private', icon: Lock, color: 'bg-amber-100 text-amber-700' },
  };

  const duplicateCourseMutation = useMutation({
    mutationFn: async () => {
      const newCourse = await base44.entities.Course.create({
        ...course,
        id: undefined,
        title: `${course.title} (Copy)`,
        is_published: false,
      });
      
      for (const lesson of sortedLessons) {
        await base44.entities.Lesson.create({
          ...lesson,
          id: undefined,
          course_id: newCourse.id,
        });
      }
      
      return newCourse;
    },
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries(['courses']);
      toast.success('Course duplicated successfully!');
      navigate(createPageUrl('CourseEditor') + `?id=${newCourse.id}`);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async () => {
      for (const lesson of sortedLessons) {
        await base44.entities.Lesson.delete(lesson.id);
      }
      await base44.entities.Course.delete(courseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['courses']);
      toast.success('Course deleted');
      navigate(createPageUrl('Home'));
    },
  });

  const getNextLesson = () => {
    if (progress?.last_lesson_id) {
      const lastIndex = sortedLessons.findIndex(l => l.id === progress.last_lesson_id);
      if (lastIndex < sortedLessons.length - 1) {
        return sortedLessons[lastIndex + 1];
      }
    }
    const firstIncomplete = sortedLessons.find(l => !completedSet.has(l.id));
    return firstIncomplete || sortedLessons[0];
  };

  if (courseLoading || lessonsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-64 rounded-2xl mb-6" />
          <Skeleton className="h-8 w-2/3 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Course not found</h2>
        </div>
      </div>
    );
  }

  const nextLesson = getNextLesson();
  const progressPercent = sortedLessons.length > 0 
    ? Math.round((completedSet.size / sortedLessons.length) * 100)
    : 0;

  const accessGranted = hasAccess();
  const accessBadge = accessBadgeMap[course.access_type || 'free'];

  // mock lesson-shaped object for reusing modals
  const courseAsLesson = course ? { ...course, pre_test: course.pre_test || [], post_test: course.post_test || [], title: course.title } : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Course-level Pre-Test Modal */}
      {showCoursePreTest && courseAsLesson && user && (
        <PreTestModal
          lesson={courseAsLesson}
          user={user}
          onComplete={handleCoursePreTestComplete}
          onSkip={() => setShowCoursePreTest(false)}
        />
      )}
      {/* Course-level Post-Test Modal */}
      {courseAsLesson && user && (
        <PostTestModal
          lesson={courseAsLesson}
          open={showCoursePostTest}
          onComplete={handleCoursePostTestComplete}
          onClose={() => setShowCoursePostTest(false)}
        />
      )}
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-700" />
        {course.cover_image && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${course.cover_image})` }}
          />
        )}
        <div className="relative max-w-5xl mx-auto px-4 py-12">
          <Link 
            to={createPageUrl('Home')}
            className="inline-flex items-center gap-1 text-indigo-200 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex-1 min-w-[300px]">
              <div className="flex gap-2 mb-3 flex-wrap">
                {course.difficulty && (
                  <Badge className={cn("text-xs", difficultyColors[course.difficulty])}>
                    {course.difficulty}
                  </Badge>
                )}
                {!course.is_published && (
                  <Badge variant="secondary">Draft</Badge>
                )}
                {accessBadge && (
                  <Badge className={cn("text-xs flex items-center gap-1", accessBadge.color)}>
                    <accessBadge.icon className="w-3 h-3" />
                    {accessBadge.label}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {course.title}
              </h1>
              {course.description && (
                <p className="text-lg text-indigo-100 mb-6">{course.description}</p>
              )}
              
              <div className="flex items-center gap-6 text-indigo-200">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{sortedLessons.length} lessons</span>
                </div>
              </div>

              {/* Authors */}
              <div className="mt-4">
                <CourseAuthors course={course} dark />
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-white rounded-2xl p-6 shadow-xl w-full md:w-80">
              {user && progressPercent > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">Your Progress</span>
                    <span className="font-semibold text-indigo-600">{progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {accessGranted ? (
                nextLesson && (
                  <Link to={createPageUrl('LessonView') + `?id=${nextLesson.id}`}>
                    <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-lg mb-3">
                      <Play className="w-5 h-5 mr-2" />
                      {completedSet.size > 0 ? 'Continue Learning' : 'Start Course'}
                    </Button>
                  </Link>
                )
              ) : (
                <div className="mb-3">
                  <AccessGate
                    course={course}
                    user={user}
                    onAccessGranted={() => queryClient.invalidateQueries(['enrollment'])}
                  />
                </div>
              )}

              {isOwner && (
                <div className="flex gap-2 pt-3 border-t mt-3 flex-wrap">
                  <Link to={createPageUrl('CourseEditor') + `?id=${course.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Link to={createPageUrl('CourseStudents') + `?id=${course.id}`}>
                    <Button variant="outline" title="Manage students">
                      <Users className="w-4 h-4" />
                    </Button>
                  </Link>
                  {user?.role === 'admin' && (
                    <Button 
                      variant="outline"
                      onClick={() => duplicateCourseMutation.mutate()}
                      disabled={duplicateCourseMutation.isPending}
                      title="Duplicate course"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Course</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the course and all its lessons. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteCourseMutation.mutate()}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Course Content</h2>
        
        {!accessGranted && !isTeacher && (
          <div className="mb-6">
            <AccessGate
              course={course}
              user={user}
              onAccessGranted={() => queryClient.invalidateQueries(['enrollment'])}
            />
          </div>
        )}

        <div className="space-y-3">
          {sortedLessons.map((lesson, index) => {
            const isCompleted = completedSet.has(lesson.id);
            
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={(accessGranted || isTeacher) ? createPageUrl('LessonView') + `?id=${lesson.id}` : '#'}
                  className={(accessGranted || isTeacher) ? '' : 'pointer-events-none opacity-60'}>
                  <div className={cn(
                    "flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200",
                    (accessGranted || isTeacher) && "hover:border-indigo-200 hover:shadow-md transition-all group",
                    lesson.is_subtopic && "ml-6 border-l-2 border-l-slate-200"
                  )}>
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      isCompleted ? "bg-green-100" : "bg-slate-100"
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <span className="text-sm font-semibold text-slate-500">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {lesson.title}
                      </h3>
                      {lesson.estimated_time && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{lesson.estimated_time} min</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Course-level Post-Test CTA */}
        {course?.post_test_enabled && course?.post_test?.length > 0 && user && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Course Post-Test</h3>
              <p className="text-sm text-slate-500">Assess your overall understanding of this course.</p>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700 gap-2 flex-shrink-0"
              onClick={() => setShowCoursePostTest(true)}
            >
              <Play className="w-4 h-4" />
              Take Post-Test
            </Button>
          </div>
        )}

        {sortedLessons.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No lessons in this course yet</p>
            {isTeacher && (
              <Link to={createPageUrl('CourseEditor') + `?id=${course.id}`}>
                <Button variant="outline" className="mt-4">
                  Add Lessons
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}