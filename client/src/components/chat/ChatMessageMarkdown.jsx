import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownComponents = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed text-zinc-200">
      {children}
    </p>
  ),
  h1: ({ children }) => (
    <h1 className="mb-2 mt-3 first:mt-0 text-base font-bold tracking-tight text-white">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-1.5 mt-2.5 first:mt-0 text-sm font-semibold tracking-tight text-white">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-2 first:mt-0 text-xs sm:text-sm font-semibold text-zinc-100">
      {children}
    </h3>
  ),
  ul: ({ children }) => (
    <ul className="my-2 ml-4 list-disc space-y-1 marker:text-primary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1 marker:text-primary">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-relaxed text-zinc-200 pl-0.5">
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-white">
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className="italic text-zinc-300">
      {children}
    </em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-primary/70 bg-white/5 px-3 py-1.5 rounded-r-lg text-xs italic text-zinc-300">
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !className && typeof children === 'string' && !children.includes('\n');
    if (isInline) {
      return (
        <code
          className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 font-mono text-[0.82em] text-rose-300"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={`font-mono text-xs text-zinc-200 ${className || ''}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="my-2.5 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-3 font-mono text-xs text-zinc-200 shadow-inner no-scrollbar"
      {...props}
    >
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline underline-offset-2 transition-colors hover:text-rose-400"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-2.5 border-white/10" />,
  table: ({ children }) => (
    <div className="my-2.5 overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full text-left text-xs text-zinc-300">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-white/10 bg-white/5 text-zinc-100 font-semibold">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-white/5">
      {children}
    </tbody>
  ),
  th: ({ children }) => (
    <th className="px-2.5 py-1.5 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 py-1.5">
      {children}
    </td>
  ),
};

export const ChatMessageMarkdown = memo(function ChatMessageMarkdown({ content }) {
  if (!content) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={MarkdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
});

export default ChatMessageMarkdown;
