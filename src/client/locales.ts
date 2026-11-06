export const NS = 'deepAnalytics'

export const en = {
  nav: 'Analytics',
  title: 'Deep Analytics',
  intro: 'A full-fledged view of your work in DeepSeek Harness: turns, tokens, activity, models, and insights.',
  greeting: 'Hello, {name}',
  'card.turns': 'Total turns',
  'card.steps': 'Total steps',
  'card.toks': 'Average tok/s',
  'card.tokens': 'Lifetime tokens',
  'card.cache': 'Average cache hit',
  'card.peak': 'Peak tokens in a turn',
  'card.longestTask': 'Longest task time',
  'card.longestStreak': 'Longest streak days',
  'card.currentStreak': 'Current streak days',
  'card.plugins': 'Plugins installed',
  'heatmap.title': 'Task activity',
  'heatmap.sub': 'Contributions over the last year',
  'models.title': 'Models used',
  'skills.title': 'Top skills used',
  'insights.title': 'Insights',
  'timeline.title': 'Token usage over time',
  'models.empty': 'No model data yet.',
  'skills.empty': 'No skill data yet.',
  'timeline.empty': 'No token usage data yet.',
  'activity.empty': 'No activity yet.',
} as const

export type DeepAnalyticsKey = keyof typeof en