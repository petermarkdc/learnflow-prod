import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, ClipboardList, FlaskConical, BarChart2, ChevronDown, ChevronRight } from 'lucide-react';
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

  // Group by course then lesson
  const grouped = {};
  results.forEach(r => {
    const course = courses.find(c => c.id === r.course_id);
    const courseName = course?.title || r.course_id || 'Unknown Course';
    const lessonName = r.lesson_title || r.lesson_id || 'Unknown Lesson';
    if (!grouped[courseName]) grouped[courseName] = {};
    if (!grouped[courseName][lessonName]) grouped[courseName][lessonName] = [];
    grouped[courseName][lessonName].push(r);
  });

  const toggleCourse = (key) => setExpanded(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-3">
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
                  <div className="px-5 py-2 bg-slate-50 flex items-center gap-2">
                    <span className="text-sm font-medium text-indigo-700">{lessonName}</span>
                    <Badge className="text-xs bg-indigo-50 text-indigo-600">{rows.length}</Badge>
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
                          <tr key={r.id} className="hover:bg-slate-50">
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

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher' || isAdmin;

  // Admin sees all courses; teacher sees only their own
  const { data: courses = [] } = useQuery({
    queryKey: ['report-courses', user?.email, isAdmin],
    queryFn: () => isAdmin
      ? base44.entities.Course.list()
      : base44.entities.Course.filter({ created_by: user.email }),
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

  const filtered = typeFilter === 'all' ? results : results.filter(r => r.test_type === typeFilter);

  const avgScore = filtered.length > 0
    ? Math.round(filtered.reduce((acc, r) => acc + (r.score / r.total) * 100, 0) / filtered.length)
    : 0;

  const handleDownload = () => {
    const headers = ['Course', 'Lesson', 'Student Email', 'Student Name', 'Test Type', 'Score', 'Total', 'Percentage', 'Date'];
    const rows = [headers, ...filtered.map(r => {
      const course = courses.find(c => c.id === r.course_id);
      return [
        course?.title || r.course_id,
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

        {/* Filter */}
        <div className="bg-white rounded-2xl border p-4 mb-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Test type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="pre_test">Pre-Test Only</SelectItem>
              <SelectItem value="post_test">Post-Test Only</SelectItem>
            </SelectContent>
          </Select>
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