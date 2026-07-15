import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuestionCard } from '../src/quiz/components/QuestionCard';
import type { Question } from '../src/quiz/quiz.types';

const question: Question = {
  n: 1,
  d: 'ING',
  m: 0,
  q: 'What loads files incrementally from cloud storage?',
  o: ['Auto Loader', 'COPY INTO'],
  a: [0],
  x: 'Auto Loader is designed for incremental, scalable file ingestion.',
  exam: 1,
  id: 'E1Q1',
};

describe('QuestionCard', () => {
  it('calls onGrade with the picked option when a single-choice option is clicked', async () => {
    const user = userEvent.setup();
    const onGrade = vi.fn();

    render(
      <QuestionCard
        question={question}
        entry={undefined}
        searchTerm=""
        onGrade={onGrade}
        onReveal={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Auto Loader'));
    expect(onGrade).toHaveBeenCalledWith(question, [0]);
  });

  it('shows the correctness verdict and explanation once answered', () => {
    render(
      <QuestionCard
        question={question}
        entry={{ questionId: 'E1Q1', ok: true, picked: [0], revealed: false, updatedAt: 'now' }}
        searchTerm=""
        onGrade={vi.fn()}
        onReveal={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('✓ Correct')).toBeInTheDocument();
    expect(screen.getByText(/incremental, scalable file ingestion/)).toBeInTheDocument();
  });

  it('disables options once the question has been answered', () => {
    render(
      <QuestionCard
        question={question}
        entry={{ questionId: 'E1Q1', ok: false, picked: [1], revealed: false, updatedAt: 'now' }}
        searchTerm=""
        onGrade={vi.fn()}
        onReveal={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('Auto Loader').closest('button')).toBeDisabled();
    expect(screen.getByText('✗ Incorrect')).toBeInTheDocument();
  });

  it('calls onRetry with the question id when Retry is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <QuestionCard
        question={question}
        entry={{ questionId: 'E1Q1', ok: true, picked: [0], revealed: false, updatedAt: 'now' }}
        searchTerm=""
        onGrade={vi.fn()}
        onReveal={vi.fn()}
        onRetry={onRetry}
      />,
    );

    await user.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledWith('E1Q1');
  });

  it('calls onReveal when Show answer is clicked before answering', async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();
    render(
      <QuestionCard
        question={question}
        entry={undefined}
        searchTerm=""
        onGrade={vi.fn()}
        onReveal={onReveal}
        onRetry={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Show answer'));
    expect(onReveal).toHaveBeenCalledWith(question);
  });

  it('shows "Answer revealed" instead of a correctness verdict when revealed', () => {
    render(
      <QuestionCard
        question={question}
        entry={{ questionId: 'E1Q1', ok: false, picked: [], revealed: true, updatedAt: 'now' }}
        searchTerm=""
        onGrade={vi.fn()}
        onReveal={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText('Answer revealed')).toBeInTheDocument();
  });

  describe('multi-answer questions', () => {
    const multiQuestion: Question = {
      n: 2,
      d: 'TRA',
      m: 1,
      q: 'Which of the following are Delta Lake features?',
      o: ['ACID transactions', 'Time travel', 'Schema enforcement'],
      a: [0, 1],
      x: 'ACID transactions and time travel are core Delta Lake features.',
      exam: 1,
      id: 'E1Q2',
    };

    it('accumulates selections and only grades once Check selection is clicked', async () => {
      const user = userEvent.setup();
      const onGrade = vi.fn();

      render(
        <QuestionCard
          question={multiQuestion}
          entry={undefined}
          searchTerm=""
          onGrade={onGrade}
          onReveal={vi.fn()}
          onRetry={vi.fn()}
        />,
      );

      await user.click(screen.getByText('ACID transactions'));
      await user.click(screen.getByText('Time travel'));
      expect(onGrade).not.toHaveBeenCalled();

      await user.click(screen.getByText('Check selection'));
      expect(onGrade).toHaveBeenCalledWith(multiQuestion, [0, 1]);
    });

    it('toggles a selected option off when clicked twice', async () => {
      const user = userEvent.setup();
      const onGrade = vi.fn();

      render(
        <QuestionCard
          question={multiQuestion}
          entry={undefined}
          searchTerm=""
          onGrade={onGrade}
          onReveal={vi.fn()}
          onRetry={vi.fn()}
        />,
      );

      await user.click(screen.getByText('ACID transactions'));
      await user.click(screen.getByText('ACID transactions'));
      // Check selection stays disabled since nothing is selected anymore.
      expect(screen.getByText('Check selection')).toBeDisabled();
    });

    it('does not call onGrade if Check selection is clicked with nothing picked', () => {
      const onGrade = vi.fn();

      render(
        <QuestionCard
          question={multiQuestion}
          entry={undefined}
          searchTerm=""
          onGrade={onGrade}
          onReveal={vi.fn()}
          onRetry={vi.fn()}
        />,
      );

      expect(screen.getByText('Check selection')).toBeDisabled();
      expect(onGrade).not.toHaveBeenCalled();
    });
  });
});
