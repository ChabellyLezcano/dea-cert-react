import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * Tracks an element's rendered height via ResizeObserver. Used to reserve
 * space below a `position: fixed` header, whose height isn't a safe
 * constant -- it can change with locale text length or when the nav wraps
 * onto a second line on narrow viewports.
 */
export function useElementHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
    });
    observer.observe(node);
    setHeight(node.getBoundingClientRect().height);

    return () => observer.disconnect();
  }, [ref]);

  return height;
}
