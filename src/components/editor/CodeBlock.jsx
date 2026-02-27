import React, { useState } from 'react';
import { Check, Copy, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Keywords for syntax highlighting
const KEYWORDS = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'switch', 'case', 'break', 'continue', 'do', 'in', 'of', 'extends', 'super', 'static', 'get', 'set', 'yield'],
  python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'pass', 'break', 'continue', 'global', 'nonlocal', 'assert', 'yield', 'del', 'print', 'self'],
  c: ['int', 'char', 'float', 'double', 'void', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'return', 'struct', 'typedef', 'enum', 'union', 'const', 'static', 'extern', 'sizeof', 'unsigned', 'signed', 'long', 'short', 'auto', 'register', 'volatile', 'include', 'define', 'ifdef', 'ifndef', 'endif', 'NULL', 'printf', 'scanf', 'malloc', 'free'],
  html: ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button', 'script', 'style', 'link', 'meta', 'title', 'header', 'footer', 'nav', 'section', 'article', 'aside', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'hr', 'class', 'id', 'src', 'href', 'type', 'value', 'name', 'placeholder'],
  bash: ['echo', 'cd', 'ls', 'pwd', 'mkdir', 'rm', 'cp', 'mv', 'cat', 'grep', 'find', 'chmod', 'chown', 'sudo', 'apt', 'yum', 'npm', 'yarn', 'git', 'docker', 'if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function', 'return', 'exit', 'export', 'source', 'alias', 'unset', 'read', 'curl', 'wget', 'tar', 'zip', 'unzip', 'ssh', 'scp', 'kill', 'ps', 'top', 'man']
};

const BUILT_INS = {
  javascript: ['console', 'document', 'window', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Math', 'Date', 'JSON', 'Promise', 'Map', 'Set', 'RegExp', 'Error', 'setTimeout', 'setInterval', 'fetch', 'addEventListener', 'querySelector', 'getElementById'],
  python: ['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'tuple', 'set', 'bool', 'type', 'input', 'open', 'file', 'map', 'filter', 'reduce', 'zip', 'enumerate', 'sorted', 'reversed', 'sum', 'min', 'max', 'abs', 'round', 'format', '__init__', '__str__', '__repr__'],
  c: ['printf', 'scanf', 'malloc', 'calloc', 'realloc', 'free', 'strlen', 'strcpy', 'strcat', 'strcmp', 'memset', 'memcpy', 'fopen', 'fclose', 'fread', 'fwrite', 'fprintf', 'fscanf', 'fgets', 'fputs', 'getchar', 'putchar', 'gets', 'puts', 'exit', 'atoi', 'atof', 'rand', 'srand', 'time'],
  html: [],
  bash: []
};

// Simple syntax error detection
const detectErrors = (code, language) => {
  const errors = [];
  const lines = code.split('\n');
  
  if (language === 'javascript') {
    let braceCount = 0, parenCount = 0, bracketCount = 0;
    lines.forEach((line, idx) => {
      braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      parenCount += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
      bracketCount += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
      if (line.includes('console.log') && !line.includes('(')) {
        errors.push({ line: idx + 1, message: 'Missing parentheses in console.log' });
      }
    });
    if (braceCount !== 0) errors.push({ line: lines.length, message: 'Unmatched curly braces' });
    if (parenCount !== 0) errors.push({ line: lines.length, message: 'Unmatched parentheses' });
    if (bracketCount !== 0) errors.push({ line: lines.length, message: 'Unmatched brackets' });
  }
  
  if (language === 'python') {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if ((trimmed.startsWith('def ') || trimmed.startsWith('if ') || trimmed.startsWith('for ') || 
           trimmed.startsWith('while ') || trimmed.startsWith('class ') || trimmed.startsWith('elif ') ||
           trimmed.startsWith('else') || trimmed.startsWith('try') || trimmed.startsWith('except')) && 
          !trimmed.endsWith(':') && trimmed.length > 0) {
        errors.push({ line: idx + 1, message: 'Missing colon at end of statement' });
      }
    });
  }
  
  if (language === 'html') {
    const openTags = [];
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    const selfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
    
    lines.forEach((line, idx) => {
      let match;
      while ((match = tagRegex.exec(line)) !== null) {
        const tag = match[1].toLowerCase();
        if (!selfClosing.includes(tag)) {
          if (match[0].startsWith('</')) {
            if (openTags.length === 0 || openTags[openTags.length - 1] !== tag) {
              errors.push({ line: idx + 1, message: `Unexpected closing tag </${tag}>` });
            } else {
              openTags.pop();
            }
          } else if (!match[0].endsWith('/>')) {
            openTags.push(tag);
          }
        }
      }
    });
  }
  
  return errors;
};

// Tokenize and highlight code
const highlightCode = (code, language) => {
  const keywords = KEYWORDS[language] || [];
  const builtIns = BUILT_INS[language] || [];
  
  const lines = code.split('\n');
  
  return lines.map((line, lineIdx) => {
    const tokens = [];
    let remaining = line;
    let position = 0;
    
    while (remaining.length > 0) {
      // Comments
      if ((language === 'javascript' || language === 'c') && remaining.startsWith('//')) {
        tokens.push({ type: 'comment', value: remaining });
        break;
      }
      if (language === 'python' && remaining.startsWith('#')) {
        tokens.push({ type: 'comment', value: remaining });
        break;
      }
      if (language === 'bash' && remaining.trimStart().startsWith('#') && position === 0) {
        tokens.push({ type: 'comment', value: remaining });
        break;
      }
      if (language === 'html' && remaining.startsWith('<!--')) {
        const endIdx = remaining.indexOf('-->');
        if (endIdx !== -1) {
          tokens.push({ type: 'comment', value: remaining.substring(0, endIdx + 3) });
          remaining = remaining.substring(endIdx + 3);
          continue;
        }
      }
      
      // Strings
      const stringMatch = remaining.match(/^(["'`])(?:\\.|[^\\])*?\1/);
      if (stringMatch) {
        tokens.push({ type: 'string', value: stringMatch[0] });
        remaining = remaining.substring(stringMatch[0].length);
        position += stringMatch[0].length;
        continue;
      }
      
      // Numbers
      const numMatch = remaining.match(/^\b\d+\.?\d*\b/);
      if (numMatch) {
        tokens.push({ type: 'number', value: numMatch[0] });
        remaining = remaining.substring(numMatch[0].length);
        position += numMatch[0].length;
        continue;
      }
      
      // HTML tags
      if (language === 'html') {
        const tagMatch = remaining.match(/^<\/?[a-zA-Z][a-zA-Z0-9]*|^>/);
        if (tagMatch) {
          tokens.push({ type: 'tag', value: tagMatch[0] });
          remaining = remaining.substring(tagMatch[0].length);
          position += tagMatch[0].length;
          continue;
        }
        const attrMatch = remaining.match(/^[a-zA-Z-]+(?==)/);
        if (attrMatch) {
          tokens.push({ type: 'attribute', value: attrMatch[0] });
          remaining = remaining.substring(attrMatch[0].length);
          position += attrMatch[0].length;
          continue;
        }
      }
      
      // Keywords and identifiers
      const wordMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
      if (wordMatch) {
        const word = wordMatch[0];
        if (keywords.includes(word)) {
          tokens.push({ type: 'keyword', value: word });
        } else if (builtIns.includes(word)) {
          tokens.push({ type: 'builtin', value: word });
        } else if (remaining.substring(word.length).trimStart().startsWith('(')) {
          tokens.push({ type: 'function', value: word });
        } else {
          tokens.push({ type: 'text', value: word });
        }
        remaining = remaining.substring(word.length);
        position += word.length;
        continue;
      }
      
      // Operators and punctuation
      const opMatch = remaining.match(/^[+\-*/%=<>!&|^~?:;,.()[\]{}]+/);
      if (opMatch) {
        tokens.push({ type: 'operator', value: opMatch[0] });
        remaining = remaining.substring(opMatch[0].length);
        position += opMatch[0].length;
        continue;
      }
      
      // Whitespace
      const spaceMatch = remaining.match(/^\s+/);
      if (spaceMatch) {
        tokens.push({ type: 'space', value: spaceMatch[0] });
        remaining = remaining.substring(spaceMatch[0].length);
        position += spaceMatch[0].length;
        continue;
      }
      
      // Single character fallback
      tokens.push({ type: 'text', value: remaining[0] });
      remaining = remaining.substring(1);
      position += 1;
    }
    
    return tokens;
  });
};

const TOKEN_COLORS = {
  keyword: 'text-purple-400',
  builtin: 'text-cyan-400',
  string: 'text-emerald-400',
  number: 'text-orange-400',
  comment: 'text-slate-500 italic',
  function: 'text-yellow-300',
  tag: 'text-pink-400',
  attribute: 'text-sky-400',
  operator: 'text-slate-300',
  text: 'text-slate-200',
  space: ''
};

export default function CodeBlock({ code, language = 'javascript', showLineNumbers = true }) {
  const [copied, setCopied] = useState(false);
  const errors = detectErrors(code, language);
  const highlightedLines = highlightCode(code, language);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const languageLabels = {
    javascript: 'JavaScript',
    python: 'Python',
    c: 'C',
    html: 'HTML',
    bash: 'Bash'
  };
  
  return (
    <div className="relative group rounded-xl overflow-hidden bg-slate-900 shadow-lg border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs font-medium text-slate-400 ml-2">
            {languageLabels[language] || language}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {errors.length > 0 && (
            <div className="flex items-center gap-1 text-amber-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.length} issue{errors.length > 1 ? 's' : ''}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-green-400" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Code content */}
      <div className="overflow-x-auto">
        <div className="p-4 text-sm font-mono leading-relaxed">
          {highlightedLines.map((tokens, lineIdx) => {
            const lineNumber = lineIdx + 1;
            const lineError = errors.find(e => e.line === lineNumber);
            
            return (
              <div 
                key={lineIdx} 
                className={cn(
                  "flex group/line hover:bg-slate-800/50",
                  lineError && "bg-red-900/20"
                )}
              >
                {showLineNumbers && (
                  <div className="select-none w-10 pr-4 text-right text-slate-600 flex-shrink-0">
                    {lineNumber}
                  </div>
                )}
                <div className="flex-1 whitespace-pre">
                  {tokens.map((token, tokenIdx) => (
                    <span key={tokenIdx} className={TOKEN_COLORS[token.type]}>
                      {token.value}
                    </span>
                  ))}
                  {lineError && (
                    <span className="ml-4 text-xs text-red-400 italic">
                      ← {lineError.message}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}