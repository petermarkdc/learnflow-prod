import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function AuthorChip({ email, label, dark = false }) {
  const { data: users = [] } = useQuery({
    queryKey: ['user-by-email', email],
    queryFn: () => base44.entities.User.filter({ email }).catch(() => []),
    staleTime: 60000,
    enabled: !!email,
  });

  const user = users[0];
  // Fall back to email username if full_name is not accessible
  const emailUsername = email ? email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
  const displayName = user?.nickname || user?.full_name || emailUsername;
  const avatar = user?.avatar_url;
  const initials = displayName?.[0]?.toUpperCase() || '?';

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatar} />
        <AvatarFallback className="text-xs bg-white/20 text-white font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div>
        {label && <p className={`text-xs leading-none mb-0.5 ${dark ? 'text-indigo-300' : 'text-slate-400'}`}>{label}</p>}
        <p className={`text-sm font-medium leading-none ${dark ? 'text-white' : 'text-slate-700'}`}>{displayName}</p>
      </div>
    </div>
  );
}

export default function CourseAuthors({ course, dark = false }) {
  if (!course) return null;
  const collaborators = course.collaborators || [];

  return (
    <div className="flex flex-wrap items-center gap-4">
      <AuthorChip email={course.created_by} label="Author" dark={dark} />
      {collaborators.map(email => (
        <AuthorChip key={email} email={email} label="Co-author" dark={dark} />
      ))}
    </div>
  );
}