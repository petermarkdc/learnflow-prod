import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, Globe, Upload, Loader2, Copy, Check, X, 
  ChevronDown, ChevronUp, Image as ImageIcon, Trash2 
} from 'lucide-react';
import { toast } from "sonner";

export default function DocumentReference({ onInsertBlock }) {
  const [file, setFile] = useState(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [fetchingWeb, setFetchingWeb] = useState(false);
  const [extractedBlocks, setExtractedBlocks] = useState([]);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [expanded, setExpanded] = useState(true);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(f.type)) {
      toast.error('Please upload a PDF or Word document (.pdf, .doc, .docx)');
      return;
    }
    setFile(f);
    setExtractedBlocks([]);
  };

  const handleExtractFile = async () => {
    if (!file) return;
    setExtracting(true);
    setExtractedBlocks([]);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are extracting structured lesson content from a document. Extract all text, headings, lists, and images from the document at this URL: ${file_url}

Return a JSON array of content blocks. Use these block types:
- { "type": "heading", "content": "heading text", "level": 2 }
- { "type": "text", "content": "paragraph text" }
- { "type": "bullet_list", "items": ["item1", "item2"] }
- { "type": "numbered_list", "items": ["item1", "item2"] }
- { "type": "image", "url": "image_url_if_available", "alt": "description" }
- { "type": "note", "content": "important note text" }

Extract everything faithfully. Preserve the structure. If you find images embedded, describe them in an image block.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            blocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  content: { type: "string" },
                  level: { type: "number" },
                  items: { type: "array", items: { type: "string" } },
                  url: { type: "string" },
                  alt: { type: "string" }
                }
              }
            }
          }
        }
      });

      const blocks = (result.blocks || []).map((b, i) => ({ ...b, id: `ref-${Date.now()}-${i}` }));
      setExtractedBlocks(blocks);
      if (!blocks.length) toast.info('No content extracted from document.');
    } catch (err) {
      toast.error('Failed to extract document content.');
    }
    setExtracting(false);
  };

  const handleFetchWebsite = async () => {
    if (!websiteUrl.trim()) return;
    setFetchingWeb(true);
    setExtractedBlocks([]);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract structured lesson-relevant content from this website: ${websiteUrl}

Return a JSON array of content blocks:
- { "type": "heading", "content": "heading text", "level": 2 }
- { "type": "text", "content": "paragraph text" }
- { "type": "bullet_list", "items": ["item1", "item2"] }
- { "type": "note", "content": "important note" }
- { "type": "link", "content": "link label", "url": "${websiteUrl}" }

Extract the main educational/reference content. Skip navigation, ads, footers.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            blocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  content: { type: "string" },
                  level: { type: "number" },
                  items: { type: "array", items: { type: "string" } },
                  url: { type: "string" }
                }
              }
            }
          }
        }
      });

      const blocks = (result.blocks || []).map((b, i) => ({ ...b, id: `web-${Date.now()}-${i}` }));
      setExtractedBlocks(blocks);
      if (!blocks.length) toast.info('No content extracted from website.');
    } catch (err) {
      toast.error('Failed to fetch website content.');
    }
    setFetchingWeb(false);
  };

  const handleCopyBlock = (block, idx) => {
    onInsertBlock({ ...block, id: Date.now().toString() + idx });
    setCopiedIdx(idx);
    toast.success('Block added to content!');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleCopyAll = () => {
    extractedBlocks.forEach((block, i) => {
      setTimeout(() => {
        onInsertBlock({ ...block, id: Date.now().toString() + i });
      }, i * 10);
    });
    toast.success('All blocks added to content!');
  };

  const handleRemoveBlock = (idx) => {
    setExtractedBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const renderBlockPreview = (block) => {
    switch (block.type) {
      case 'heading':
        return <p className="font-bold text-slate-800 text-xs">{block.content}</p>;
      case 'text':
        return <p className="text-xs text-slate-600 line-clamp-2">{block.content}</p>;
      case 'bullet_list':
      case 'numbered_list':
        return (
          <ul className="text-xs text-slate-600 list-disc ml-3 line-clamp-2">
            {(block.items || []).slice(0, 2).map((item, i) => <li key={i}>{item}</li>)}
            {(block.items || []).length > 2 && <li className="text-slate-400">+{block.items.length - 2} more...</li>}
          </ul>
        );
      case 'image':
        return (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <ImageIcon className="w-3 h-3" />
            <span className="italic">{block.alt || 'Image'}</span>
          </div>
        );
      case 'note':
        return <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded line-clamp-2">{block.content}</p>;
      case 'link':
        return <p className="text-xs text-indigo-600 underline line-clamp-1">{block.content || block.url}</p>;
      default:
        return <p className="text-xs text-slate-500 italic line-clamp-1">{block.content || block.type}</p>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border p-5">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Document & Web Reference</h3>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* File Upload */}
          <div>
            <p className="text-xs font-medium text-slate-700 mb-1.5">Upload Document (PDF or Word)</p>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
              <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500 truncate">
                {file ? file.name : 'Click to upload PDF or Word doc'}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {file && (
              <Button
                size="sm"
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 gap-2"
                onClick={handleExtractFile}
                disabled={extracting}
              >
                {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                {extracting ? 'Extracting...' : 'Extract Content'}
              </Button>
            )}
          </div>

          {/* Website URL */}
          <div>
            <p className="text-xs font-medium text-slate-700 mb-1.5">Website / Documentation Link</p>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com/reference"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                className="text-xs h-8"
                onKeyDown={e => e.key === 'Enter' && handleFetchWebsite()}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-2 flex-shrink-0"
                onClick={handleFetchWebsite}
                disabled={fetchingWeb || !websiteUrl.trim()}
              >
                {fetchingWeb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {/* Extracted Blocks */}
          {extractedBlocks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-700">{extractedBlocks.length} blocks extracted</p>
                <Button size="sm" variant="outline" className="h-6 px-2 text-xs gap-1" onClick={handleCopyAll}>
                  <Copy className="w-3 h-3" /> Copy All
                </Button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {extractedBlocks.map((block, idx) => (
                  <div key={block.id || idx} className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-start gap-2 group">
                    <div className="flex-1 min-w-0">
                      {renderBlockPreview(block)}
                    </div>
                    <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyBlock(block, idx)}
                        className="text-indigo-500 hover:text-indigo-700 p-0.5"
                        title="Add to content"
                      >
                        {copiedIdx === idx ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleRemoveBlock(idx)}
                        className="text-slate-400 hover:text-red-500 p-0.5"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}