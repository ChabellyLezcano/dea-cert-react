// src/guide/components/MermaidDiagram.tsx
import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '../../shared/theme/useTheme';

interface MermaidDiagramProps {
  /** Raw mermaid diagram definition, e.g. "flowchart LR\nA-->B" */
  chart: string;
}

/** Renders a mermaid diagram as SVG. The chart source comes from
 * developer-authored seed content stored in Supabase (see
 * scripts/seed.ts) — never from arbitrary user input — so injecting the
 * library's own trusted SVG output via dangerouslySetInnerHTML is safe
 * here, unlike rendering untrusted HTML. */
export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const { resolvedTheme } = useTheme();
  const diagramId = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      fontFamily: 'Poppins, system-ui, sans-serif',
      securityLevel: 'strict',
    });

    mermaid
      .render(`mermaid-${diagramId}`, chart)
      .then(({ svg: renderedSvg }) => {
        if (isMounted) setSvg(renderedSvg);
      })
      .catch((error: unknown) => {
        if (isMounted) setRenderError(error instanceof Error ? error.message : 'Could not render diagram');
      });

    return () => {
      isMounted = false;
    };
  }, [chart, diagramId, resolvedTheme]);

  if (renderError) {
    return (
      <div className="my-3 rounded-xl border border-ko-100 bg-ko-100 p-3 text-xs text-ko-600">
        Could not render this diagram: {renderError}
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        className="my-3 flex h-32 items-center justify-center rounded-xl border border-dashed border-ink-200 text-xs text-ink-400"
        role="status"
      >
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      className="my-3 overflow-x-auto rounded-xl border border-ink-100 bg-surface p-4"
      // Trusted SVG from our own mermaid.render() call, see component doc comment above.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
