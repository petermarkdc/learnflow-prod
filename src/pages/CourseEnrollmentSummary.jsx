import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, BookOpen, Search, ExternalLink } from 'lucide-react';

export default function CourseEnrollmentSummary() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['all-courses-summary'],
    queryFn: () => base44.entities.Course.list(),
    enabled: !!user,
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['all-enrollments-summary'],
    queryFn: () => base44.entities.Enrollment.list(),
    enabled: !!user,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['all-lessons-summary'],
    queryFn: () => base44.entities.Lesson.list(),
    enabled: !!user,
  });

  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Access Denied</h2>
          <p className="text-slate-500">Only teachers and admins can view this page.</p>
        </div>
      </div>
    );
  }

  const isLoading = coursesLoading || enrollmentsLoading;

  // For teachers, only show their own courses; for admins, show all
  const visibleCourses = user.role === 'admin'
    ? courses
    : courses.filter(c => c.created_by === user.email || (c.collaborators || []).includes(user.email));

  const filtered = visibleCourses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const getEnrollmentCount = (courseId) =>
    enrollments.filter(e => e.course_id === courseId && e.status !== 'removed').length;

  const getLessonCount = (courseId) =>
    lessons.filter(l => l.course_id === courseId).length;

  const totalEnrollments = visibleCourses.reduce((sum, c) => sum + getEnrollmentCount(c.id), 0);

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-amber-100 text-amber-700',
    advanced: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Enrollment Summary</h1>
            <p className="text-sm text-slate-500">Course-level enrollment overview</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Courses', value: visibleCourses.length, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Total Enrollments', value: totalEnrollments, icon: Users, color: 'text-green-600 bg-green-50' },
            { label: 'Published Courses', value: visibleCourses.filter(c => c.is_published).length, icon: BookOpen, color: 'text-purple-600 bg-purple-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {isLoading ? <Skeleton className="h-8 w-10" /> : stat.value}
                </p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-5 py-3 font-semibold text-slate-600">Course</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Difficulty</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Lessons</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-4 h-4" /> Enrolled
                  </div>
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-5 py-4"><Skeleton className="h-5 w-48" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-5 w-10" /></td>
                    <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-4 py-4 text-center"><Skeleton className="h-5 w-8 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-5 w-8" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No courses found.
                  </td>
                </tr>
              ) : (
                filtered
                  .sort((a, b) => getEnrollmentCount(b.id) - getEnrollmentCount(a.id))
                  .map(course => (
                    <tr key={course.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900 line-clamp-1">{course.title}</p>
                        {course.category && (
                          <p className="text-xs text-slate-400 capitalize">{course.category.replace(/-/g, ' ')}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <Badge className={`capitalize text-xs ${difficultyColors[course.difficulty] || 'bg-slate-100 text-slate-600'}`}>
                          {course.difficulty || 'beginner'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell text-slate-600">
                        {getLessonCount(course.id)}
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <Badge className={course.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                          {course.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center gap-1 font-semibold text-slate-900">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          {getEnrollmentCount(course.id)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link to={createPageUrl('CourseStudents') + `?id=${course.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}