import type { ClientContextLike } from './harness-types.ts'
import { AnalyticsSection, AnalyticsIcon } from './AnalyticsSection.tsx'
import { en, NS } from './locales.ts'
import { SECTION_STYLES } from './styles.ts'

export const PANEL_ID = 'deep-analytics'

export const inject = ['sessions', 'slots', 'locale']

export function apply(ctx: any): void {
  ctx.effect(() => ctx.locale.register(NS, { en }), 'analytics: dictionaries')

  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-deep-analytics'
    tag.dataset.pluginCss = 'dsh-deep-analytics/section.css'
    tag.textContent = SECTION_STYLES
    document.head.appendChild(tag)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css'
    link.dataset.plugin = 'dsh-deep-analytics'
    document.head.appendChild(link)
    return () => { tag.remove(); link.remove() }
  }, 'analytics: stylesheet')

  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 5,
    label: () => ctx.locale.bind(NS)('nav'),
  }, AnalyticsIcon))

  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
    inject: () => ({
      sessions: ctx.sessions,
      fetchInfo: () => fetch('/dsh-deep-analytics/info', { credentials: 'same-origin' }).then((response) => response.json()),
    }),
  }, AnalyticsSection))
}