'use babel';

const TYPING_INTERVALS = [60, 120, 180];

export const getRandomInterval = () =>
  TYPING_INTERVALS[Math.floor(Math.random() * TYPING_INTERVALS.length)];
