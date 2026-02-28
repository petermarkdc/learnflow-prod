import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, CheckCircle2, Clock, Trophy, 
  ChevronRight, Play, Target, Plus, Edit, Users
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.filter({ is_published: true }),
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
    </div>
  );
}