import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, UserPlus, Trash2, Copy, Check, Users, 
  Link as LinkIcon, Key, Shield, Loader2
} from 'lucide-react';
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function CourseStudents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => navigate(createPageUrl('Home')));
  }, []);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => base44.entities.Course.filter({ id: courseId }).then(r => r[0]),
    enabled: !!courseId,
  });

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['enrollments', courseId],
    queryFn: () => base44.entities.Enrollment.filter({ course_id: courseId, status: 'active' }),
    enabled: !!courseId,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: progressList = [] } = useQuery({
    queryKey: ['all-progress', courseId],
    queryFn: () => base44.entities.Progress.filter({ course_id: courseId }),
    enabled: !!courseId,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: () => base44.entities.Lesson.filter({ course_id: courseId }),
    enabled: !!courseId,
  });

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  // Verify current user can manage this course's students
  const canManage = !user || user.role === 'admin' || 
    (isTeacher && course && (course.created_by === user?.email || (course.collaborators || []).includes(user?.email)));

  const addStudentMutation = useMutation({
    mutationFn: async (email) => {
      const existing = await base44.entities.Enrollment.filter({ course_id: courseId, user_email: email });
      if (existing.length > 0 && existing[0].status === 'active') throw new Error('Student already enrolled');
      if (existing.length > 0) {
        return base44.entities.Enrollment.update(existing[0].id, { status: 'active' });
      }
      return base44.entities.Enrollment.create({
        course_id: courseId,
        user_email: email,
        enrolled_by: user.email,
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollments']);
      setNewEmail('');
      toast.success('Student added!');
    },
    onError: (err) => toast.error(err.message || 'Failed to add student'),
  });

  const removeStudentMutation = useMutation({
    mutationFn: (enrollmentId) => base44.entities.Enrollment.update(enrollmentId, { status: 'removed' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollments']);
      toast.success('Student removed');
    },
  });

  const inviteLink = `${window.location.origin}${createPageUrl('EnrollPage')}?courseId=${courseId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(course?.course_code || '');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getUserInfo = (email) => allUsers.find(u => u.email === email);
  const getProgress = (email) => {
    const p = progressList.find(p => p.user_email === email);
    const completed = p?.completed_lessons?.length || 0;
    const total = lessons.length;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  if (!isTeacher) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <Shield className="w-12 h-12 mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500">Access denied</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={createPageUrl('CourseEditor') + `?id=${courseId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <p className="text-sm text-slate-500">{course?.title}</p>
            <h1 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5" /> Student Management
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Access Type Banner */}
        <div className={`rounded-2xl p-5 border flex items-center gap-4 ${
          course?.access_type === 'paid' ? 'bg-amber-50 border-amber-200' :
          course?.access_type === 'free' ? 'bg-blue-50 border-blue-200' :
          'bg-green-50 border-green-200'
        }`}>
          <div>
            <p className="font-semibold text-slate-900">
              Access: <span className="capitalize">{course?.access_type || 'free'}</span>
            </p>
            <p className="text-sm text-slate-600">
              {course?.access_type === 'public' && 'Anyone can view this course without logging in.'}
              {course?.access_type === 'free' && 'Any logged-in user can access this course.'}
              {course?.access_type === 'paid' && 'Only invited/enrolled students can access this course.'}
            </p>
          </div>
          <Link to={createPageUrl('CourseEditor') + `?id=${courseId}`} className="ml-auto">
            <Button variant="outline" size="sm">Change Access</Button>
          </Link>
        </div>

        {/* Invite Tools (paid courses) */}
        {course?.access_type === 'paid' && (
          <div className="bg-white rounded-2xl border p-6 space-y-4">
            <h2 className="font-semibold text-slate-900 text-lg">Invite Tools</h2>

            {/* Invite Link */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                <LinkIcon className="w-4 h-4" /> Invite Link
              </p>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs font-mono text-slate-600 bg-slate-50" />
                <Button variant="outline" onClick={copyLink}>
                  {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Anyone with this link will be auto-enrolled after signing in.</p>
            </div>

            {/* Course Code */}
            {course?.course_code && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                  <Key className="w-4 h-4" /> Course Code
                </p>
                <div className="flex gap-2">
                  <Input value={course.course_code} readOnly className="font-mono text-xl tracking-widest text-center font-bold bg-slate-50" />
                  <Button variant="outline" onClick={copyCode}>
                    {copiedCode ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Students can enter this code on the course page to enroll.</p>
              </div>
            )}

            {/* Add by email */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                <UserPlus className="w-4 h-4" /> Add Student by Email
              </p>
              <div className="flex gap-2">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="student@email.com"
                  onKeyDown={(e) => e.key === 'Enter' && newEmail && addStudentMutation.mutate(newEmail)}
                />
                <Button
                  onClick={() => addStudentMutation.mutate(newEmail)}
                  disabled={!newEmail.trim() || addStudentMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {addStudentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Student List */}
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900 text-lg">
              Enrolled Students ({enrollments.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No students enrolled yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enrollments.map((enrollment) => {
                const userInfo = getUserInfo(enrollment.user_email);
                const prog = getProgress(enrollment.user_email);
                return (
                  <div key={enrollment.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-indigo-100 text-indigo-700">
                        {(userInfo?.full_name || enrollment.user_email)?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {userInfo?.full_name || enrollment.user_email}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{enrollment.user_email}</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-medium text-indigo-600">{prog.percent}%</p>
                      <p className="text-xs text-slate-400">{prog.completed}/{prog.total} lessons</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Student</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove {enrollment.user_email} from this course?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeStudentMutation.mutate(enrollment.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >Remove</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}