import { describe, it } from 'vitest';

describe('campaign lifecycle e2e', () => {
  it.todo('admin imports students, creates a campaign, and opens enrolment');
  it.todo('a parent identifies a student, selects an eligible club, and submits successfully');
  it.todo('a club that becomes full disappears for the next eligible student');
  it.todo('admin reviews lists, runs allocation, and generates printable PDFs');
  it.todo('finalization stays blocked while unplaced students remain and unlocks after resolution or explicit exception');
  it.todo('second semester campaigns reuse first semester history and end-of-year archives stay read-only');
});
