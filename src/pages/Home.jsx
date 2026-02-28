import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CourseCard from '../components/course/CourseCard';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen, GraduationCap, Plus, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

const ALL_CATEGORIES = [
  { value: 'web-development', label: 'Web Development' },
  { value: 'programming-basics', label: 'Programming Basics' },
  { value: 'devops', label: 'DevOps' },
  { value: 'data-science', label: 'Data Science' },
  { value: 'mobile-development', label: 'Mobile Development' },
  { value: 'robotics', label: 'Robotics' },
  { value: 'arduino', label: 'Arduino' },
  { value: 'raspberry-pi', label: 'Raspberry Pi' },
  { value: 'other', label: 'Other' },
  ...(() => { try { return JSON.parse(localStorage.getItem('learnhub_custom_categories') || '[]'); } catch { return []; } })(),
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => base44.entities.Course.filter({ is_published: true }),
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ['lessons'],
    queryFn: () => base44.entities.Lesson.list(),
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['progress', user?.email],
    queryFn: () => user?.email 
      ? base44.entities.Progress.filter({ user_email: user.email })
      : [],
    enabled: !!user?.email,
  });

  const lessonCounts = lessons.reduce((acc, lesson) => {
    acc[lesson.course_id] = (acc[lesson.course_id] || 0) + 1;
    return acc;
  }, {});

  const progressMap = progress.reduce((acc, p) => {
    acc[p.course_id] = p;
    return acc;
  }, {});

  const filteredCourses = courses.filter(course => {
    const matchesSearch = !search || 
      course.title?.toLowerCase().includes(search.toLowerCase()) ||
      course.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || course.category === category;
    const matchesDifficulty = difficulty === 'all' || course.difficulty === difficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1920')] opacity-10 bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 via-purple-600/90 to-indigo-800/90" />
        
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-8 h-8" />
              <span className="text-lg font-semibold">LearnHub</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Master Programming Through Interactive Tutorials
            </h1>
            <p className="text-xl text-indigo-100 mb-8">
              Learn at your own pace with step-by-step lessons, code examples, and quizzes.
            </p>
            
            {/* Search Bar */}
            <div className="flex gap-3 max-w-xl">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-12 bg-white text-slate-900 border-0 shadow-lg"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filter:</span>
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {ALL_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isTeacher && (
            <Link to={createPageUrl('CourseEditor')}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </Link>
          )}
        </div>

        {/* Courses Grid */}
        {coursesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border p-4">
                <Skeleton className="h-44 rounded-xl mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">No courses found</h3>
            <p className="text-slate-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { staggerChildren: 0.1 } }
            }}
          >
            {filteredCourses.map((course) => (
              <motion.div
                key={course.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 }
                }}
              >
                <CourseCard
                  course={course}
                  lessonCount={lessonCounts[course.id] || 0}
                  progress={progressMap[course.id]}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}