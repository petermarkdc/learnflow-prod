import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Tag, ShieldAlert } from 'lucide-react';
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DEFAULT_CATEGORIES = [
  { value: 'web-development', label: 'Web Development' },
  { value: 'programming-basics', label: 'Programming Basics' },
  { value: 'devops', label: 'DevOps' },
  { value: 'data-science', label: 'Data Science' },
  { value: 'mobile-development', label: 'Mobile Development' },
  { value: 'robotics', label: 'Robotics' },
  { value: 'arduino', label: 'Arduino' },
  { value: 'raspberry-pi', label: 'Raspberry Pi' },
  { value: 'other', label: 'Other' },
];

const STORAGE_KEY = 'learnflow_custom_categories';

function loadCategories() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveCategories(cats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
}

export default function AdminCategories() {
  const [user, setUser] = useState(null);
  const [customCategories, setCustomCategories] = useState(loadCategories);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const isAdmin = user?.role === 'admin';

  const toSlug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const handleLabelChange = (val) => {
    setNewLabel(val);
    setNewValue(toSlug(val));
  };

  const handleAdd = () => {
    const trimLabel = newLabel.trim();
    const trimValue = newValue.trim() || toSlug(trimLabel);
    if (!trimLabel || !trimValue) return;

    const allValues = [...DEFAULT_CATEGORIES, ...customCategories].map(c => c.value);
    if (allValues.includes(trimValue)) {
      toast.error('A category with that slug already exists.');
      return;
    }

    const updated = [...customCategories, { value: trimValue, label: trimLabel, custom: true }];
    setCustomCategories(updated);
    saveCategories(updated);
    setNewLabel('');
    setNewValue('');
    toast.success(`Category "${trimLabel}" added.`);
  };

  const handleDelete = (value) => {
    const updated = customCategories.filter(c => c.value !== value);
    setCustomCategories(updated);
    saveCategories(updated);
    toast.success('Category removed.');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <ShieldAlert className="w-14 h-14 text-red-400" />
        <h2 className="text-2xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-slate-500">Only admins can manage categories.</p>
      </div>
    );
  }

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Tag className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manage Categories</h1>
            <p className="text-sm text-slate-500">Add or remove course categories</p>
          </div>
        </div>

        {/* Add New Category */}
        <div className="bg-white rounded-2xl border p-6 mb-6">
          <h2 className="font-semibold text-slate-800 mb-4">Add New Category</h2>
          <div className="space-y-3">
            <div>
              <Label>Category Name</Label>
              <Input
                value={newLabel}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g., IoT Development"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Slug (auto-generated)</Label>
              <Input
                value={newValue}
                onChange={(e) => setNewValue(toSlug(e.target.value))}
                placeholder="e.g., iot-development"
                className="mt-1.5 font-mono text-sm text-slate-500"
              />
              <p className="text-xs text-slate-400 mt-1">Used internally as the category identifier.</p>
            </div>
            <Button
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>

        {/* Category List */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-slate-800 mb-4">All Categories ({allCategories.length})</h2>
          <div className="space-y-2">
            {allCategories.map((cat) => (
              <div key={cat.value} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span className="font-medium text-slate-800">{cat.label}</span>
                  <code className="text-xs text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">{cat.value}</code>
                </div>
                <div className="flex items-center gap-2">
                  {cat.custom ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Category</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove "{cat.label}"? Existing courses with this category won't be affected, but it won't appear in dropdowns anymore.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(cat.value)} className="bg-red-600 hover:bg-red-700">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}