import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Stepper } from '@/components/ui/stepper';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { CourseCover } from '@/components/ui/course-cover';

describe('ProgressRing', () => {
  it('exposes progress to assistive technology, not just visually', () => {
    render(<ProgressRing value={42} label="Course progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Course progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps values outside 0-100', () => {
    const { rerender } = render(<ProgressRing value={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    rerender(<ProgressRing value={-10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('Stepper', () => {
  const steps = ['Lessons', 'Quiz', 'Certificate'];

  it('marks the current step and describes each state in text', () => {
    render(<Stepper steps={steps} current={1} />);
    expect(screen.getByText('Lessons: completed')).toBeInTheDocument();
    expect(screen.getByText('Quiz: current')).toBeInTheDocument();
    expect(screen.getByText('Certificate: not started')).toBeInTheDocument();
  });

  it('only lets you jump back to steps you have reached', async () => {
    const onStepClick = vi.fn();
    render(<Stepper steps={steps} current={1} onStepClick={onStepClick} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[0]);
    expect(onStepClick).toHaveBeenCalledWith(0);
  });
});

describe('DataTable', () => {
  const columns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'score', header: 'Score', sortable: true, align: 'right' },
  ];
  const rows = [
    { id: '1', name: 'Bravo', score: 20 },
    { id: '2', name: 'Alpha', score: 90 },
  ];

  it('renders a semantic table with a caption', () => {
    render(<DataTable columns={columns} rows={rows} caption="Learners" />);
    const table = screen.getByRole('table', { name: 'Learners' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('sorts when a header is activated and reports the direction', async () => {
    render(<DataTable columns={columns} rows={rows} caption="Learners" />);
    const table = screen.getByRole('table');
    await userEvent.click(within(table).getByRole('button', { name: /Name/ }));

    const header = within(table).getAllByRole('columnheader')[0];
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    const firstBodyRow = within(table).getAllByRole('row')[1];
    expect(within(firstBodyRow).getByText('Alpha')).toBeInTheDocument();
  });

  it('shows an empty message instead of an empty grid', () => {
    render(<DataTable columns={columns} rows={[]} emptyMessage="No learners yet." />);
    expect(screen.getByText('No learners yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('Button', () => {
  it('announces and enforces the busy state while loading', () => {
    render(<Button loading loadingLabel="Saving…">Save</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveTextContent('Saving…');
  });

  it('does not fire while loading', async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('CourseCover', () => {
  it('renders artwork as decorative when a thumbnail exists', () => {
    const { container } = render(
      <CourseCover title="Email Basics" courseId="c1" src="https://cdn.example/x.jpg" />,
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', '');
  });

  it('falls back to a branded gradient instead of a broken image', () => {
    const { container } = render(<CourseCover title="Email Basics" courseId="c1" />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('E')).toBeInTheDocument();
  });
});
