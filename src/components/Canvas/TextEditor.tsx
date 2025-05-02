
import React, { useEffect, useRef, useState } from "react";
import { Node } from "@/types";

interface TextEditorProps {
  node: Node;
  scale: number;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  initialContent: string;
  onSubmit: (content: string) => void;
  onCancel: () => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  node,
  scale,
  position,
  dimensions,
  initialContent,
  onSubmit,
  onCancel
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState(initialContent || "");
  
  // Auto-focus and select all text when editor opens
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSubmit = () => {
    onSubmit(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
      return;
    }
    
    // Cancel on Escape
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }

    // Support tab indentation
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      // Insert tab at cursor position
      const newContent = content.substring(0, start) + "    " + content.substring(end);
      setContent(newContent);
      
      // Set cursor position after the inserted tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        }
      }, 0);
    }

    // Auto-close brackets and quotes
    const pairs: { [key: string]: string } = {
      "(": ")",
      "{": "}",
      "[": "]",
      '"': '"',
      "'": "'",
      "`": "`"
    };

    if (pairs[e.key]) {
      e.preventDefault();
      const start = textareaRef.current!.selectionStart;
      const end = textareaRef.current!.selectionEnd;
      
      // If text is selected, wrap it in the pairs
      if (start !== end) {
        const newContent = 
          content.substring(0, start) + 
          e.key + 
          content.substring(start, end) + 
          pairs[e.key] + 
          content.substring(end);
        setContent(newContent);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + 1;
            textareaRef.current.selectionEnd = end + 1;
          }
        }, 0);
      } else {
        const newContent = 
          content.substring(0, start) + 
          e.key + 
          pairs[e.key] + 
          content.substring(end);
        setContent(newContent);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 1;
          }
        }, 0);
      }
    }
  };

  return (
    <div 
      className="absolute" 
      style={{
        left: position.x,
        top: position.y,
        width: dimensions.width,
        height: dimensions.height,
        zIndex: 1000
      }}
    >
      <textarea
        ref={textareaRef}
        className="w-full h-full p-2 bg-white dark:bg-gray-800 border-2 border-primary rounded shadow-lg outline-none resize-none font-sans"
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSubmit}
        style={{
          minHeight: "100px",
          fontSize: "16px",
        }}
        placeholder="Type your text here..."
        spellCheck="true"
      />
      <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">
        Press Ctrl+Enter to confirm, Esc to cancel
      </div>
    </div>
  );
};
