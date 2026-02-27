import React from 'react';
import ReactMarkdown from 'react-markdown';
import CodeBlock from '../editor/CodeBlock';
import { ExternalLink } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ContentRenderer({ blocks = [] }) {
  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'heading':
        const HeadingTag = `h${block.level || 2}`;
        const headingStyles = {
          1: 'text-4xl font-bold text-slate-900 mb-6 mt-8',
          2: 'text-3xl font-bold text-slate-900 mb-4 mt-6',
          3: 'text-2xl font-semibold text-slate-800 mb-3 mt-5',
          4: 'text-xl font-semibold text-slate-800 mb-2 mt-4',
        };
        return (
          <HeadingTag key={index} className={headingStyles[block.level || 2]}>
            {block.content}
          </HeadingTag>
        );

      case 'text':
        return (
          <div key={index} className="prose prose-slate max-w-none mb-4">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="text-slate-700 leading-relaxed mb-4">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-pink-600 text-sm font-mono">
                    {children}
                  </code>
                ),
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-4">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-4">{children}</ol>,
                li: ({ children }) => <li className="text-slate-700">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-indigo-50 rounded-r-lg">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {block.content || ''}
            </ReactMarkdown>
          </div>
        );

      case 'code':
        return (
          <div key={index} className="mb-6">
            <CodeBlock
              code={block.content || ''}
              language={block.language || 'javascript'}
              showLineNumbers={true}
            />
          </div>
        );

      case 'image':
        return (
          <figure key={index} className="my-6">
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <img
                src={block.url}
                alt={block.alt || ''}
                className="w-full h-auto object-contain max-h-[500px]"
              />
            </div>
            {block.alt && (
              <figcaption className="text-center text-sm text-slate-500 mt-2">
                {block.alt}
              </figcaption>
            )}
          </figure>
        );

      case 'link':
        return (
          <a
            key={index}
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium mb-4"
          >
            {block.content || block.url}
            <ExternalLink className="w-4 h-4" />
          </a>
        );

      case 'divider':
        return (
          <hr key={index} className="my-8 border-slate-200" />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}