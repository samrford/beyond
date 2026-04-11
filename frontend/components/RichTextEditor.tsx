"use client";

import React, { useRef, useEffect } from "react";
import { Bold, Italic, Underline, Type } from "lucide-react";

interface RichTextEditorProps {
  initialValue: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({
  initialValue,
  onChange,
  placeholder,
  className = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Initialize content once
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && initialValue) {
      editorRef.current.innerHTML = initialValue;
    }
  }, [initialValue]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      isInternalUpdate.current = true;
      onChange(html);
      // Reset after a tick to allow for external updates if necessary
      setTimeout(() => {
        isInternalUpdate.current = false;
      }, 0);
    }
  };

  const execCommand = (e: React.MouseEvent, command: string, value: string = "") => {
    e.preventDefault();
    e.stopPropagation();
    document.execCommand(command, false, value);
    handleInput();
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden focus-within:border-primary-500 transition-all ${className}`}>
      <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onMouseDown={(e) => execCommand(e, "bold")}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => execCommand(e, "italic")}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Italic"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => execCommand(e, "underline")}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Underline"
        >
          <Underline size={14} />
        </button>
        <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 mx-1" />
        <button
          type="button"
          onMouseDown={(e) => execCommand(e, "insertUnorderedList")}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          title="Bullet List"
        >
          <Type size={14} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="w-full p-4 text-sm leading-relaxed text-gray-800 dark:text-gray-200 min-h-[120px] focus:outline-none"
        data-placeholder={placeholder}
      />
    </div>
  );
}
