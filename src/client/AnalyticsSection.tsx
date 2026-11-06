import { useEffect, useMemo, useState } from 'react'
import type {
  ClientContextLike,
  LocaleSeat,
  SessionListState,
} from './harness-types.ts'

const PANEL = 'dsh-deep-analytics'
const INPUT_RATE = 0.14
const CACHE_READ_RATE = 0.014
const CACHE_WRITE_RATE = 0.14
const OUTPUT_RATE = 0.28

export interface AnalyticsIconProps { size?: number; active?: boolean }

export function AnalyticsIcon(props: AnalyticsIconProps = {}) {
  const size = props.size ?? 18
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  )
}

interface InfoResponse {
  name: string
  pluginCount: number
  model: string
  skills: string[]
}

interface TokenBuckets {
  uncachedInputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

interface ConversationStat {
  id: string
  title: string
  time: number
  created: number
  buckets: TokenBuckets
  tokens: number
  turns: number
  steps: number
  model: string
  durationMs: number
}

interface AnalyticsSectionProps {
  t: LocaleSeat['t']
  sessions: ClientContextLike['sessions']
}

function emptyBuckets(): TokenBuckets {
  return { uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
}

function bucketsOf(projection: any): TokenBuckets {
  const value = projection?.values?.tokenUsage
  if (!value) return emptyBuckets()
  return {
    uncachedInputTokens: Number(value.uncachedInputTokens ?? 0),
    outputTokens: Number(value.outputTokens ?? 0),
    cacheReadTokens: Number(value.cacheReadTokens ?? 0),
    cacheWriteTokens: Number(value.cacheWriteTokens ?? 0),
  }
}

function sumTokens(b: TokenBuckets): number {
  return b.uncachedInputTokens + b.outputTokens + b.cacheReadTokens + b.cacheWriteTokens
}

function sessionTime(summary: any): number {
  const raw = summary?.updatedAt ?? summary?.lastUpdatedAt ?? summary?.time
  const parsed = typeof raw === 'number' ? raw : (raw ? Date.parse(raw) : NaN)
  return Number.isFinite(parsed) ? parsed : Date.now()
}

function sessionCreated(summary: any): number {
  const raw = summary?.createdAt ?? summary?.created ?? summary?.updatedAt ?? summary?.time
  const parsed = typeof raw === 'number' ? raw : (raw ? Date.parse(raw) : NaN)
  return Number.isFinite(parsed) ? parsed : sessionTime(summary)
}

function sessionTitle(summary: any, id: string): string {
  return String(summary?.title ?? summary?.name ?? id.slice(0, 8))
}

function sessionModel(summary: any, projection: any, fallback: string): string {
  const value =
    projection?.values?.model ??
    projection?.values?.defaultModel ??
    summary?.model ??
    summary?.defaultModel ??
    summary?.provider ??
    ''
  return value ? String(value) : fallback
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function money(value: number): string {
  return `$${value.toFixed(4)}`
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(Math.round(value))
}

function formatMs(value: number): string {
  if (value >= 3_600_000) return `${(value / 3_600_000).toFixed(1)}h`
  if (value >= 60_000) return `${(value / 60_000).toFixed(1)}m`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}s`
  return `${Math.round(value)}ms`
}

function longestStreak(days: string[]): number {
  if (days.length === 0) return 0
  const sorted = [...new Set(days)].sort()
  let best = 1
  let cur = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00')
    const next = new Date(sorted[i] + 'T00:00:00')
    const diff = (next.getTime() - prev.getTime()) / 86_400_000
    if (diff === 1) {
      cur += 1
      best = Math.max(best, cur)
    } else if (diff > 1) {
      cur = 1
    }
  }
  return best
}

function currentStreak(days: string[]): number {
  if (days.length === 0) return 0
  const set = new Set(days)
  let cur = 0
  const d = new Date()
  // allow starting from today or yesterday
  for (let shift = 0; shift < 2; shift++) {
    const probe = new Date(d.getTime() - shift * 86_400_000)
    if (set.has(dayKey(probe.getTime()))) { cur = 1; break }
  }
  if (cur === 0) return 0
  let day = new Date(d.getTime() - (cur === 1 && !set.has(dayKey(d.getTime())) ? 86_400_000 : 0))
  // walk backwards
  let probeDate = set.has(dayKey(d.getTime())) ? d : new Date(d.getTime() - 86_400_000)
  cur = set.has(dayKey(probeDate.getTime())) ? 1 : 0
  while (true) {
    const prev = new Date(probeDate.getTime() - 86_400_000)
    if (set.has(dayKey(prev.getTime()))) {
      cur += 1
      probeDate = prev
    } else {
      break
    }
  }
  return cur
}

export function AnalyticsSection({ t, sessions }: AnalyticsSectionProps) {
  const [listState, setListState] = useState<SessionListState>(() => sessions.list.getSnapshot() as any)
  const [info, setInfo] = useState<InfoResponse | null>(null)
  const [activityFilter, setActivityFilter] = useState<'daily' | 'weekly' | 'monthly' | 'cumulative'>('daily')

  useEffect(() => {
    const refresh = () => setListState(sessions.list.getSnapshot() as any)
    refresh()
    const unsubscribe = sessions.list.subscribe(refresh)
    sessions.refresh().catch(() => undefined)
    return unsubscribe
  }, [sessions])

  useEffect(() => {
    const ids = listState.ids as readonly string[]
    ids.forEach((id) => {
      const snapshot = listState.projectionsBySession?.[id]
      if (!snapshot || snapshot.state !== 'ready') {
        sessions.refreshProjections(id).catch(() => undefined)
      }
    })
  }, [listState.ids, sessions])

  useEffect(() => {
    let active = true
    fetch('/dsh-deep-analytics/info', { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((data) => { if (active) setInfo(data as InfoResponse) })
      .catch(() => undefined)
    return () => { active = false }
  }, [])

  const conversations: ConversationStat[] = useMemo(() => (listState.ids as readonly string[]).map((id) => {
    const summary = listState.byId?.[id]
    const projection = listState.projectionsBySession?.[id]
    const buckets = bucketsOf(projection)
    const tokens = sumTokens(buckets)
    const created = sessionCreated(summary)
    const time = sessionTime(summary)
    const sessionStats = projection?.values?.sessionStats ?? summary?.projectionValues?.sessionStats ?? summary?.sessionStats ?? {}
    const duration = (Number(sessionStats?.llmMs ?? 0) + Number(sessionStats?.toolMs ?? 0)) || Math.max(0, time - created)
    const turnsRaw = sessionStats?.turns ?? 0
    const stepsRaw = sessionStats?.steps ?? 0
    return {
      id,
      title: sessionTitle(summary, id),
      time,
      created,
      buckets,
      tokens,
      turns: Number(turnsRaw) || 0,
      steps: Number(stepsRaw) || 0,
      model: sessionModel(summary, projection, info?.model ?? 'Unknown'),
      durationMs: duration,
    }
  }), [listState, info?.model])

  const totalTurns = conversations.reduce((sum, c) => sum + c.turns, 0)
  const totalSteps = conversations.reduce((sum, c) => sum + c.steps, 0)
  const totalTokens = conversations.reduce((sum, c) => sum + c.tokens, 0)
  const peakTokens = conversations.reduce((max, c) => Math.max(max, c.tokens), 0)
  let longestTask = conversations.reduce((max, c) => Math.max(max, c.durationMs), 0)
  const timestamps = conversations.map((c) => c.time).filter((value) => Number.isFinite(value))
  const firstTime = timestamps.length ? Math.min(...timestamps) : 0
  const lastTime = timestamps.length ? Math.max(...timestamps) : 0
  const totalSpanMs = Math.max(1, lastTime - firstTime)
  if (longestTask <= 0) longestTask = totalSpanMs
  const totalDurationMs = conversations.reduce((sum, c) => sum + c.durationMs, 0) > 0 ? conversations.reduce((sum, c) => sum + c.durationMs, 0) : totalSpanMs

  const totalDecodeTokens = conversations.reduce((sum, c) => sum + (Number((listState.byId?.[c.id]?.projectionValues ?? listState.projectionsBySession?.[c.id]?.values)?.sessionStats?.decodeTokens ?? 0)), 0)
  const totalDecodeMs = conversations.reduce((sum, c) => sum + (Number((listState.byId?.[c.id]?.projectionValues ?? listState.projectionsBySession?.[c.id]?.values)?.sessionStats?.decodeMs ?? 0)), 0)
  const avgTokPerSec = totalDecodeMs > 0 ? totalDecodeTokens / (totalDecodeMs / 1000) : 0
  const totalCacheRead = conversations.reduce((s, c) => s + c.buckets.cacheReadTokens, 0)
  const totalUncached = conversations.reduce((s, c) => s + c.buckets.uncachedInputTokens, 0)
  const cacheHit = totalCacheRead + totalUncached > 0 ? (totalCacheRead / (totalCacheRead + totalUncached)) * 100 : 0

  const durations = conversations.filter((c) => c.durationMs > 0)

  const days = conversations.map((c) => dayKey(c.time))
  const ls = longestStreak(days)
  const cs = currentStreak(days)

  // model aggregation
  const modelCounts: Record<string, number> = {}
  conversations.forEach((c) => {
    const key = c.model || (info?.model ?? 'Unknown')
    modelCounts[key] = (modelCounts[key] ?? 0) + c.tokens
  })
  const models = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])
  const totalModelTokens = models.reduce((s, m) => s + m[1], 0) || 1

  // tasks timeline (last 40 by token)
  const timeline = [...conversations].sort((a, b) => a.time - b.time).slice(-40)
  const maxTimeline = Math.max(1, ...timeline.map((c) => c.tokens))

  // heatmap (last 52 weeks)
  const countsByDay: Record<string, number> = {}
  conversations.forEach((c) => {
    const k = dayKey(c.time)
    countsByDay[k] = (countsByDay[k] ?? 0) + 1
  })
  const maxDayCount = Math.max(1, ...Object.values(countsByDay))
  const today = new Date()
  const cells: { date: string; count: number; level: number }[] = []
  for (let i = 52 * 7 - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000)
    const k = dayKey(d.getTime())
    const count = countsByDay[k] ?? 0
    const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxDayCount) * 4))
    cells.push({ date: k, count, level })
  }

  const weekCounts = Array(53).fill(0);
  cells.forEach((cell, idx) => { weekCounts[Math.floor(idx / 7)] += cell.count; });
  const maxWeekCount = Math.max(1, ...weekCounts);

  const monthCounts = Array(12).fill(0);
  conversations.forEach((c) => { monthCounts[new Date(c.time).getMonth()] += 1; });
  const maxMonthCount = Math.max(1, ...monthCounts);

  let cumulativeRunning = 0;
  const cumulativeDayCounts = cells.map((cell) => {
    cumulativeRunning += cell.count;
    return cumulativeRunning;
  });
  const cumulativeTotal = cumulativeDayCounts.length ? cumulativeDayCounts[cumulativeDayCounts.length - 1] : 1;

  const months = monthCounts.map((count, idx) => ({ label: new Date(2024, idx, 1).toLocaleString('en', { month: 'short' }), count, level: count === 0 ? 0 : Math.min(4, Math.ceil((count / maxMonthCount) * 4)) }));
  const monthLabels = Array(53).fill('');
  let previousMonth = '';
  for (let w = 0; w < 53; w++) {
    const weekStart = new Date(today.getTime() - (52 - w) * 7 * 86400000);
    const label = weekStart.toLocaleString('en', { month: 'short' });
    if (label !== previousMonth) { monthLabels[w] = label; previousMonth = label; }
  }

  const activityCells = cells.map((cell, idx) => {
    const weekCount = weekCounts[Math.floor(idx / 7)];
    const monthCount = monthCounts[new Date(cell.date + 'T00:00:00').getMonth()];
    const cumulativeCount = cumulativeDayCounts[idx];
    let count = cell.count;
    let maxForLevel = Math.max(1, ...cells.map((x) => x.count));
    if (activityFilter === 'weekly') { count = weekCount; maxForLevel = maxWeekCount; }
    if (activityFilter === 'monthly') { count = monthCount; maxForLevel = maxMonthCount; }
    if (activityFilter === 'cumulative') { count = cumulativeCount; maxForLevel = cumulativeTotal; }
    const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / maxForLevel) * 4));
    return { ...cell, count, level };
  });

  const activeCells = activityCells;
  const activeColumns = 53;
  const activeAspect = '1 / 1';

  const skills: string[] = info?.skills ?? []
  const pluginCount = info?.pluginCount ?? 0
  const name = info?.name ?? 'User'

  // insights
  const insights: string[] = []
  if (conversations.length > 0) {
    insights.push(`You have ${conversations.length} conversations with ${formatTokens(totalTokens)} total tokens.`)
    insights.push(`Average cache hit is ${cacheHit.toFixed(1)}%, indicating ${cacheHit > 50 ? 'strong' : 'moderate'} reuse of cached tokens.`)
    insights.push(`Your longest streak is ${ls} day${ls === 1 ? '' : 's'}; current streak is ${cs} day${cs === 1 ? '' : 's'}.`)
    if (models.length > 0) insights.push(`Most-used model is ${models[0][0]} with ${formatTokens(models[0][1])} tokens.`)
    if (totalTurns > 0) insights.push(`Average ${ (totalTokens / Math.max(1, totalTurns)).toFixed(0) } tokens per turn.`)
    if (longestTask > 0) insights.push(`Longest task took ${formatMs(longestTask)}.`)
  } else {
    insights.push('No activity yet. Start a conversation to see analytics.')
  }

  return (
    <div className='da-section' style={{ width: '100%', maxHeight: '100vh', overflowY: 'auto', overflowX: 'hidden', paddingBottom: 48 }}>
      <link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css' />
      <div className='da-header'>
        <div className='da-greeting'>{t('greeting', { name })}</div>
        <h1>{t('title')}</h1>
        <p>{t('intro')}</p>
      </div>

      <div className='da-grid'>
        <div className='da-card'><div className='label'><i className='bi bi-chat-dots' /> {t('card.turns')}</div><div className='value'>{totalTurns.toLocaleString()}</div><div className='sub'>{conversations.length} conversations</div></div>
        <div className='da-card'><div className='label'><i className='bi bi-lightning' /> {t('card.toks')}</div><div className='value'>{avgTokPerSec.toFixed(1)}</div><div className='sub'>decode tokens per second</div></div>
        <div className='da-card'><div className='label'><i className='bi bi-list-check' /> {t('card.steps')}</div><div className='value'>{totalSteps.toLocaleString()}</div><div className='sub'>across all turns</div></div>
        <div className='da-card'><div className='label'><i className='bi bi-infinity' /> {t('card.tokens')}</div><div className='value'>{formatTokens(totalTokens)}</div><div className='sub'>{totalTokens.toLocaleString()} tokens</div></div>
        <div className='da-card'><div className='label'><i className='bi bi-database' /> {t('card.cache')}</div><div className='value'>{cacheHit.toFixed(1)}%</div><div className='sub'>cache read / input</div></div>
        <div className='da-card'><div className='label'><i className='bi bi-graph-up-arrow' /> {t('card.peak')}</div><div className='value'>{formatTokens(peakTokens)}</div><div className='sub'>{peakTokens.toLocaleString()} tokens</div></div>
        <div className='da-card'><div className='label'><i className='bi bi-clock-history' /> {t('card.longestTask')}</div><div className='value'>{formatMs(longestTask)}</div><div className='sub'>single task</div></div>
        <div className='da-card'><div className='label'><i className='bi bi-calendar-check' /> {t('card.longestStreak')}</div><div className='value'>{ls}</div><div className='sub'>days</div></div>
        <div className='da-card'><div className='label'><i className='bi bi-fire' /> {t('card.currentStreak')}</div><div className='value'>{cs}</div><div className='sub'>days</div></div>
      </div>

      <div className='da-panel'>
        <h3>{t('heatmap.title')}</h3>
        <div className='sub'>{t('heatmap.sub')}</div>
        {conversations.length === 0 ? (
          <div className='da-empty'>{t('activity.empty')}</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {['daily', 'weekly', 'monthly', 'cumulative'].map((filter) => (
                <button
                  key={filter}
                  type='button'
                  onClick={() => setActivityFilter(filter as any)}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    borderRadius: 6,
                    border: '1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.15))',
                    background: activityFilter === filter ? 'rgba(110,168,254,.25)' : 'transparent',
                    color: 'inherit',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className='da-heatmap' style={{ gridTemplateColumns: `repeat(${activeColumns}, 1fr)` }}>
              {activeCells.map((cell: any, idx: number) => (
                <div
                  key={idx}
                  className={`da-heatmap-cell ${cell.level > 0 ? `l${cell.level}` : ''}`}
                  style={{ aspectRatio: activeAspect }}
                  title={`${cell.label ?? cell.date ?? idx}: ${cell.count}`}
                />
              ))}
            </div>
            {activityFilter !== 'monthly' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(53, 1fr)', gap: 3, marginTop: 4, fontSize: 10, opacity: 0.65 }}>
                {monthLabels.map((label: string, idx: number) => (
                  <div key={idx} style={{ textAlign: 'center', whiteSpace: 'nowrap', overflow: 'visible' }}>{label}</div>
                ))}
              </div>
            )}
            {activityFilter === 'monthly' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, marginTop: 4, fontSize: 10, opacity: 0.65 }}>
                {months.map((m: any, idx: number) => (
                  <div key={idx} style={{ textAlign: 'center' }}>{m.label}</div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className='da-two'>
        <div className='da-panel'>
          <h3>{t('models.title')}</h3>
          <div className='sub'>Token usage by model</div>
          {models.length === 0 || totalModelTokens <= 1 ? (
            <div className='da-empty'>{t('models.empty')}</div>
          ) : (
            <div className='da-pie-wrap'>
              <div
                className='da-pie'
                style={{
                  background: `conic-gradient(${models.map((m, i) => {
                    const colors = ['#6ea8fe', '#247bbf', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96']
                    const start = (models.slice(0, i).reduce((s, x) => s + x[1], 0) / totalModelTokens) * 360
                    const end = start + (m[1] / totalModelTokens) * 360
                    return `${colors[i % colors.length]} ${start}deg ${end}deg`
                  }).join(', ')})`,
                }}
              />
              <div className='da-legend'>
                {models.map((m, i) => {
                  const colors = ['#6ea8fe', '#247bbf', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96']
                  return (
                    <span key={m[0]}>
                      <span className='da-dot' style={{ background: colors[i % colors.length] }} />
                      {m[0]} - {((m[1] / totalModelTokens) * 100).toFixed(1)}% ({formatTokens(m[1])})
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className='da-panel'>
          <h3>{t('skills.title')}</h3>
          <div className='sub'>{skills.length > 0 ? 'Configured skills' : 'Skills discovered from your environment'}</div>
          {skills.length === 0 ? (
            <div className='da-empty'>{t('skills.empty')}</div>
          ) : (
            skills.map((skill, idx) => (
              <div className='da-bar-row' key={`${skill}-${idx}`}>
                <div className='da-bar-label'>{skill}</div>
                <div className='da-bar-track'>
                  <div className='da-bar-fill' style={{ width: `${100 - idx * 12}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className='da-panel'>
        <h3>{t('timeline.title')}</h3>
        <div className='sub'>Tokens per conversation over time</div>
        {timeline.length === 0 || totalTokens === 0 ? (
          <div className='da-empty'>{t('timeline.empty')}</div>
        ) : (
          <div className='da-timeline'>
            {timeline.map((item) => {
              const height = Math.max(4, (item.tokens / maxTimeline) * 120)
              const date = new Date(item.time)
              const label = `${date.getMonth() + 1}/${date.getDate()}`
              return (
                <div className='da-bar-wrap' key={item.id}>
                  <div className='da-bar' style={{ height: `${height}px` }} title={`${item.title}: ${item.tokens} tokens`} />
                  <div className='da-bar-label'>{label}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className='da-panel'>
        <h3>{t('insights.title')}</h3>
        <div className='da-insights'>
          {insights.map((line, idx) => (
            <div className='da-insight' key={idx}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

