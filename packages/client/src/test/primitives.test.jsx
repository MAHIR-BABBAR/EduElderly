import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Trail } from '@/components/ui/trail';
import { FilterChip } from '@/components/ui/chip';
import { SegmentedControl } from '@/components/ui/segmented';
import { AnswerTile } from '@/components/ui/answer-tile';
import { SkyBand } from '@/components/ui/sky-band';
import { Meter } from '@/components/ui/meter';
import { SearchField } from '@/components/ui/search-field';
import { Bento, BentoTile } from '@/components/ui/bento';
import { plural, hours, price, relativeDay, greeting, daypart, firstName } from '@/lib/format';

describe('format helpers', () => {
  it('pluralises counts', () => {
    expect(plural(1, 'lesson')).toBe('1 lesson');
    expect(plural(3, 'lesson')).toBe('3 lessons');
    expect(plural(2, 'quiz')).toBe('2 quizzes');
    expect(plural(0, 'course')).toBe('0 courses');
  });

  it('phrases hours for a person, not a database', () => {
    expect(hours(0)).toBe('Self-paced');
    expect(hours(0.5)).toBe('Under an hour');
    expect(hours(1)).toBe('About 1 hour');
    expect(hours(3.4)).toBe('About 3 hours');
  });

  it('formats price with Free for zero', () => {
    expect(price(0)).toBe('Free');
    expect(price(9.99, 'USD', 'en-US')).toBe('$9.99');
  });

  it('describes days relative to now', () => {
    const now = new Date(2026, 8, 20, 12);
    expect(relativeDay(new Date(2026, 8, 20, 8), now)).toBe('today');
    expect(relativeDay(new Date(2026, 8, 19), now)).toBe('yesterday');
    expect(relativeDay(new Date(2026, 8, 17), now)).toBe('3 days ago');
    expect(relativeDay(new Date(2026, 2, 4), now)).toMatch(/^on 4 March/);
    expect(relativeDay('nonsense', now)).toBe('');
  });

  it('greets and picks a daypart by hour', () => {
    expect(greeting(7)).toBe('Good morning');
    expect(greeting(13)).toBe('Good afternoon');
    expect(greeting(19)).toBe('Good evening');
    expect(greeting(23)).toBe('Good night');
    expect(daypart(6)).toBe('dawn');
    expect(daypart(12)).toBe('day');
    expect(daypart(18)).toBe('dusk');
    expect(daypart(2)).toBe('night');
    expect(firstName('Margaret Jones')).toBe('Margaret');
  });
});

describe('Trail', () => {
  const items = [
    { id: 'a', title: 'Getting started', state: 'done', href: '/learn/1?topic=a' },
    { id: 'b', title: 'Gentle exercise', state: 'current', href: '/learn/1?topic=b' },
    { id: 'c', title: 'Sleep', state: 'upcoming', href: '/learn/1?topic=c' },
    { id: 'd', title: 'Quiz', state: 'locked' },
  ];

  it('marks the current step, names each state in text, and locks without a link', () => {
    render(
      <MemoryRouter>
        <Trail items={items} label="Course lessons" />
      </MemoryRouter>,
    );
    expect(screen.getByRole('list', { name: 'Course lessons' })).toBeInTheDocument();
    const current = screen.getByRole('link', { name: /Gentle exercise/ });
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('You are here')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Quiz/ })).toBeNull();
  });
});

describe('FilterChip', () => {
  it('is a pressable button that reports its state', async () => {
    const onPressedChange = vi.fn();
    render(<FilterChip pressed={false} onPressedChange={onPressedChange}>Health</FilterChip>);
    const chip = screen.getByRole('button', { name: 'Health' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(onPressedChange).toHaveBeenCalledWith(true);
  });
});

describe('SegmentedControl', () => {
  const options = [
    { value: 'default', label: 'Default' },
    { value: 'large', label: 'Large' },
    { value: 'huge', label: 'Huge' },
  ];

  it('is a radiogroup where arrow keys move the selection', async () => {
    const onValueChange = vi.fn();
    render(<SegmentedControl label="Text size" value="default" options={options} onValueChange={onValueChange} />);
    const group = screen.getByRole('radiogroup', { name: 'Text size' });
    expect(group).toBeInTheDocument();
    const first = screen.getByRole('radio', { name: 'Default' });
    expect(first).toHaveAttribute('aria-checked', 'true');
    first.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onValueChange).toHaveBeenCalledWith('large');
  });
});

describe('AnswerTile', () => {
  it('shows result state as text, not colour alone', () => {
    render(
      <AnswerTile letter="A" name="q1" value={0} state="correct" selected disabled>
        Dry mouth
      </AnswerTile>,
    );
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByRole('radio')).toBeChecked();
  });
});

describe('SkyBand', () => {
  it('picks a daypart from the hour and renders children on the scrim', () => {
    const { container } = render(<SkyBand hour={19}><h1>Good evening</h1></SkyBand>);
    expect(container.firstChild).toHaveAttribute('data-daypart', 'dusk');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good evening');
  });
});

describe('Meter', () => {
  it('speaks the value in lessons, not percent, when a noun is given', () => {
    render(<Meter value={2} max={5} noun="lesson" label="Course progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Course progress' });
    expect(bar).toHaveAttribute('aria-valuetext', '2 of 5 lessons');
    expect(bar).toHaveAttribute('aria-valuenow', '2');
  });
});

describe('SearchField', () => {
  it('has a visible label and a named clear button once there is text', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<SearchField label="Find a course" value="" onChange={onChange} />);
    expect(screen.getByLabelText('Find a course')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
    rerender(<SearchField label="Find a course" value="walk" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onChange).toHaveBeenCalledWith('');
  });
});

describe('Bento', () => {
  it('renders tiles on a grid', () => {
    render(
      <Bento animate={false}>
        <BentoTile span="wide" animate={false}>Continue</BentoTile>
        <BentoTile tone="night" animate={false}>Streak</BentoTile>
      </Bento>,
    );
    expect(screen.getByText('Continue')).toBeInTheDocument();
    expect(screen.getByText('Streak').className).toContain('bg-brand-night');
  });
});
