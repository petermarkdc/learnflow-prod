import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Key, LogIn, UserPlus } from 'lucide-react';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AccessGate({ course, user, onAccessGranted }) {
  const [code, setCode] = useState('');
  const queryClient = useQueryClient();

  const enrollMutation = useMutation({
    mutationFn: async ({ method }) => {
      if (method === 'code') {
        if (code.trim().toUpperCase() !== (course.course_code || '').toUpperCase()) {
          throw new Error('Invalid course code');
        }
      }
      // Check if already enrolled
      const existing = await base44.entities.Enrollment.filter({
        course_id: course.id,
        user_email: user.email
      });
      if (existing.length === 0) {
        await base44.entities.Enrollment.create({
          course_id: course.id,
          user_email: user.email,
          enrolled_by: method === 'code' ? 'course_code' : 'self',
          status: 'active'
        });
      } else if (existing[0].status === 'removed') {
        await base44.entities.Enrollment.update(existing[0].id, { status: 'active' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollment']);
      toast.success('Enrolled successfully!');
      onAccessGranted();
    },
    onError: (err) => {
      toast.error(err.message || 'Enrollment failed');
    }
  });

  // public → no gate
  if (course.access_type === 'public') return null;

  // free → just need login
  if (course.access_type === 'free') {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl border border-slate-200 shadow text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
            <LogIn className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Sign in to access this course</h3>
          <p className="text-slate-500 mb-6">This is a free course — just sign in to start learning.</p>
          <Button onClick={() => base44.auth.redirectToLogin()} className="bg-indigo-600 hover:bg-indigo-700">
            <LogIn className="w-4 h-4 mr-2" /> Sign In
          </Button>
        </div>
      );
    }
    return null; // logged in, free access granted
  }

  // paid → need enrollment
  if (course.access_type === 'paid') {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl border border-slate-200 shadow text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">This is a private course</h3>
          <p className="text-slate-500 mb-6">Sign in and use your course code or invite link to gain access.</p>
          <Button onClick={() => base44.auth.redirectToLogin()} className="bg-indigo-600 hover:bg-indigo-700">
            <LogIn className="w-4 h-4 mr-2" /> Sign In
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-10 bg-white rounded-2xl border border-slate-200 shadow text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <Key className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Enter Course Code</h3>
        <p className="text-slate-500 mb-6">This course requires an invitation or a course code to access.</p>
        <div className="flex gap-2 w-full">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter course code..."
            className="text-center tracking-widest font-mono uppercase"
            onKeyDown={(e) => e.key === 'Enter' && enrollMutation.mutate({ method: 'code' })}
          />
          <Button
            onClick={() => enrollMutation.mutate({ method: 'code' })}
            disabled={!code.trim() || enrollMutation.isPending}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Key className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}