// src/guide/components/TopicContent.tsx
import { DOMAIN_MAP } from '../../quiz/data/domains';
import { StudyMarkdown } from './StudyMarkdown';
import type { StudyTopic } from '../../types/guide.types';

export function TopicContent({ topic }: { topic: StudyTopic }) {
  const domain = DOMAIN_MAP[topic.domain];

  return (
    <article className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-sm sm:p-8">
      <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
        S{domain.order} · {domain.name}
      </span>
      <h1 className="mt-3 break-words text-2xl font-bold text-ink-900">{topic.title}</h1>
      <p className="mt-2 break-words text-sm text-ink-500">{topic.summary}</p>

      <div className="mt-6 border-t border-ink-100 pt-6">
        <StudyMarkdown content={topic.contentMd} />
      </div>
    </article>
  );
}
