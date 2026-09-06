import assert from 'node:assert/strict';
import test from 'node:test';

import { areContiguousSeats, findContiguousSeats, formatShowDate, formatShowTime } from '../services/chat/chat.service.js';

test('formats shows in India Standard Time', () => {
  assert.equal(formatShowDate('2026-09-06T20:00:00.000Z'), '2026-09-07');
  assert.equal(formatShowTime('2026-09-06T12:30:00.000Z'), '18:00');
});

test('finds the first contiguous available seat group', () => {
  const seats = findContiguousSeats({ A1: 'taken', A2: 'taken', A3: 'taken' }, 2);
  assert.deepEqual(seats, ['A4', 'A5']);
});

test('rejects non-contiguous or invalid seat suggestions', () => {
  assert.equal(areContiguousSeats(['C4', 'C5']), true);
  assert.equal(areContiguousSeats(['C4', 'C6']), false);
  assert.deepEqual(findContiguousSeats({}, 6), []);
});
