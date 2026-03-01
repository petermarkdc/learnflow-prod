import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, CheckCircle2, Clock, Trophy, 
  ChevronRight, Play, Target, Plus, Edit, Users,
  ClipboardList, FlaskConical, RotateCcw
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import PreTestModal from '../components/lesson/PreTestModal';
import PostTestModal from '../components/lesson/PostTestModal';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [activePreTest, setActivePreTest] = useState(null); // lesson object
  const [activePostTest, setActivePostTest] = useState(null); // lesson object
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => base44.entities.Course.list(),
  });

  const { data: authoredCourses = [], isLoading: authoredLoading } = useQuery({
    queryKey: ['authored-courses', user?.email],
    queryFn: () => base44.entities.Course.filter({ created_by: user.email }),
    enabled: !!user?.email && (user?.role === 'teacher' || user?.role === 'admin'),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['allLessons'],
    queryFn: () => base44.entities.Lesson.list(),
  });

  const { data: progressList = [], isLoading: progressLoading } = useQuery({
    queryKey: ['userProgress', user?.email],
    queryFn: () => base44.entities.Progress.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', user?.email],
    queryFn: () => base44.entities.Enrollment.filter({ user_email: user.email, status: 'active' }),
    enabled: !!user?.email,
  });

  const { data: testResults = [] } = useQuery({
    queryKey: ['testResults', user?.email],
    queryFn: () => base44.entities.TestResult.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const saveTestResultMutation = useMutation({
    mutationFn: (data) => base44.entities.TestResult.create(data),
    onSuccess: () => queryClient.invalidateQueries(['testResults', user?.email]),
  });

  // Calculate stats
  const totalCourses = courses.length;
  const coursesStarted = progressList.length;
  const coursesCompleted = progressList.filter(p => {
    const courseLessons = lessons.filter(l => l.course_id === p.course_id);
    return courseLessons.length > 0 && p.completed_lessons?.length >= courseLessons.length;
  }).length;
  const totalLessonsCompleted = progressList.reduce((sum, p) => sum + (p.completed_lessons?.length || 0), 0);

  // Get in-progress courses
  const inProgressCourses = progressList
    .map(p => {
      const course = courses.find(c => c.id === p.course_id);
      if (!course) return null;
      const courseLessons = lessons.filter(l => l.course_id === course.id);
      const completed = p.completed_lessons?.length || 0;
      const total = courseLessons.length;
      if (completed >= total) return null; // Skip completed
      return { course, progress: p, completed, total };
    })
    .filter(Boolean)
    .slice(0, 4);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Please log in</h2>
          <p className="text-slate-500">Sign in to view your learning dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user.full_name?.split(' ')[0] || 'Learner'}! 👋
            </h1>
            <p className="text-indigo-100">Continue your learning journey</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Courses Started', value: coursesStarted, icon: BookOpen, color: 'bg-blue-500' },
            { label: 'Courses Completed', value: coursesCompleted, icon: Trophy, color: 'bg-green-500' },
            { label: 'Lessons Completed', value: totalLessonsCompleted, icon: CheckCircle2, color: 'bg-purple-500' },
            { label: 'Available Courses', value: totalCourses, icon: Target, color: 'bg-amber-500' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="shadow-lg border-0">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                      <stat.icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {progressLoading ? <Skeleton className="h-8 w-12" /> : stat.value}
                      </p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Continue Learning */}
        {inProgressCourses.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Continue Learning</h2>
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" className="text-indigo-600">
                  Browse All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {inProgressCourses.map(({ course, progress, completed, total }) => {
                const percent = Math.round((completed / total) * 100);
                const lastLesson = lessons.find(l => l.id === progress.last_lesson_id);
                
                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="flex">
                        <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0">
                          {course.cover_image ? (
                            <img src={course.cover_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="w-10 h-10 text-white/30" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 p-4">
                          <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">
                            {course.title}
                          </h3>
                          <p className="text-sm text-slate-500 mb-3">
                            {completed} of {total} lessons
                          </p>
                          <Progress value={percent} className="h-1.5 mb-3" />
                          <Link 
                            to={createPageUrl('LessonView') + `?id=${lastLesson?.id || progress.last_lesson_id}`}
                          >
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                              <Play className="w-3 h-3 mr-1" />
                              Continue
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tests Section - for students */}
        {user?.role !== 'teacher' && user?.role !== 'admin' && (() => {
          // A student is "enrolled" if they have a Progress record (started the course),
          // an Enrollment record, or are in enrolled_emails
          const enrolledViaProgress = progressList.map(p => p.course_id);
          const enrolledViaEntity = enrollments.map(e => e.course_id);
          const enrolledViaEmail = courses
            .filter(c => (c.enrolled_emails || []).includes(user?.email))
            .map(c => c.id);
          const enrolledCourseIds = [...new Set([...enrolledViaProgress, ...enrolledViaEntity, ...enrolledViaEmail])];

          const lessonTests = lessons
            .filter(l => enrolledCourseIds.includes(l.course_id))
            .flatMap(lesson => {
              const rows = [];
              const preResult = testResults.find(r => r.lesson_id === lesson.id && r.test_type === 'pre_test');
              const postResult = testResults.find(r => r.lesson_id === lesson.id && r.test_type === 'post_test');
              if (lesson.pre_test?.length > 0) {
                rows.push({ lesson, type: 'pre_test', result: preResult });
              }
              if (lesson.post_test?.length > 0) {
                rows.push({ lesson, type: 'post_test', result: postResult });
              }
              return rows;
            });

          if (!lessonTests.length) return null;

          return (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">My Tests</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {lessonTests.map(({ lesson, type, result }) => {
                  const isPreTest = type === 'pre_test';
                  const Icon = isPreTest ? ClipboardList : FlaskConical;
                  const color = isPreTest ? 'text-blue-600' : 'text-green-600';
                  const bg = isPreTest ? 'bg-blue-50' : 'bg-green-50';
                  const label = isPreTest ? 'Pre-Test' : 'Post-Test';
                  const course = courses.find(c => c.id === lesson.course_id);

                  return (
                    <Card key={`${lesson.id}-${type}`} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${bg} flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 truncate">{course?.title}</p>
                          <p className="font-medium text-slate-900 truncate">{lesson.title}</p>
                          <p className={`text-xs font-semibold ${color}`}>{label}</p>
                          {result && (
                            <p className="text-sm text-slate-600 mt-0.5">
                              Score: <span className="font-bold">{result.score}/{result.total}</span>
                              <span className="text-slate-400 ml-1">({Math.round((result.score/result.total)*100)}%)</span>
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {!result ? (
                            <Button
                              size="sm"
                              className={isPreTest ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
                              onClick={() => isPreTest ? setActivePreTest(lesson) : setActivePostTest(lesson)}
                            >
                              Take Test
                            </Button>
                          ) : !isPreTest ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setActivePostTest(lesson)}
                            >
                              <RotateCcw className="w-3 h-3" />
                              Retry
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Completed Courses */}
        {coursesCompleted > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Completed Courses</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {progressList
                .filter(p => {
                  const courseLessons = lessons.filter(l => l.course_id === p.course_id);
                  return courseLessons.length > 0 && p.completed_lessons?.length >= courseLessons.length;
                })
                .map(p => {
                  const course = courses.find(c => c.id === p.course_id);
                  if (!course) return null;
                  return (
                    <Link key={course.id} to={createPageUrl('CourseView') + `?id=${course.id}`}>
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-900 truncate">{course.title}</h3>
                            <p className="text-sm text-green-600">Completed ✓</p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
            </div>
          </div>
        )}

        {/* Teacher: Authored Courses */}
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">My Courses</h2>
              <Link to={createPageUrl('CourseEditor')}>
                <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                  <Plus className="w-4 h-4" />
                  Create Course
                </Button>
              </Link>
            </div>
            {authoredLoading ? (
              <div className="grid md:grid-cols-3 gap-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : authoredCourses.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-4">You haven't created any courses yet</p>
                  <Link to={createPageUrl('CourseEditor')}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                      <Plus className="w-4 h-4" />
                      Create Your First Course
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {authoredCourses.map(course => (
                  <Card key={course.id} className="hover:shadow-md transition-shadow overflow-hidden">
                    <div className="h-24 bg-gradient-to-br from-indigo-500 to-purple-600 relative">
                      {course.cover_image && (
                        <img src={course.cover_image} alt="" className="w-full h-full object-cover" />
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge className={course.is_published ? 'bg-green-500 text-white' : 'bg-slate-500 text-white'}>
                          {course.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-900 truncate mb-3">{course.title}</h3>
                      <div className="flex gap-2">
                        <Link to={createPageUrl('CourseEditor') + `?id=${course.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full gap-1">
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>
                        </Link>
                        <Link to={createPageUrl('CourseStudents') + `?id=${course.id}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Users className="w-3 h-3" />
                            Students
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!progressLoading && inProgressCourses.length === 0 && coursesCompleted === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Start your learning journey</h3>
            <p className="text-slate-500 mb-6">Browse our courses and begin learning today</p>
            <Link to={createPageUrl('Home')}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                Explore Courses
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Pre-Test Modal */}
      {activePreTest && (
        <PreTestModal
          lesson={activePreTest}
          user={user}
          onComplete={async ({ score, total, answers }) => {
            await saveTestResultMutation.mutateAsync({
              user_email: user.email,
              user_name: user.full_name,
              course_id: activePreTest.course_id,
              lesson_id: activePreTest.id,
              lesson_title: activePreTest.title,
              test_type: 'pre_test',
              score,
              total,
              answers,
            });
          }}
          onSkip={() => setActivePreTest(null)}
        />
      )}

      {/* Post-Test Modal */}
      {activePostTest && (
        <PostTestModal
          lesson={activePostTest}
          open={true}
          onComplete={async ({ score, total, answers }) => {
            await saveTestResultMutation.mutateAsync({
              user_email: user.email,
              user_name: user.full_name,
              course_id: activePostTest.course_id,
              lesson_id: activePostTest.id,
              lesson_title: activePostTest.title,
              test_type: 'post_test',
              score,
              total,
              answers,
            });
          }}
          onClose={() => setActivePostTest(null)}
        />
      )}
    </div>
  );
}