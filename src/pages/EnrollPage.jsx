import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, Loader2, LogIn } from 'lucide-react';
import { toast } from "sonner";

export default function EnrollPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const courseId = urlParams.get('courseId');
  const token = urlParams.get('token'); // = course_id for simplicity

  useEffect(() => {
    base44.auth.me()
      .then(u => { setUser(u); setAuthChecked(true); })
      .catch(() => { setUser(null); setAuthChecked(true); });
  }, []);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course-enroll', courseId],
    queryFn: () => base44.entities.Course.filter({ id: courseId }).then(r => r[0]),
    enabled: !!courseId,
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const existing = await base44.entities.Enrollment.filter({
        course_id: courseId,
        user_email: user.email
      });
      if (existing.length === 0) {
        await base44.entities.Enrollment.create({
          course_id: courseId,
          user_email: user.email,
          enrolled_by: 'invite_link',
          status: 'active'
        });
      } else if (existing[0].status === 'removed') {
        await base44.entities.Enrollment.update(existing[0].id, { status: 'active' });
      }
    },
    onSuccess: () => {
      toast.success('You are now enrolled!');
      navigate(createPageUrl('CourseView') + `?id=${courseId}`);
    },
    onError: () => toast.error('Enrollment failed'),
  });

  useEffect(() => {
    if (authChecked && !user && courseId) {
      // Redirect to login, then come back
      base44.auth.redirectToLogin(window.location.href);
    }
  }, [authChecked, user, courseId]);

  useEffect(() => {
    if (user && course) {
      enrollMutation.mutate();
    }
  }, [user, course]);

  if (!courseId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Invalid invite link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
        {courseLoading || !authChecked ? (
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto" />
        ) : !user ? (
          <>
            <LogIn className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Sign in to enroll</h2>
            <p className="text-slate-500 mb-6">You need to sign in to accept this course invitation.</p>
            <Button onClick={() => base44.auth.redirectToLogin(window.location.href)}>Sign In</Button>
          </>
        ) : enrollMutation.isPending ? (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
            <p className="text-slate-600">Enrolling you in <strong>{course?.title}</strong>...</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Enrolled!</h2>
            <p className="text-slate-500">Redirecting to course...</p>
          </>
        )}
      </div>
    </div>
  );
}