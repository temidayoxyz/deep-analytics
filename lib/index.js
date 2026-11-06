import os from "node:os";

//#region src/index.ts
const inject = [
	"webServer",
	"configEditor",
	"agentDefaultModel",
	"sessionSkillCatalog"
];
function apply(ctx) {
	ctx.inject([
		"webServer",
		"configEditor",
		"agentDefaultModel",
		"sessionSkillCatalog"
	], (scope) => {
		const sendJson = (res, status, value) => {
			const body = JSON.stringify(value);
			res.writeHead(status, {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			});
			res.end(body);
		};
		const handler = async (req, res) => {
			const path = String(req.url ?? "").split("?")[0] ?? "";
			if (path === "/dsh-deep-analytics/info" && String(req.method ?? "GET") === "GET") {
				let pluginCount = 0;
				try {
					const editor = scope.configEditor;
					if (editor?.entries) pluginCount = editor.entries().length;
				} catch {
					pluginCount = 0;
				}
				let model = "Default model";
				try {
					const selection = scope.agentDefaultModel?.currentSelection?.();
					if (selection?.model) model = String(selection.model);
					else if (selection?.name) model = String(selection.name);
				} catch {}
				const skills = [];
				try {
					const catalog = scope.sessionSkillCatalog;
					if (catalog?.list) {
						const result = await catalog.list({}, new AbortController().signal);
						const list = result?.items ?? result?.skills ?? result?.entries ?? [];
						for (const item of list) {
							const label = item?.name ?? item?.title ?? item?.id;
							if (label) skills.push(String(label));
						}
					}
				} catch {}
				sendJson(res, 200, {
					name: os.userInfo().username || "User",
					pluginCount,
					model,
					skills: skills.slice(0, 8)
				});
				return;
			}
			sendJson(res, 404, { error: {
				kind: "not-found",
				message: `No analytics route for ${req.method ?? "GET"} ${path}.`
			} });
		};
		scope.effect(() => {
			const disposer = scope.webServer.register({
				kind: "prefix",
				path: "/dsh-deep-analytics",
				handler: (req, res) => {
					handler(req, res);
				}
			});
			return () => disposer();
		}, "analytics: routes");
	});
}

//#endregion
export { apply, inject };