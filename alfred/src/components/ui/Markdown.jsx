import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";
import  ToolBar  from "./ToolBar";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function Markdown({ message, meta_data }) {
  // normalize tool_calls from DB format to ToolBar format
//   const tools = meta_data?.tool_calls?.map(t => ({
//     name: t.tool_name,
//     input: t.tool_input,
//     status: "done"
//   })) || [];

  return (
    <div className="message">
      {/* Static tool summary from saved metadata */}
      {/* {tools.length > 0 && <ToolBar tools={tools} />} */}

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-3 leading-7 text-zinc-200">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-semibold text-white mt-5 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-white mt-3 mb-1">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="my-3 ml-4 space-y-1.5 list-disc list-outside text-zinc-200">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-3 ml-4 space-y-1.5 list-decimal list-outside text-zinc-200">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-7 pl-1">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-zinc-300">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 pl-4 border-l-2 border-zinc-600 text-zinc-400 italic">
              {children}
            </blockquote>
          ),
          code({ inline, className, children }) {
            const lang = /language-(\w+)/.exec(className || "")?.[1] || "text";
            return inline
              ? <code className="px-1.5 py-0.5 rounded text-xs font-mono bg-white/10 text-zinc-200">{children}</code>
              : <CodeBlock language={lang}>{String(children).trim()}</CodeBlock>;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-white/10">
              <Table>{children}</Table>
            </div>
          ),
          thead: ({ children }) => <TableHeader>{children}</TableHeader>,
          tbody: ({ children }) => <TableBody>{children}</TableBody>,
          tr: ({ children }) => <TableRow>{children}</TableRow>,
          th: ({ children }) => <TableHead>{children}</TableHead>,
          td: ({ children }) => <TableCell>{children}</TableCell>,
        }}
      >
        {message}
      </ReactMarkdown>
    </div>
  );
}