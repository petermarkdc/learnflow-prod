import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, ClipboardList, FlaskConical, BarChart2, ChevronDown, ChevronRight, BookOpen, GraduationCap } from 'lucide-react';
import TestResultDetailModal from '../components/TestResultDetailModal';
import { Skeleton } from "@/components/ui/skeleton";

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function GroupedTable({ results, courses }) {
  const [expanded, setExpanded] = useState({});
  const [selectedResult, setSelectedResult] = useState(null);

  const isCourseLevelResult = (r) => r.lesson_id === 'course_level';

  // Group by course then lesson
  const grouped = {};
  results.forEach(r => {
    const course = courses.find(c => c.id === r.course_id);
    const courseName = course?.title || r.course_id || 'Unknown Course';
    const lessonName = r.lesson_id === 'course_level'
      ? (r.test_type === 'pre_test' ? '📋 Course Pre-Test' : '🧪 Course Post-Test')
      : (r.lesson_title || r.lesson_id || 'Unknown Lesson');
    if (!grouped[courseName]) grouped[courseName] = {};
    if (!grouped[courseName][lessonName]) grouped[courseName][lessonName] = [];
    grouped[courseName][lessonName].push(r);
  });

  const toggleCourse = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-3">
      {selectedResult && <TestResultDetailModal result={selectedResult} onClose={() => setSelectedResult(null)} />}
      {Object.entries(grouped).map(([courseName, lessons]) => (
        <div key={courseName} className="bg-white rounded-2xl border overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
            onClick={() => toggleCourse(courseName)}
          >
            <div className="flex items-center gap-3">
              {expanded[courseName] ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              <span className="font-semibold text-slate-900">{courseName}</span>
              <Badge variant="secondary">{Object.values(lessons).flat().length} results</Badge>
            </div>
          </button>

          {expanded[courseName] && (
            <div className="border-t">
              {Object.entries(lessons).map(([lessonName, rows]) => (
                <div key={lessonName} className="border-b last:border-0">
                  <div className="px-5 py-2 bg-slate-50 flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-indigo-700">{lessonName}</span>
                    <Badge className="text-xs bg-indigo-50 text-indigo-600">{rows.length}</Badge>
                    {rows[0]?.lesson_id === 'course_level' && (
                      <Badge className="text-xs bg-purple-100 text-purple-700 gap-1">
                        <GraduationCap className="w-3 h-3" />Course Level
                      </Badge>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-5 py-2 font-medium text-slate-500 text-xs">Student</th>
                        <th className="text-left px-5 py-2 font-medium text-slate-500 text-xs">Type</th>
                        <th className="text-left px-5 py-2 font-medium text-slate-500 text-xs">Score</th>
                        <th className="text-left px-5 py-2 font-medium text-slate-500 text-xs">%</th>
                        <th className="text-left px-5 py-2 font-medium text-slate-500 text-xs">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.map(r => {
                        const pct = Math.round((r.score / r.total) * 100);
                        return (
                          <tr key={r.id} className="hover:bg-indigo-50 cursor-pointer transition-colors" onClick={() => setSelectedResult(r)}>
                            <td className="px-5 py-2.5">
                              <div className="font-medium text-slate-900">{r.user_name || r.user_email}</div>
                              <div className="text-xs text-slate-400">{r.user_email}</div>
                            </td>
                            <td className="px-5 py-2.5">
                              {r.test_type === 'pre_test' ? (
                                <Badge className="bg-blue-100 text-blue-700 gap-1 text-xs"><ClipboardList className="w-3 h-3" />Pre-Test</Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700 gap-1 text-xs"><FlaskConical className="w-3 h-3" />Post-Test</Badge>
                              )}
                            </td>
                            <td className="px-5 py-2.5 font-medium">{r.score}/{r.total}</td>
                            <td className="px-5 py-2.5">
                              <span className={`font-bold ${pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                                {pct}%
                              </span>
                            </td>
                            <td className="px-5 py-2.5 text-slate-400 text-xs">{new Date(r.created_date).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function TestScoresReport() {
  const [user, setUser] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher' || isAdmin;

  // Admin sees all courses; teacher sees own + collaborated
  const { data: courses = [] } = useQuery({
    queryKey: ['report-courses', user?.email, isAdmin],
    queryFn: async () => {
      if (isAdmin) return base44.entities.Course.list();
      const owned = await base44.entities.Course.filter({ created_by: user.email });
      const all = await base44.entities.Course.list();
      const collab = all.filter(c => (c.collaborators || []).includes(user.email) && c.created_by !== user.email);
      return [...owned, ...collab];
    },
    enabled: !!user?.email,
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['test-results-all', user?.email, isAdmin, courses.map(c => c.id).join(',')],
    queryFn: async () => {
      if (!courses.length) return [];
      const all = await Promise.all(
        courses.map(c => base44.entities.TestResult.filter({ course_id: c.id }))
      );
      return all.flat();
    },
    enabled: !!user?.email && courses.length > 0,
  });

  const filtered = results
    .filter(r => typeFilter === 'all' || r.test_type === typeFilter)
    .filter(r => {
      if (levelFilter === 'course_level') return r.lesson_id === 'course_level';
      if (levelFilter === 'lesson_level') return r.lesson_id !== 'course_level';
      return true;
    })
    .filter(r => courseFilter === 'all' || r.course_id === courseFilter)
    .filter(r => {
      const d = new Date(r.created_date);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    });

  const avgScore = filtered.length > 0
    ? Math.round(filtered.reduce((acc, r) => acc + (r.score / r.total) * 100, 0) / filtered.length)
    : 0;

  const handleDownload = () => {
    const headers = ['Course', 'Level', 'Lesson', 'Student Email', 'Student Name', 'Test Type', 'Score', 'Total', 'Percentage', 'Date'];
    const rows = [headers, ...filtered.map(r => {
      const course = courses.find(c => c.id === r.course_id);
      return [
        course?.title || r.course_id,
        r.lesson_id === 'course_level' ? 'Course Level' : 'Lesson Level',
        r.lesson_title || r.lesson_id,
        r.user_email,
        r.user_name || '',
        r.test_type === 'pre_test' ? 'Pre-Test' : 'Post-Test',
        r.score,
        r.total,
        `${Math.round((r.score / r.total) * 100)}%`,
        new Date(r.created_date).toLocaleDateString(),
      ];
    })];
    downloadCSV('test_scores_report.csv', rows);
  };

  if (!isTeacher && user !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Access restricted to teachers and admins.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Test Scores Report</h1>
            <p className="text-slate-500 text-sm mt-1">
              {isAdmin ? 'All courses and students' : 'Pre-test and post-test results grouped by course and lesson'}
            </p>
          </div>
          <Button onClick={handleDownload} disabled={filtered.length === 0} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Download className="w-4 h-4" /> Download CSV
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-sm text-slate-500 mb-1">Total Submissions</p>
            <p className="text-3xl font-bold text-slate-900">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-sm text-slate-500 mb-1">Unique Students</p>
            <p className="text-3xl font-bold text-slate-900">{new Set(filtered.map(r => r.user_email)).size}</p>
          </div>
          <div className="bg-white rounded-2xl border p-5">
            <p className="text-sm text-slate-500 mb-1">Average Score</p>
            <p className="text-3xl font-bold text-slate-900">{avgScore}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border p-4 mb-4 flex gap-3 flex-wrap items-center">
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
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="course_level">Course Level</SelectItem>
              <SelectItem value="lesson_level">Lesson Level</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Test type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pre_test">Pre-Test Only</SelectItem>
              <SelectItem value="post_test">Post-Test Only</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 whitespace-nowrap">From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="h-9 px-3 rounded-md border border-input text-sm bg-background" />
            <span className="text-xs text-slate-500 whitespace-nowrap">To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="h-9 px-3 rounded-md border border-input text-sm bg-background" />
          </div>
          {(courseFilter !== 'all' || levelFilter !== 'all' || typeFilter !== 'all' || dateFrom || dateTo) && (
            <button onClick={() => { setCourseFilter('all'); setLevelFilter('all'); setTypeFilter('all'); setDateFrom(''); setDateTo(''); }}
              className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
              Clear filters
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border text-center py-16 text-slate-400">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p>No test results found</p>
          </div>
        ) : (
          <GroupedTable results={filtered} courses={courses} />
        )}
      </div>
    </div>
  );
}