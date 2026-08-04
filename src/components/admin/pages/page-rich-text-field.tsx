"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  BoldIcon,
  CodeIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

type PageRichTextFieldProps = {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  dir?: "rtl";
};

type ToolName = "bold" | "italic" | "h2" | "h3" | "bulletList" | "orderedList" | "blockquote" | "code";

const TOOL_ICON: Record<ToolName, LucideIcon> = {
  bold: BoldIcon,
  italic: ItalicIcon,
  h2: Heading2Icon,
  h3: Heading3Icon,
  bulletList: ListIcon,
  orderedList: ListOrderedIcon,
  blockquote: QuoteIcon,
  code: CodeIcon,
};

const TOOL_ORDER: readonly ToolName[] = [
  "bold",
  "italic",
  "h2",
  "h3",
  "bulletList",
  "orderedList",
  "blockquote",
  "code",
];

export function PageRichTextField({ value, onChange, ariaLabel, dir }: PageRichTextFieldProps) {
  const t = useTranslations("AdminPageRichText");
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] } })],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ariaLabel,
        class:
          "prose prose-slate max-w-none min-h-40 rounded-b-lg border border-t-0 border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        ...(dir ? { dir } : {}),
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current
        ? {
            bold: current.isActive("bold"),
            italic: current.isActive("italic"),
            h2: current.isActive("heading", { level: 2 }),
            h3: current.isActive("heading", { level: 3 }),
            bulletList: current.isActive("bulletList"),
            orderedList: current.isActive("orderedList"),
            blockquote: current.isActive("blockquote"),
            code: current.isActive("code"),
          }
        : null,
  });

  if (!editor) {
    return (
      <div
        aria-hidden
        className="min-h-40 rounded-lg border border-input bg-input/30 motion-safe:animate-pulse"
      />
    );
  }

  function run(tool: ToolName) {
    const chain = editor!.chain().focus();
    switch (tool) {
      case "bold":
        chain.toggleBold().run();
        break;
      case "italic":
        chain.toggleItalic().run();
        break;
      case "h2":
        chain.toggleHeading({ level: 2 }).run();
        break;
      case "h3":
        chain.toggleHeading({ level: 3 }).run();
        break;
      case "bulletList":
        chain.toggleBulletList().run();
        break;
      case "orderedList":
        chain.toggleOrderedList().run();
        break;
      case "blockquote":
        chain.toggleBlockquote().run();
        break;
      case "code":
        chain.toggleCode().run();
        break;
    }
  }

  return (
    <div className="flex flex-col">
      <div
        role="toolbar"
        aria-label={t("toolbarLabel")}
        className="flex flex-wrap gap-1 rounded-t-lg border border-input bg-slate-50 p-1"
      >
        {TOOL_ORDER.map((tool) => {
          const Icon = TOOL_ICON[tool];
          const isActive = active?.[tool] ?? false;
          return (
            <Button
              key={tool}
              type="button"
              size="icon-sm"
              variant={isActive ? "default" : "ghost"}
              aria-pressed={isActive}
              aria-label={t(`tool.${tool}`)}
              onClick={() => run(tool)}
            >
              <Icon data-icon />
            </Button>
          );
        })}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
