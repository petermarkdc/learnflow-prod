import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function AuthorChip({ email, label }) {
  const { data: users = [] } = useQuery({
    queryKey: ['user-by-email', email],
    queryFn: () => base44.entities.User.filter({ email }),
    staleTime: 60000,
    enabled: !!email,
  });

  const user = users[0];
  const displayName = user?.nickname || user?.full_name || email;
  const avatar = user?.avatar_url;
  const initials = displayName?.[0]?.toUpperCase() || '?';

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7">
        <AvatarImage src={avatar} />
        <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">{initials}</AvatarFallback>
      </Avatar>
      <div>
        {label && <p className="text-xs text-slate-400 leading-none mb-0.5">{label}</p>}
        <p className="text-sm font-medium text-slate-700 leading-none">{displayName}</p>
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