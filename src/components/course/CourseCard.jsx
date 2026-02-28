import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { BookOpen, Clock, BarChart3, Users } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const difficultyColors = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};

const categoryLabels = {
  'web-development': 'Web Development',
  'programming-basics': 'Programming Basics',
  'devops': 'DevOps',
  'data-science': 'Data Science',
  'mobile-development': 'Mobile Development',
  'other': 'Other',
};

export default function CourseCard({ course, lessonCount, progress }) {
  const progressPercent = progress?.completed_lessons?.length > 0 && lessonCount > 0
    ? Math.round((progress.completed_lessons.length / lessonCount) * 100)
    : 0;

  return (
    <Link to={createPageUrl('CourseView') + `?id=${course.id}`}>
      <div className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all duration-300">
        {/* Cover Image */}
        <div className="relative h-44 bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
          {course.cover_image ? (
            <img
              src={course.cover_image}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-16 h-16 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {course.difficulty && (
              <Badge className={cn("text-xs", difficultyColors[course.difficulty])}>
                {course.difficulty}
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
              {course.title}
            </h3>
          </div>
          
          {course.category && (
            <p className="text-xs text-indigo-600 font-medium mb-2">
              {categoryLabels[course.category] || course.category}
            </p>
          )}

          {course.description && (
            <p className="text-sm text-slate-600 line-clamp-2 mb-4">
              {course.description}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{lessonCount} lessons</span>
            </div>
          </div>

          {/* Progress */}
          {progressPercent > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-600">Progress</span>
                <span className="font-medium text-indigo-600">{progressPercent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}