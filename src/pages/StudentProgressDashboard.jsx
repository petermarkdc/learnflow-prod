import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Users, BookOpen, CheckCircle2, Search, RefreshCw, Trophy, Circle
} from 'lucide-react';

export default function StudentProgressDashboard() {
  const [user, setUser] = useState(null);
  const [courseFilter, setCourseFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  // Real-time subscription: refresh when Progress changes
  useEffect(() => {
    const unsub = base44.entities.Progress.subscribe(() => {
      setLastRefresh(Date.now());
    });
    return unsub;
  }, []);

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => base44.entities.Course.list(),
    enabled: !!user,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['admin-all-lessons'],
    queryFn: () => base44.entities.Lesson.list(),
    enabled: !!user,
  });

  const { data: allProgress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['admin-all-progress', lastRefresh],
    queryFn: () => base44.entities.Progress.list(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['admin-all-enrollments'],
    queryFn: () => base44.entities.Enrollment.filter({ status: 'active' }),
    enabled: !!user,
  });

  const { data: testResults = [] } = useQuery({
    queryKey: ['admin-all-test-results', lastRefresh],
    queryFn: () => base44.entities.TestResult.list(),
    enabled: !!user,
    refetchInterval: 30000,
  });

  if (!user) return null;
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Access restricted to administrators.</p>
      </div>
    );
  }

  // Build a map: email -> { courses: [{courseId, progress, lessons, quizScores, testResults}] }
  const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));
  const lessonsByCourse = {};
  lessons.forEach(l => {
    if (!lessonsByCourse[l.course_id]) lessonsByCourse[l.course_id] = [];
    lessonsByCourse[l.course_id].push(l);
  });

  // Collect all unique student emails from enrollments
  const studentEmails = [...new Set(enrollments.map(e => e.user_email))];

  // Build student rows
  let studentRows = studentEmails.map(email => {
    const studentEnrollments = enrollments.filter(e => e.user_email === email);
    const studentProgress = allProgress.filter(p => p.user_email === email);
    const studentTests = testResults.filter(r => r.user_email === email);

    const courseDetails = studentEnrollments.map(enr => {
      const course = courseMap[enr.course_id];
      if (!course) return null;
      const prog = studentProgress.find(p => p.course_id === enr.course_id);
      const courseLessons = lessonsByCourse[enr.course_id] || [];
      const completedLessons = prog?.completed_lessons || [];
      const quizScores = prog?.quiz_scores || {};
      const pct = courseLessons.length > 0
        ? Math.round((completedLessons.length / courseLessons.length) * 100)
        : 0;

      const courseTests = studentTests.filter(r => r.course_id === enr.course_id && r.lesson_id !== 'course_level');
      const avgTest = courseTests.length > 0
        ? Math.round(courseTests.reduce((acc, r) => acc + (r.score / r.total) * 100, 0) / courseTests.length)
        : null;

      return {
        courseId: enr.course_id,
        courseTitle: course.title,
        totalLessons: courseLessons.length,
        completedLessons,
        completedCount: completedLessons.length,
        pct,
        quizScores,
        avgTest,
        lastSeen: prog?.updated_date || enr.created_date,
        lessons: courseLessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)),
      };
    }).filter(Boolean);

    const name = studentTests.find(t => t.user_name)?.user_name || email;

    return { email, name, courseDetails };
  });

  // Apply filters
  if (courseFilter !== 'all') {
    studentRows = studentRows
      .map(s => ({ ...s, courseDetails: s.courseDetails.filter(c => c.courseId === courseFilter) }))
      .filter(s => s.courseDetails.length > 0);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    studentRows = studentRows.filter(s =>
      s.email.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }

  const isLoading = coursesLoading || progressLoading;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Student Progress Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Updates in real-time as students progress
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search student..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 w-56"
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-sm text-slate-500 mb-1">Total Students</p>
            <p className="text-3xl font-bold text-slate-900">{studentEmails.length}</p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-sm text-slate-500 mb-1">Active Courses</p>
            <p className="text-3xl font-bold text-slate-900">{courses.filter(c => c.is_published).length}</p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-sm text-slate-500 mb-1">Lessons Completed</p>
            <p className="text-3xl font-bold text-slate-900">
              {allProgress.reduce((acc, p) => acc + (p.completed_lessons?.length || 0), 0)}
            </p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-sm text-slate-500 mb-1">Test Submissions</p>
            <p className="text-3xl font-bold text-slate-900">{testResults.length}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : studentRows.length === 0 ? (
          <div className="bg-white rounded-2xl border text-center py-16 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p>No students found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {studentRows.map(student => (
              <StudentCard key={student.email} student={student} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StudentCard({ student }) {
  const [expanded, setExpanded] = useState(false);

  const totalCompleted = student.courseDetails.reduce((acc, c) => acc + c.completedCount, 0);
  const totalLessons = student.courseDetails.reduce((acc, c) => acc + c.totalLessons, 0);
  const overallPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border overflow-hidden">
      {/* Student Header */}
      <button
        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors text-left"
        onClick={() => setExpanded(p => !p)}
      >
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-indigo-700 font-bold text-sm">
            {(student.name || student.email)[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900">{student.name}</p>
            <p className="text-xs text-slate-400">{student.email}</p>
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <div className="flex items-center gap-2 flex-1 min-w-[120px]">
              <Progress value={overallPct} className="h-2 flex-1" />
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">{overallPct}%</span>
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {totalCompleted}/{totalLessons} lessons
            </span>
            <Badge variant="secondary" className="text-xs">
              <BookOpen className="w-3 h-3 mr-1" />
              {student.courseDetails.length} course{student.courseDetails.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        <span className="text-slate-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded: per-course details */}
      {expanded && (
        <div className="border-t divide-y divide-slate-50">
          {student.courseDetails.map(course => (
            <div key={course.courseId} className="px-6 py-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium text-slate-900">{course.courseTitle}</span>
                </div>
                <div className="flex items-center gap-3">
                  {course.avgTest !== null && (
                    <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">
                      <Trophy className="w-3 h-3" />Avg Test: {course.avgTest}%
                    </span>
                  )}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    course.pct >= 75 ? 'bg-green-100 text-green-700' :
                    course.pct >= 40 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-600'}`}>
                    {course.pct}% complete
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <Progress value={course.pct} className="h-1.5 mb-3" />

              {/* Lessons grid */}
              <div className="flex flex-wrap gap-2">
                {course.lessons.map(lesson => {
                  const done = course.completedLessons.includes(lesson.id);
                  const quizScore = course.quizScores?.[lesson.id];
                  return (
                    <div
                      key={lesson.id}
                      title={lesson.title}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                        done
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                      <span className="truncate max-w-[120px]">{lesson.title}</span>
                      {quizScore !== undefined && (
                        <span className="ml-1 text-indigo-600 font-bold">{quizScore}%</span>
                      )}
                    </div>
                  );
                })}
                {course.lessons.length === 0 && (
                  <span className="text-xs text-slate-400">No lessons in this course yet.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}