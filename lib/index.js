import os from "node:os";

//#region src/index.ts
const inject = [
	"webServer",
	"configEditor",
	"agentDefaultModel",
	"sessionSkillCatalog",
	"agentPresets",
	"skills"
];
function apply(ctx) {
	ctx.inject([
		"webServer",
		"configEditor",
		"agentDefaultModel",
		"sessionSkillCatalog",
		"agentPresets",
		"skills"
	], (scope) => {
		const sendJson = (res, status, value) => {
			const body = JSON.stringify(value);
			res.writeHead(status, {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			});
			res.end(body);
		};
		const trySkillCatalog = async () => {
			const skills = [];
			let raw = null;
			let error = null;
			try {
				const catalog = scope.sessionSkillCatalog;
				if (!catalog?.list) {
					error = "sessionSkillCatalog unavailable";
					return {
						skills,
						raw,
						error
					};
				}
				let sessionId;
				try {
					const sessions = scope.sessions?.list?.() ?? [];
					sessionId = Array.isArray(sessions) && sessions.length ? String(sessions[0]?.id ?? sessions[0]) : void 0;
				} catch {
					sessionId = void 0;
				}
				const requests = [
					sessionId ? { session: sessionId } : null,
					sessionId ? { sessionId } : null,
					sessionId ? { session: { id: sessionId } } : null,
					sessionId ? { target: sessionId } : null,
					{}
				].filter(Boolean);
				let lastErr = null;
				for (const request of requests) try {
					raw = await catalog.list(request, new AbortController().signal);
					const list = raw?.items ?? raw?.skills ?? raw?.entries ?? raw?.value ?? raw?.catalog ?? [];
					const flattened = Array.isArray(list) ? list : Object.values(list ?? {});
					for (const item of flattened) {
						const label = item?.name ?? item?.title ?? item?.id ?? item?.skill;
						if (label) skills.push(String(label));
					}
					if (skills.length) break;
					lastErr = null;
				} catch (cause) {
					lastErr = cause;
				}
				if (!skills.length) try {
					const registry = scope.skills;
					if (registry?.list) {
						const registrySkills = await registry.list({});
						const list = Array.isArray(registrySkills) ? registrySkills : registrySkills?.items ?? registrySkills?.skills ?? [];
						for (const item of list ?? []) {
							const label = item?.name ?? item?.title ?? item?.id;
							if (label) skills.push(String(label));
						}
						if (!error) error = skills.length ? null : "no skills from registry";
					}
				} catch (cause) {
					if (!error) error = cause instanceof Error ? cause.message : String(cause);
				}
				if (!skills.length && lastErr) error = lastErr instanceof Error ? lastErr.message : String(lastErr);
			} catch (cause) {
				error = cause instanceof Error ? cause.message : String(cause);
			}
			return {
				skills: [...new Set(skills)],
				raw,
				error
			};
		};
		const tryPresets = async () => {
			const skills = [];
			let raw = null;
			let error = null;
			try {
				const presets = scope.agentPresets;
				if (presets?.list) raw = await presets.list();
				if (presets?.inspectCompositions) {
					const inventory = await presets.inspectCompositions();
					raw = inventory;
					for (const item of inventory ?? []) {
						const plugins = item?.plugins ?? item?.composition ?? [];
						for (const plugin of plugins ?? []) {
							const name = plugin?.name ?? plugin?.id;
							if (name && String(name).toLowerCase().includes("skill")) skills.push(String(name));
						}
					}
				}
			} catch (cause) {
				error = cause instanceof Error ? cause.message : String(cause);
			}
			return {
				skills,
				raw,
				error
			};
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
				const catalog = await trySkillCatalog();
				const presets = catalog.skills.length ? {
					skills: catalog.skills,
					raw: catalog.raw,
					error: catalog.error
				} : await tryPresets();
				sendJson(res, 200, {
					name: os.userInfo().username || "User",
					pluginCount,
					model,
					skills: presets.skills.length ? presets.skills : catalog.skills,
					skillCount: (presets.skills.length ? presets.skills : catalog.skills).length
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