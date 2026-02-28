import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  GraduationCap, Home, LayoutDashboard, 
  LogOut, Menu, X, Plus, BookOpen, Tag
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNewLessonDialog, setShowNewLessonDialog] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const isTeacherUser = user?.role === 'teacher' || user?.role === 'admin';
  const canCreateContent = isTeacherUser;

  const { data: teacherCourses = [] } = useQuery({
    queryKey: ['my-courses-layout', user?.email],
    queryFn: () => base44.entities.Course.filter({ created_by: user.email }),
    enabled: !!user?.email && isTeacherUser,
  });

  const handleCreateLesson = () => {
    if (!selectedCourseId) return;
    setShowNewLessonDialog(false);
    setSelectedCourseId('');
    navigate(createPageUrl('LessonEditor') + `?courseId=${selectedCourseId}`);
  };

  // Hide layout on lesson view for better reading experience
  const hideNav = currentPageName === 'LessonView';

  const isTeacher = canCreateContent;

  const navItems = [
    { name: 'Home', icon: Home, href: createPageUrl('Home') },
    { name: 'Dashboard', icon: LayoutDashboard, href: createPageUrl('Dashboard'), auth: true },
  ];

  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 hidden sm:block">LearnFlow</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                if (item.auth && !user) return null;
                const isActive = location.pathname === new URL(item.href, window.location.origin).pathname;
                return (
                  <Link key={item.name} to={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "gap-2",
                        isActive && "bg-indigo-50 text-indigo-700"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {isTeacher && (
                <div className="hidden sm:flex items-center gap-2">
                  <Link to={createPageUrl('CourseEditor')}>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                      <Plus className="w-4 h-4" />
                      Create Course
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowNewLessonDialog(true)}
                  >
                    <BookOpen className="w-4 h-4" />
                    New Lesson
                  </Button>
                </div>
              )}

              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700">
                          {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="font-medium text-slate-900">{user.full_name || 'User'}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      <p className="text-xs text-indigo-600 capitalize mt-0.5">{user.role || 'student'}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <Link to={createPageUrl('Dashboard')}>
                      <DropdownMenuItem>
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                    </Link>
                    {user?.role === 'admin' && (
                      <Link to={createPageUrl('AdminCategories')}>
                        <DropdownMenuItem>
                          <Tag className="w-4 h-4 mr-2" />
                          Manage Categories
                        </DropdownMenuItem>
                      </Link>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => base44.auth.logout()}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  onClick={() => base44.auth.redirectToLogin()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Sign In
                </Button>
              )}

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                if (item.auth && !user) return null;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
              {isTeacher && (
                <>
                  <Link to={createPageUrl('CourseEditor')} onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 gap-2">
                      <Plus className="w-4 h-4" />
                      Create Course
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full mt-2 gap-2"
                    onClick={() => { setMobileMenuOpen(false); setShowNewLessonDialog(true); }}
                  >
                    <BookOpen className="w-4 h-4" />
                    New Lesson
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main>{children}</main>

      {/* New Lesson Dialog */}
      <Dialog open={showNewLessonDialog} onOpenChange={setShowNewLessonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Lesson</DialogTitle>
            <DialogDescription>Select the course this lesson belongs to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Course</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                  {teacherCourses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNewLessonDialog(false)}>Cancel</Button>
              <Button
                disabled={!selectedCourseId}
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleCreateLesson}
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}