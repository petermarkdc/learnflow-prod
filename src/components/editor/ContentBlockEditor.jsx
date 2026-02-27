import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { 
  Type, Code, Image as ImageIcon, Link as LinkIcon, 
  Heading, Minus, GripVertical, Trash2, Upload, Loader2 
} from 'lucide-react';
import { cn } from "@/lib/utils";

const BLOCK_TYPES = [
  { type: 'heading', icon: Heading, label: 'Heading' },
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'code', icon: Code, label: 'Code' },
  { type: 'image', icon: ImageIcon, label: 'Image' },
  { type: 'link', icon: LinkIcon, label: 'Link' },
  { type: 'divider', icon: Minus, label: 'Divider' },
];

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'c', label: 'C' },
  { value: 'html', label: 'HTML' },
  { value: 'bash', label: 'Bash' },
];

export default function ContentBlockEditor({ block, onChange, onDelete, dragHandleProps }) {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange({ ...block, url: file_url });
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const renderEditor = () => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select
                value={String(block.level || 2)}
                onValueChange={(v) => onChange({ ...block, level: Number(v) })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1</SelectItem>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                  <SelectItem value="4">H4</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={block.content || ''}
                onChange={(e) => onChange({ ...block, content: e.target.value })}
                placeholder="Heading text..."
                className="flex-1"
              />
            </div>
          </div>
        );

      case 'text':
        return (
          <Textarea
            value={block.content || ''}
            onChange={(e) => onChange({ ...block, content: e.target.value })}
            placeholder="Write your content here... (supports **bold**, *italic*, `code`)"
            className="min-h-[100px] resize-y"
          />
        );

      case 'code':
        return (
          <div className="space-y-2">
            <Select
              value={block.language || 'javascript'}
              onValueChange={(v) => onChange({ ...block, language: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
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
              <Input
                value={block.url || ''}
                onChange={(e) => onChange({ ...block, url: e.target.value })}
                placeholder="Image URL..."
                className="flex-1"
              />
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button variant="outline" asChild disabled={uploading}>
                  <span className="cursor-pointer">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </span>
                </Button>
              </label>
            </div>
            <Input
              value={block.alt || ''}
              onChange={(e) => onChange({ ...block, alt: e.target.value })}
              placeholder="Alt text (optional)"
            />
            {block.url && (
              <div className="rounded-lg overflow-hidden border bg-slate-50">
                <img src={block.url} alt={block.alt || ''} className="max-h-48 object-contain mx-auto" />
              </div>
            )}
          </div>
        );

      case 'link':
        return (
          <div className="space-y-2">
            <Input
              value={block.content || ''}
              onChange={(e) => onChange({ ...block, content: e.target.value })}
              placeholder="Link text..."
            />
            <Input
              value={block.url || ''}
              onChange={(e) => onChange({ ...block, url: e.target.value })}
              placeholder="URL..."
            />
          </div>
        );

      case 'divider':
        return (
          <div className="py-2">
            <hr className="border-slate-300" />
          </div>
        );

      default:
        return null;
    }
  };

  const blockInfo = BLOCK_TYPES.find((b) => b.type === block.type);
  const Icon = blockInfo?.icon || Type;

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2 p-4">
        <div
          {...dragHandleProps}
          className="mt-1 p-1 rounded cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        >
          <GripVertical className="w-4 h-4" />
        </div>
        
        <div className={cn(
          "p-2 rounded-lg",
          block.type === 'heading' && "bg-purple-100 text-purple-600",
          block.type === 'text' && "bg-blue-100 text-blue-600",
          block.type === 'code' && "bg-emerald-100 text-emerald-600",
          block.type === 'image' && "bg-pink-100 text-pink-600",
          block.type === 'link' && "bg-amber-100 text-amber-600",
          block.type === 'divider' && "bg-slate-100 text-slate-600",
        )}>
          <Icon className="w-4 h-4" />
        </div>
        
        <div className="flex-1">
          <div className="text-xs font-medium text-slate-500 mb-2">{blockInfo?.label}</div>
          {renderEditor()}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}