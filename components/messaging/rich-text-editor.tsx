"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (plain: string, html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onKeyDown?: (e: KeyboardEvent) => void;
  className?: string;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Message…",
  disabled = false,
  onKeyDown,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[44px] max-h-32 overflow-y-auto px-3 py-2 focus:outline-none dark:prose-invert",
      },
      handleKeyDown: (_view, event) => {
        onKeyDown?.(event);
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getText(), ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getText() !== value && value === "") {
      editor.commands.clearContent();
    }
  }, [editor, value]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  return (
    <div
      className={cn(
        "flex-1 rounded-xl border-0 bg-muted/50 focus-within:ring-1 focus-within:ring-ring",
        className
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
