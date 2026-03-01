import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Check, Loader2, RefreshCw } from 'lucide-react';
import { toast } from "sonner";

export default function AISuggestions({ lessonTitle, onInsertBlock }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const generateSuggestions = async () => {
    if (!lessonTitle?.trim()) {
      toast.error('Please enter a lesson title first');
      return;
    }
    setLoading(true);
    setSuggestions(null);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are helping a teacher create lesson content. The lesson title is: "${lessonTitle}".

Generate 4 content suggestions for this lesson. Each suggestion should be a short paragraph (2-3 sentences) covering a key concept or subtopic. Make them educational, clear, and suitable for a lesson.

Return JSON with this structure:
{
  "suggestions": [
    { "heading": "short topic title", "content": "2-3 sentence paragraph explaining the concept" },
    ...
  ]
}`,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                content: { type: "string" }
              }
            }
          }
        }
      }
    });
    setSuggestions(result.suggestions || []);
    setLoading(false);
  };

  const handleCopy = (suggestion, index) => {
    // Insert as two blocks: heading + text
    onInsertBlock({ type: 'heading', content: suggestion.heading, level: 3, id: Date.now().toString() });
    onInsertBlock({ type: 'text', content: suggestion.content, id: (Date.now() + 1).toString() });
    setCopiedIndex(index);
    toast.success('Added to content!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <h3 className="font-semibold text-slate-900 text-sm">AI Content Suggestions</h3>
        </div>
        {suggestions && (
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSuggestions}
            disabled={loading}
            className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        )}
      </div>

      {!suggestions && !loading && (
        <div className="text-center py-3">
          <p className="text-xs text-slate-500 mb-3">
            Get AI-generated content ideas based on your lesson title.
          </p>
          <Button
            size="sm"
            onClick={generateSuggestions}
            className="bg-indigo-600 hover:bg-indigo-700 w-full gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate Suggestions
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6 gap-2 text-indigo-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Generating...</span>
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-indigo-100 p-3 group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 mb-1">{s.heading}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{s.content}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(s, i)}
                  className="h-7 w-7 p-0 flex-shrink-0 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                  title="Add to content"
                >
                  {copiedIndex === i ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}