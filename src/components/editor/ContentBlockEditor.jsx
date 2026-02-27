import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { 
  Type, Code, Image as ImageIcon, Link as LinkIcon, 
  Heading, Minus, GripVertical, Trash2, Upload, Loader2,
  Table, Video, Paperclip, Info, AlertTriangle, Lightbulb, Palette
} from 'lucide-react';
import TableEditor from './TableEditor';
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'c', label: 'C' },
  { value: 'html', label: 'HTML' },
  { value: 'bash', label: 'Bash' },
];

const FONT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Gray', value: '#6b7280' },
];

const BLOCK_META = {
  heading: { icon: Heading, label: 'Heading', color: 'bg-purple-100 text-purple-600' },
  text: { icon: Type, label: 'Text', color: 'bg-blue-100 text-blue-600' },
  code: { icon: Code, label: 'Code', color: 'bg-emerald-100 text-emerald-600' },
  image: { icon: ImageIcon, label: 'Image', color: 'bg-pink-100 text-pink-600' },
  link: { icon: LinkIcon, label: 'Link', color: 'bg-amber-100 text-amber-600' },
  divider: { icon: Minus, label: 'Divider', color: 'bg-slate-100 text-slate-600' },
  table: { icon: Table, label: 'Table', color: 'bg-teal-100 text-teal-600' },
  video: { icon: Video, label: 'Video', color: 'bg-red-100 text-red-600' },
  attachment: { icon: Paperclip, label: 'Attachment', color: 'bg-orange-100 text-orange-600' },
  note: { icon: Info, label: 'Note', color: 'bg-blue-100 text-blue-700' },
  warning: { icon: AlertTriangle, label: 'Warning', color: 'bg-red-100 text-red-700' },
  tip: { icon: Lightbulb, label: 'Tip', color: 'bg-green-100 text-green-700' },
};

export default function ContentBlockEditor({ block, onChange, onDelete, dragHandleProps }) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e, field = 'url') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange({ ...block, [field]: file_url, ...(field === 'url' && block.type === 'attachment' ? { filename: file.name } : {}) });
    } finally {
      setUploading(false);
    }
  };

  const renderEditor = () => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="flex gap-2">
            <Select value={String(block.level || 2)} onValueChange={(v) => onChange({ ...block, level: Number(v) })}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>H{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={block.content || ''}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              placeholder="Heading text..."
              className="flex-1"
            />
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Palette className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Font color:</span>
              {FONT_COLORS.map(c => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => onChange({ ...block, color: c.value })}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                    block.color === c.value ? "border-slate-700 scale-110" : "border-transparent"
                  )}
                  style={{ background: c.value || '#1e293b' }}
                />
              ))}
            </div>
            <Textarea
              value={block.content || ''}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              placeholder="Write your content here... (supports **bold**, *italic*, `code`, - list, > quote)"
              className="min-h-[100px] resize-y"
              style={block.color ? { color: block.color } : {}}
            />
          </div>
        );

      case 'note':
      case 'warning':
      case 'tip':
        return (
          <Textarea
            value={block.content || ''}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            placeholder={
              block.type === 'note' ? '📘 Add a note for students...' :
              block.type === 'warning' ? '⚠️ Add a warning...' :
              '💡 Add a helpful tip...'
            }
            className="min-h-[80px] resize-y"
          />
        );

      case 'code':
        return (
          <div className="space-y-2">
            <Select value={block.language || 'javascript'} onValueChange={(v) => onChange({ ...block, language: v })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={block.content || ''}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              placeholder="Paste your code here..."
              className="min-h-[150px] font-mono text-sm resize-y bg-slate-900 text-slate-100 border-slate-700"
            />
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input value={block.url || ''} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="Image URL..." className="flex-1" />
              <label>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'url')} className="hidden" />
                <Button variant="outline" asChild disabled={uploading}>
                  <span className="cursor-pointer">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                </Button>
              </label>
            </div>
            <Input value={block.alt || ''} onChange={(e) => onChange({ ...block, alt: e.target.value })} placeholder="Caption / alt text" />
            {block.url && <div className="rounded-lg overflow-hidden border bg-slate-50"><img src={block.url} alt="" className="max-h-48 object-contain mx-auto" /></div>}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            <Input
              value={block.url || ''}
              onChange={(e) => onChange({ ...block, url: e.target.value })}
              placeholder="YouTube / Vimeo URL or direct .mp4 link..."
            />
            <Input value={block.alt || ''} onChange={(e) => onChange({ ...block, alt: e.target.value })} placeholder="Caption (optional)" />
          </div>
        );

      case 'attachment':
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input value={block.filename || block.url || ''} readOnly placeholder="No file selected" className="flex-1 bg-slate-50 text-slate-600 text-sm" />
              <label>
                <input type="file" onChange={(e) => handleFileUpload(e, 'url')} className="hidden" />
                <Button variant="outline" asChild disabled={uploading}>
                  <span className="cursor-pointer">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}</span>
                </Button>
              </label>
            </div>
            <Input value={block.content || ''} onChange={(e) => onChange({ ...block, content: e.target.value })} placeholder="Display label (optional)" />
          </div>
        );

      case 'link':
        return (
          <div className="space-y-2">
            <Input value={block.content || ''} onChange={(e) => onChange({ ...block, content: e.target.value })} placeholder="Link text..." />
            <Input value={block.url || ''} onChange={(e) => onChange({ ...block, url: e.target.value })} placeholder="URL..." />
          </div>
        );

      case 'table':
        return <TableEditor block={block} onChange={onChange} />;

      case 'divider':
        return <div className="py-2"><hr className="border-slate-300" /></div>;

      default:
        return null;
    }
  };

  const meta = BLOCK_META[block.type] || BLOCK_META['text'];
  const Icon = meta.icon;

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2 p-4">
        <div {...dragHandleProps} className="mt-1 p-1 rounded cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className={cn("p-2 rounded-lg flex-shrink-0", meta.color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-500 mb-2">{meta.label}</div>
          {renderEditor()}
        </div>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}