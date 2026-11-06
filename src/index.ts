import os from 'node:os'

interface InfoResponse {
  name: string
  pluginCount: number
  model: string
  skills: string[]
}

export const inject = ['webServer', 'configEditor', 'agentDefaultModel', 'sessionSkillCatalog']

export function apply(ctx: any): void {
  ctx.inject(['webServer', 'configEditor', 'agentDefaultModel', 'sessionSkillCatalog'], (scope: any) => {
    const sendJson = (res: any, status: number, value: unknown): void => {
      const body = JSON.stringify(value)
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      })
      res.end(body)
    }

    const handler = async (req: any, res: any): Promise<void> => {
      const path = String(req.url ?? '').split('?')[0] ?? ''
      if (path === '/dsh-deep-analytics/info' && String(req.method ?? 'GET') === 'GET') {
        let pluginCount = 0
        try {
          const editor = scope.configEditor
          if (editor?.entries) pluginCount = editor.entries().length
        } catch { pluginCount = 0 }
        let model = 'Default model'
        try {
          const selection = scope.agentDefaultModel?.currentSelection?.()
          if (selection?.model) model = String(selection.model)
          else if (selection?.name) model = String(selection.name)
        } catch { /* keep default */ }
        const skills: string[] = []
        try {
          const catalog = scope.sessionSkillCatalog
          if (catalog?.list) {
            const result = await catalog.list({}, new AbortController().signal)
            const list = (result as any)?.items ?? (result as any)?.skills ?? (result as any)?.entries ?? []
            for (const item of list) {
              const label = item?.name ?? item?.title ?? item?.id
              if (label) skills.push(String(label))
            }
          }
        } catch { /* keep empty */ }
        const info: InfoResponse = {
          name: os.userInfo().username || 'User',
          pluginCount,
          model,
          skills: skills.slice(0, 8),
        }
        sendJson(res, 200, info)
        return
      }
      sendJson(res, 404, { error: { kind: 'not-found', message: `No analytics route for ${req.method ?? 'GET'} ${path}.` } })
    }

    scope.effect(() => {
      const disposer = scope.webServer.register({
        kind: 'prefix',
        path: '/dsh-deep-analytics',
        handler: (req: any, res: any) => { void handler(req, res) },
      })
      return () => disposer()
    }, 'analytics: routes')
  })
}