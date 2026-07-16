// src/guide/components/TopicSidebar.tsx
import { DOMAINS } from '../../quiz/data/domains';
import type { StudyTopic } from '../../types/guide.types';

interface TopicSidebarProps {
  topics: StudyTopic[];
  selectedTopicId: string | null;
  onSelectTopic: (topicId: string) => void;
}

export function TopicSidebar({ topics, selectedTopicId, onSelectTopic }: TopicSidebarProps) {
  const grouped = DOMAINS.map((domain) => ({
    domain,
    items: topics.filter((topic) => topic.domain === domain.id).sort((a, b) => a.order - b.order),
  })).filter((group) => group.items.length > 0);

  return (
    <nav className="flex flex-col gap-3" aria-label="Study guide topics">
      {grouped.map(({ domain, items }) => (
        <div key={domain.id} className="rounded-2xl border border-ink-100 bg-surface p-3 shadow-sm">
          <h2 className="mb-2 min-w-0 break-words px-1 text-xs font-bold uppercase tracking-wide text-ink-400">
            S{domain.order} · {domain.name}
          </h2>
          <div className="flex flex-col gap-1">
            {items.map((topic) => {
              const isActive = topic.id === selectedTopicId;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => onSelectTopic(topic.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`min-w-0 rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700 shadow-sm'
                      : 'border-transparent text-ink-600 hover:border-ink-100 hover:bg-ink-50'
                  }`}
                >
                  <span className="block min-w-0 break-words">{topic.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
