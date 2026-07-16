// src/guide/components/StudyMarkdown.tsx
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MermaidDiagram } from './MermaidDiagrams';

interface StudyMarkdownProps {
  content: string;
}

const components: Components = {
  h1: ({ children }) => <h1 className="mb-3 mt-6 text-xl font-bold text-ink-900 first:mt-0">{children}</h1>,
  h2: ({ children }) => (
    <h2 className="mb-2 mt-6 border-b border-ink-100 pb-1 text-lg font-bold text-ink-900 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 className="mb-2 mt-5 text-base font-bold text-brand-700">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-1 mt-4 text-sm font-bold text-ink-800">{children}</h4>,
  p: ({ children }) => <p className="mb-3 break-words leading-relaxed text-ink-700">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 text-ink-700">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1 text-ink-700">{children}</ol>,
  li: ({ children }) => <li className="break-words leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink-900">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="break-words font-medium text-brand-600 underline decoration-brand-300 underline-offset-2 hover:text-brand-700"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-6 border-ink-100" />,
  // Blockquotes are how the seed content marks "💡 Exam tip" callouts —
  // style them as a highlighted box rather than plain indented text.
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-xl border-l-4 border-accent-500 bg-accent-400/10 px-4 py-3 text-sm text-ink-700">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-xl border border-ink-100">
      <table className="w-full min-w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-ink-50">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-ink-100 px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink-500">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-ink-50 px-3 py-2 align-top text-ink-700">{children}</td>
  ),
  // The default fenced-code wrapper is unwrapped here; `code` below does
  // the actual <pre> styling once it knows whether it's a language-tagged
  // block or plain inline code, avoiding a doubled <pre><pre> nesting.
  pre: ({ children }) => <>{children}</>,
  code({ className, children }) {
    const languageMatch = /language-(\w+)/.exec(className ?? '');
    const codeText = String(children).replace(/\n$/, '');

    if (languageMatch?.[1] === 'mermaid') {
      return <MermaidDiagram chart={codeText} />;
    }

    if (languageMatch) {
      return (
        <pre className="my-3 max-w-full overflow-x-auto rounded-xl bg-ink-900 p-4 text-sm text-ink-50">
          <code className="font-mono">{codeText}</code>
        </pre>
      );
    }

    return (
      <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[0.85em] text-brand-700">
        {children}
      </code>
    );
  },
};

/** Renders study guide Markdown (GFM: tables, headings, lists, blockquote
 * "tip" callouts) with the app's own visual style, and turns fenced
 * ```mermaid blocks into rendered diagrams. */
export function StudyMarkdown({ content }: StudyMarkdownProps) {
  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
