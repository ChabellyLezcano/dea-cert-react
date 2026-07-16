// src/guide/GuidePage.tsx
import { useMemo, useState } from 'react';
import { TopicSidebar } from './components/TopicSidebar';
import { TopicContent } from './components/TopicContent';
import { useStudyTopics } from './hooks/useStudyTopics';
import { InlineSpinner } from '../shared/components/InlineSpinner';
import { normalizeText } from '../shared/utils/text';

export function GuidePage() {
  const { topics, isLoading, error } = useStudyTopics();
  const [search, setSearch] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  // Default to the first topic once the guide finishes loading, using
  // React's "adjust state while rendering" pattern (see QuizPage for the
  // same technique) instead of an effect, since this only needs to run
  // once when `topics` actually changes.
  const [syncedTopics, setSyncedTopics] = useState(topics);
  if (topics !== syncedTopics) {
    setSyncedTopics(topics);
    if (!selectedTopicId && topics.length > 0) {
      setSelectedTopicId(topics[0].id);
    }
  }

  const filteredTopics = useMemo(() => {
    const term = normalizeText(search.trim());
    if (!term) return topics;
    return topics.filter((topic) => normalizeText(`${topic.title} ${topic.summary}`).includes(term));
  }, [topics, search]);

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === selectedTopicId) ?? null,
    [topics, selectedTopicId],
  );

  if (isLoading) {
    return <InlineSpinner label="Loading the study guide from the database..." />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-ko-100 bg-surface p-6 text-sm text-ko-600" role="alert">
        Could not load the study guide: {error}. Make sure the <code>study_topics</code> table has been
        created and seeded (see the README).
      </div>
    );
  }

  if (!topics.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-surface p-10 text-center text-sm text-ink-500">
        No study guide topics yet. Run <code>npm run db:seed</code> to load them.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={2}
            stroke="currentColor"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search topics… (Auto Loader, MERGE INTO, Unity Catalog…)"
            aria-label="Search study guide topics"
            className="w-full rounded-xl border border-ink-200 bg-surface py-2.5 pl-10 pr-3.5 text-sm text-ink-800 shadow-sm placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <TopicSidebar
          topics={filteredTopics}
          selectedTopicId={selectedTopicId}
          onSelectTopic={setSelectedTopicId}
        />
      </div>

      <div className="min-w-0 flex-1">
        {selectedTopic ? (
          <TopicContent topic={selectedTopic} />
        ) : (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-surface p-10 text-center text-sm text-ink-500">
            No topics match "{search}".
          </div>
        )}
      </div>
    </div>
  );
}
