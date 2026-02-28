import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle2, Circle, BookOpen, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LessonSidebar({ 
  course, 
  lessons, 
  currentLessonId, 
  completedLessons = [],
  onClose 
}) {
  const completedSet = new Set(completedLessons);

  // Build ordered list: for each top-level lesson, inject its subtopics right after
  const sortedAll = [...lessons].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const topLevel = sortedAll.filter(l => !l.is_subtopic);
  const orderedLessons = [];
  topLevel.forEach(parent => {
    orderedLessons.push({ ...parent, _isParent: true });
    const children = sortedAll.filter(
      l => l.is_subtopic && (l.parent_lesson_id === parent.id || (!l.parent_lesson_id))
    );
    // Only attach children to their actual parent if parent_lesson_id matches, else skip orphans
    const attached = sortedAll.filter(l => l.is_subtopic && l.parent_lesson_id === parent.id);
    attached.forEach(child => orderedLessons.push({ ...child, _isParent: false }));
  });
  // Also include subtopics with no parent_lesson_id or orphaned ones at end
  const orphans = sortedAll.filter(l => l.is_subtopic && !topLevel.some(p => p.id === l.parent_lesson_id));
  orphans.forEach(o => {
    if (!orderedLessons.find(x => x.id === o.id)) orderedLessons.push({ ...o, _isParent: false });
  });

  let parentCounter = 0;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Course Header */}
      <div className="p-4 border-b">
        <Link 
          to={createPageUrl('CourseView') + `?id=${course.id}`}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
        >
          <BookOpen className="w-4 h-4" />
          Back to Course
        </Link>
        <h2 className="font-semibold text-slate-900 mt-2 line-clamp-2">{course.title}</h2>
        <div className="mt-2 text-sm text-slate-600">
          {completedLessons.length} / {lessons.length} completed
        </div>
        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${lessons.length > 0 ? (completedLessons.length / lessons.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Lessons List */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {orderedLessons.map((lesson) => {
            const isCompleted = completedSet.has(lesson.id);
            const isCurrent = lesson.id === currentLessonId;
            const isSubtopic = lesson.is_subtopic;
            if (!isSubtopic) parentCounter++;
            const displayNum = !isSubtopic ? parentCounter : null;

            return (
              <Link
                key={lesson.id}
                to={createPageUrl('LessonView') + `?id=${lesson.id}`}
                onClick={onClose}
                className={cn(
                  "flex items-start gap-2 py-2 pr-3 rounded-lg transition-all",
                  isSubtopic ? "ml-8 pl-2" : "ml-2 pl-2",
                  isCurrent ? "bg-indigo-50 border border-indigo-200" : "hover:bg-slate-50",
                )}
              >
                {isSubtopic && (
                  <div className="flex-shrink-0 mt-2 w-3 flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  </div>
                )}
                <div className="flex-shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className={cn("text-green-500", isSubtopic ? "w-4 h-4" : "w-5 h-5")} />
                  ) : (
                    <Circle className={cn(
                      isCurrent ? "text-indigo-500" : "text-slate-300",
                      isSubtopic ? "w-4 h-4" : "w-5 h-5"
                    )} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {displayNum && (
                      <span className="text-xs text-slate-400 font-medium flex-shrink-0">
                        {String(displayNum).padStart(2, '0')}
                      </span>
                    )}
                    <span
                      title={lesson.title}
                      className={cn(
                        "font-medium truncate group-hover:whitespace-normal group-hover:overflow-visible",
                        isSubtopic ? "text-xs text-slate-500" : "text-sm",
                        isCurrent ? "text-indigo-700" : "text-slate-700"
                      )}
                    >
                      {lesson.title}
                    </span>
                  </div>
                  {lesson.estimated_time && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{lesson.estimated_time} min</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}