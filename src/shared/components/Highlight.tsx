import { Fragment } from 'react';
import { splitByTerm } from '../utils/text';

interface HighlightProps {
  text: string;
  term: string;
}

/** Renders `text`, wrapping segments that match `term` in a <mark>. React
 * escapes text content automatically, so this is XSS-safe unlike the
 * original innerHTML-based highlighter. */
export function Highlight({ text, term }: HighlightProps) {
  const segments = splitByTerm(text, term);
  return (
    <>
      {segments.map((segment, index) => (
        <Fragment key={index}>{segment.matched ? <mark>{segment.text}</mark> : segment.text}</Fragment>
      ))}
    </>
  );
}
