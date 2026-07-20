import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Filters } from '../src/quiz/components/Filters';
import { renderWithProviders as render } from './testUtils';

describe('Filters', () => {
  it('renders one exam chip per entry in examNumbers, plus "All exams"', () => {
    render(
      <Filters
        search=""
        exam={0}
        status="all"
        examNumbers={[1, 2, 3]}
        onSearchChange={vi.fn()}
        onExamChange={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText('All exams')).toBeInTheDocument();
    expect(screen.getByText('Exam 1')).toBeInTheDocument();
    expect(screen.getByText('Exam 2')).toBeInTheDocument();
    expect(screen.getByText('Exam 3')).toBeInTheDocument();
    expect(screen.queryByText('Exam 4')).not.toBeInTheDocument();
  });

  it('calls onExamChange with the clicked exam number', async () => {
    const user = userEvent.setup();
    const onExamChange = vi.fn();
    render(
      <Filters
        search=""
        exam={0}
        status="all"
        examNumbers={[1, 2]}
        onSearchChange={vi.fn()}
        onExamChange={onExamChange}
        onStatusChange={vi.fn()}
      />,
    );

    await user.click(screen.getByText('Exam 2'));
    expect(onExamChange).toHaveBeenCalledWith(2);
  });

  it('calls onStatusChange with the clicked status', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <Filters
        search=""
        exam={0}
        status="all"
        examNumbers={[1]}
        onSearchChange={vi.fn()}
        onExamChange={vi.fn()}
        onStatusChange={onStatusChange}
      />,
    );

    await user.click(screen.getByText('Pending'));
    expect(onStatusChange).toHaveBeenCalledWith('pending');
  });

  it('calls onSearchChange as the search box is typed into', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(
      <Filters
        search=""
        exam={0}
        status="all"
        examNumbers={[]}
        onSearchChange={onSearchChange}
        onExamChange={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText(/Search questions/), 'VACUUM');
    expect(onSearchChange).toHaveBeenCalled();
  });

  it('marks the active exam and status chips', () => {
    render(
      <Filters
        search=""
        exam={2}
        status="right"
        examNumbers={[1, 2]}
        onSearchChange={vi.fn()}
        onExamChange={vi.fn()}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Exam 2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Exam 1')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Correct')).toHaveAttribute('aria-pressed', 'true');
  });
});
