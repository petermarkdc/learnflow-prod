import React from 'react';
import ReactMarkdown from 'react-markdown';
import CodeBlock from '../editor/CodeBlock';
import VideoPlayer from './VideoPlayer';
import { ExternalLink, Paperclip, Info, AlertTriangle, Lightbulb } from 'lucide-react';

const COLOR_MAP = {
  red: 'text-red-600',
  blue: 'text-blue-600',
  green: 'text-green-600',
  yellow: 'text-yellow-500',
  orange: 'text-orange-500',
  purple: 'text-purple-600',
  pink: 'text-pink-500',
};

function parseColoredText(text) {
  if (!text) return text;
  const parts = [];
  const regex = /\[(red|blue|green|yellow|orange|purple|pink):([^\]]+)\]/g;
  let last = 0, match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<span key={match.index} className={COLOR_MAP[match[1]]}>{match[2]}</span>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

export default function ContentRenderer({ blocks = [] }) {
  const renderBlock = (block, index) => {
    switch (block.type) {
      case 'heading': {
        const HeadingTag = `h${block.level || 2}`;
        const headingStyles = {
          1: 'text-4xl font-bold text-slate-900 mb-6 mt-8',
          2: 'text-3xl font-bold text-slate-900 mb-4 mt-6',
          3: 'text-2xl font-semibold text-slate-800 mb-3 mt-5',
          4: 'text-xl font-semibold text-slate-800 mb-2 mt-4',
        };
        const plainContent = block.content?.replace(/\[(red|blue|green|yellow|orange|purple|pink):([^\]]+)\]/g, '$2') || '';
        const slugId = plainContent.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
        return (
          <HeadingTag key={index} id={slugId} className={headingStyles[block.level || 2]}>
            {parseColoredText(block.content)}
          </HeadingTag>
        );
      }

      case 'text': {
        // If content looks like HTML (from Quill), render as HTML
        const isHtml = block.content && /<[a-z][\s\S]*>/i.test(block.content);
        if (isHtml) {
          return (
            <div
              key={index}
              className="prose prose-slate max-w-none mb-4 ql-content"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          );
        }
        return (
          <div key={index} className="prose prose-slate max-w-none mb-4">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="leading-relaxed mb-4">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => {
                  const text = String(children);
                  if (text.startsWith('b:')) {
                    return <span className="text-blue-600 font-medium">{text.slice(2)}</span>;
                  }
                  return <code className="px-1.5 py-0.5 rounded bg-slate-100 text-pink-600 text-sm font-mono">{children}</code>;
                },
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-4">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-4">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-indigo-50 rounded-r-lg">{children}</blockquote>
                ),
              }}
            >
              {block.content || ''}
            </ReactMarkdown>
          </div>
        );
      }

      case 'note':
        return (
          <div key={index} className="my-4 flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-800 text-sm mb-1">Note</p>
              <p className="text-blue-700 text-sm leading-relaxed">{block.content}</p>
            </div>
          </div>
        );

      case 'warning':
        return (
          <div key={index} className="my-4 flex gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm mb-1">Warning</p>
              <p className="text-red-700 text-sm leading-relaxed">{block.content}</p>
            </div>
          </div>
        );

      case 'tip':
        return (
          <div key={index} className="my-4 flex gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <Lightbulb className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 text-sm mb-1">Tip</p>
              <p className="text-green-700 text-sm leading-relaxed">{block.content}</p>
            </div>
          </div>
        );

      case 'code':
        return (
          <div key={index} className="mb-6">
            <CodeBlock code={block.content || ''} language={block.language || 'javascript'} showLineNumbers={true} />
          </div>
        );

      case 'image':
        return (
          <figure key={index} className="my-6">
            <div className="flex justify-center rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
              <img src={block.url} alt={block.alt || ''} className="max-w-full h-auto object-contain" style={{ maxHeight: '500px' }} />
            </div>
            {block.alt && <figcaption className="text-center text-sm text-slate-500 mt-2">{block.alt}</figcaption>}
          </figure>
        );

      case 'video':
        return <VideoPlayer key={index} url={block.url} caption={block.alt} />;

      case 'attachment':
        return (
          <div key={index} className="my-4">
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors text-sm font-medium"
              download
            >
              <Paperclip className="w-4 h-4" />
              {block.content || block.filename || 'Download Attachment'}
            </a>
          </div>
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

      case 'table': {
        const td = block.table_data;
        if (!td) return null;
        return (
          <div key={index} className="my-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100">
                  {td.headers?.map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left font-semibold text-slate-800 border-b border-slate-200">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {td.rows?.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-3 text-slate-700 border-b border-slate-100">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case 'bullet_list': {
        const items = Array.isArray(block.items) ? block.items.filter(Boolean) : [];
        if (!items.length) return null;
        return (
          <ul key={index} className="my-4 space-y-1.5 pl-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-700">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                <span>{parseColoredText(item)}</span>
              </li>
            ))}
          </ul>
        );
      }

      case 'numbered_list': {
        const items = Array.isArray(block.items) ? block.items.filter(Boolean) : [];
        if (!items.length) return null;
        return (
          <ol key={index} className="my-4 space-y-1.5 pl-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-slate-700">
                <span className="font-semibold text-indigo-600 text-sm w-5 flex-shrink-0 mt-0.5">{i + 1}.</span>
                <span>{parseColoredText(item)}</span>
              </li>
            ))}
          </ol>
        );
      }

      case 'divider':
        return <hr key={index} className="my-8 border-slate-200" />;

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