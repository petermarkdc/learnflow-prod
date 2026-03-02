import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Save, Upload, User, Sparkles } from 'lucide-react';
import { toast } from "sonner";

async function syncUserProfile(email, data) {
  const existing = await base44.entities.UserProfile.filter({ user_email: email });
  if (existing[0]) {
    await base44.entities.UserProfile.update(existing[0].id, data);
  } else {
    await base44.entities.UserProfile.create({ user_email: email, ...data });
  }
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ nickname: '', bio: '', avatar_url: '', school_organization: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      // Check if profile is incomplete to show welcome banner
      const profiles = await base44.entities.UserProfile.filter({ user_email: u.email });
      const profile = profiles[0];
      const incomplete = !profile?.nickname || !profile?.avatar_url;
      setIsNewUser(incomplete);
      setFormData({
        nickname: u.nickname || '',
        bio: u.bio || '',
        avatar_url: u.avatar_url || '',
        school_organization: profile?.school_organization || '',
      });
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(formData);
    await syncUserProfile(user.email, { nickname: formData.nickname, avatar_url: formData.avatar_url });
    const updated = await base44.auth.me();
    setUser(updated);
    setSaving(false);
    toast.success('Profile updated!');
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, avatar_url: file_url }));
    await base44.auth.updateMe({ avatar_url: file_url });
    await syncUserProfile(user.email, { nickname: formData.nickname, avatar_url: file_url });
    const updated = await base44.auth.me();
    setUser(updated);
    setUploading(false);
    toast.success('Profile photo updated!');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">My Profile</h1>

        <div className="bg-white rounded-2xl border p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={formData.avatar_url} />
              <AvatarFallback className="bg-indigo-100 text-indigo-700 text-2xl">
                {user.full_name?.[0] || <User className="w-8 h-8" />}
              </AvatarFallback>
            </Avatar>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <Button variant="outline" size="sm" asChild disabled={uploading}>
                <span>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Change Photo
                </span>
              </Button>
            </label>
          </div>

          {/* Read-only info */}
          <div className="space-y-1">
            <Label className="text-slate-500">Full Name</Label>
            <p className="text-slate-800 font-medium">{user.full_name}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-500">Email</Label>
            <p className="text-slate-800">{user.email}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-slate-500">Role</Label>
            <p className="text-slate-800 capitalize">{user.role || 'student'}</p>
          </div>

          {/* Editable fields */}
          <div>
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={formData.nickname}
              onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
              placeholder="How others will see your name on courses"
              className="mt-1.5"
            />
            <p className="text-xs text-slate-400 mt-1">Shown as course author on published courses</p>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell students a bit about yourself..."
              className="mt-1.5 min-h-[80px] resize-y"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}