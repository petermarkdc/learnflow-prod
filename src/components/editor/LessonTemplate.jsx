import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { LayoutTemplate, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { toast } from "sonner";

const TEMPLATE_BLOCKS = [
  // 1. Lesson Overview
  { type: 'heading', content: '1. Lesson Overview', level: 2, id: 't-1' },
  { type: 'text', content: 'Briefly describe:\n- What this lesson covers\n- Why it matters\n- How it connects to previous lessons\n\n*Example:* In this lesson, students will learn how to use loops to automate repetitive tasks and process collections of data efficiently.', id: 't-2' },

  // 2. Learning Objectives
  { type: 'heading', content: '2. Learning Objectives', level: 2, id: 't-3' },
  { type: 'text', content: 'By the end of this lesson, students should be able to:', id: 't-4' },
  { type: 'bullet_list', items: [
    '✅ Define key concepts',
    '✅ Write code using ___',
    '✅ Debug common errors related to ___',
    '✅ Apply the concept in a small project',
  ], id: 't-5' },
  { type: 'note', content: 'Use measurable action verbs: write, implement, compare, debug, refactor.', id: 't-6' },

  // 3. Key Concepts & Theory
  { type: 'heading', content: '3. Key Concepts & Theory', level: 2, id: 't-7' },
  { type: 'heading', content: '3.1 Concept Name', level: 3, id: 't-8' },
  { type: 'text', content: '**Definition:** Clear, simple explanation.\n\n**Why it\'s important:** Explain real-world relevance.\n\n**How it works:** Step-by-step explanation.', id: 't-9' },
  { type: 'code', content: '// Syntax example here', language: 'javascript', id: 't-10' },

  // 4. Visual / Conceptual Explanation
  { type: 'heading', content: '4. Visual / Conceptual Explanation (Optional)', level: 2, id: 't-11' },
  { type: 'bullet_list', items: ['Diagrams', 'Flowcharts', 'Execution flow', 'Memory model illustrations'], id: 't-12' },

  // 5. Live Code Walkthrough
  { type: 'heading', content: '5. Live Code Walkthrough', level: 2, id: 't-13' },
  { type: 'heading', content: 'Example 1: Basic Usage', level: 3, id: 't-14' },
  { type: 'code', content: '// example code here', language: 'javascript', id: 't-15' },
  { type: 'text', content: '**Explanation:**\n- Line 1 does ___\n- Line 2 initializes ___\n- Line 3 executes ___', id: 't-16' },
  { type: 'heading', content: 'Example 2: Practical Example', level: 3, id: 't-17' },
  { type: 'code', content: '// real-world scenario', language: 'javascript', id: 't-18' },
  { type: 'text', content: '**Explain:**\n- Input: ___\n- Processing: ___\n- Output: ___', id: 't-19' },

  // 6. Common Mistakes & Debugging Tips
  { type: 'heading', content: '6. Common Mistakes & Debugging Tips', level: 2, id: 't-20' },
  { type: 'table', table_data: {
    headers: ['Mistake', 'Why It Happens', 'How to Fix'],
    rows: [
      ['Example error', 'Misunderstanding scope', 'Check variable declaration'],
      ['Another mistake', 'Off-by-one error', 'Review loop bounds'],
    ]
  }, id: 't-21' },
  { type: 'tip', content: 'Include typical beginner mistakes, error message explanations, and a debug strategy.', id: 't-22' },

  // 7. Guided Practice
  { type: 'heading', content: '7. Guided Practice', level: 2, id: 't-23' },
  { type: 'heading', content: 'Exercise 1 (Easy)', level: 3, id: 't-24' },
  { type: 'text', content: '**Task:** Describe the exercise here.\n\n**Expected Output:**\n```\noutput here\n```', id: 't-25' },
  { type: 'heading', content: 'Exercise 2 (Medium)', level: 3, id: 't-26' },
  { type: 'text', content: 'More complex scenario.', id: 't-27' },
  { type: 'heading', content: 'Exercise 3 (Challenge)', level: 3, id: 't-28' },
  { type: 'text', content: 'Encourage critical thinking or extension tasks.', id: 't-29' },

  // 8. Independent Practice / Homework
  { type: 'heading', content: '8. Independent Practice / Homework', level: 2, id: 't-30' },
  { type: 'bullet_list', items: ['Mini-project', 'Coding challenges', 'Real-world simulation'], id: 't-31' },
  { type: 'note', content: 'Example: Build a simple calculator that supports addition, subtraction, multiplication, and division.', id: 't-32' },

  // 9. Assessment
  { type: 'heading', content: '9. Assessment', level: 2, id: 't-33' },
  { type: 'heading', content: 'Coding Task', level: 3, id: 't-34' },
  { type: 'bullet_list', items: ['Problem statement', 'Requirements', 'Evaluation criteria'], id: 't-35' },

  // 10. Summary
  { type: 'heading', content: '10. Summary', level: 2, id: 't-36' },
  { type: 'bullet_list', items: ['Recap key ideas', 'Reinforce main takeaway', 'Connect to next lesson'], id: 't-37' },

  // 11. Further Reading & Resources
  { type: 'heading', content: '11. Further Reading & Resources', level: 2, id: 't-38' },
  { type: 'bullet_list', items: ['Documentation links', 'Articles', 'Videos', 'Practice platforms'], id: 't-39' },
];

export default function LessonTemplate({ onInsertBlocks }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAll = () => {
    const blocks = TEMPLATE_BLOCKS.map((b, i) => ({
      ...b,
      id: `tpl-${Date.now()}-${i}`,
    }));
    onInsertBlocks(blocks);
    setCopied(true);
    toast.success('Full lesson template added to content!');
    setTimeout(() => setCopied(false), 2500);
  };

  const SECTIONS = [
    { label: '1. Lesson Overview', indices: [0, 1] },
    { label: '2. Learning Objectives', indices: [2, 3, 4, 5] },
    { label: '3. Key Concepts & Theory', indices: [6, 7, 8, 9] },
    { label: '4. Visual Explanation', indices: [10, 11] },
    { label: '5. Live Code Walkthrough', indices: [12, 13, 14, 15, 16, 17, 18] },
    { label: '6. Common Mistakes', indices: [19, 20, 21] },
    { label: '7. Guided Practice', indices: [22, 23, 24, 25, 26, 27, 28] },
    { label: '8. Independent Practice', indices: [29, 30, 31] },
    { label: '9. Assessment', indices: [32, 33, 34] },
    { label: '10. Summary', indices: [35, 36] },
    { label: '11. Further Reading', indices: [37, 38] },
  ];

  const handleCopySection = (indices) => {
    const blocks = indices.map((i, j) => ({
      ...TEMPLATE_BLOCKS[i],
      id: `tpl-s-${Date.now()}-${j}`,
    }));
    onInsertBlocks(blocks);
    toast.success('Section added to content!');
  };

  return (
    <div className="bg-white rounded-2xl border p-5">
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-purple-600" />
          <h3 className="font-semibold text-slate-900 text-sm">Lesson Template</h3>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-500">
            Pre-built lesson structure. Copy all sections at once or pick individual sections to insert.
          </p>

          {/* Copy All */}
          <Button
            size="sm"
            className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
            onClick={handleCopyAll}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Template Added!' : 'Copy Full Template'}
          </Button>

          {/* Individual Sections */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600 mb-2">Or add individual sections:</p>
            {SECTIONS.map((section) => (
              <button
                key={section.label}
                onClick={() => handleCopySection(section.indices)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-600 transition-colors flex items-center justify-between group"
              >
                <span>{section.label}</span>
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 text-purple-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}