window.__ModuleLoader__.load({ id: "dsh-deep-analytics", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");

//#region src/client/AnalyticsSection.tsx
function AnalyticsIcon(props = {}) {
	const size = props.size ?? 18;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.8",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 3v18h18" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M7 15l4-4 3 3 5-6" })]
	});
}
function emptyBuckets() {
	return {
		uncachedInputTokens: 0,
		outputTokens: 0,
		cacheReadTokens: 0,
		cacheWriteTokens: 0
	};
}
function bucketsOf(projection) {
	const value = projection?.values?.tokenUsage;
	if (!value) return emptyBuckets();
	return {
		uncachedInputTokens: Number(value.uncachedInputTokens ?? 0),
		outputTokens: Number(value.outputTokens ?? 0),
		cacheReadTokens: Number(value.cacheReadTokens ?? 0),
		cacheWriteTokens: Number(value.cacheWriteTokens ?? 0)
	};
}
function sumTokens(b) {
	return b.uncachedInputTokens + b.outputTokens + b.cacheReadTokens + b.cacheWriteTokens;
}
function sessionTime(summary) {
	const raw = summary?.updatedAt ?? summary?.lastUpdatedAt ?? summary?.time;
	const parsed = typeof raw === "number" ? raw : raw ? Date.parse(raw) : NaN;
	return Number.isFinite(parsed) ? parsed : Date.now();
}
function sessionCreated(summary) {
	const raw = summary?.createdAt ?? summary?.created ?? summary?.updatedAt ?? summary?.time;
	const parsed = typeof raw === "number" ? raw : raw ? Date.parse(raw) : NaN;
	return Number.isFinite(parsed) ? parsed : sessionTime(summary);
}
function sessionTitle(summary, id) {
	return String(summary?.title ?? summary?.name ?? id.slice(0, 8));
}
function sessionModel(summary, projection, fallback) {
	const value = projection?.values?.model ?? projection?.values?.defaultModel ?? summary?.model ?? summary?.defaultModel ?? summary?.provider ?? "";
	return value ? String(value) : fallback;
}
function dayKey(ts) {
	const d = new Date(ts);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function formatTokens(value) {
	if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
	if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
	return String(Math.round(value));
}
function formatMs(value) {
	if (value >= 36e5) return `${(value / 36e5).toFixed(1)}h`;
	if (value >= 6e4) return `${(value / 6e4).toFixed(1)}m`;
	if (value >= 1e3) return `${(value / 1e3).toFixed(1)}s`;
	return `${Math.round(value)}ms`;
}
function longestStreak(days) {
	if (days.length === 0) return 0;
	const sorted = [...new Set(days)].sort();
	let best = 1;
	let cur = 1;
	for (let i = 1; i < sorted.length; i++) {
		const prev = /* @__PURE__ */ new Date(sorted[i - 1] + "T00:00:00");
		const diff = ((/* @__PURE__ */ new Date(sorted[i] + "T00:00:00")).getTime() - prev.getTime()) / 864e5;
		if (diff === 1) {
			cur += 1;
			best = Math.max(best, cur);
		} else if (diff > 1) cur = 1;
	}
	return best;
}
function currentStreak(days) {
	if (days.length === 0) return 0;
	const set = new Set(days);
	let cur = 0;
	const d = /* @__PURE__ */ new Date();
	for (let shift = 0; shift < 2; shift++) {
		const probe = /* @__PURE__ */ new Date(d.getTime() - shift * 864e5);
		if (set.has(dayKey(probe.getTime()))) {
			cur = 1;
			break;
		}
	}
	if (cur === 0) return 0;
	d.getTime() - (cur === 1 && !set.has(dayKey(d.getTime())) ? 864e5 : 0);
	let probeDate = set.has(dayKey(d.getTime())) ? d : /* @__PURE__ */ new Date(d.getTime() - 864e5);
	cur = set.has(dayKey(probeDate.getTime())) ? 1 : 0;
	while (true) {
		const prev = /* @__PURE__ */ new Date(probeDate.getTime() - 864e5);
		if (set.has(dayKey(prev.getTime()))) {
			cur += 1;
			probeDate = prev;
		} else break;
	}
	return cur;
}
function AnalyticsSection({ t, sessions }) {
	const [listState, setListState] = (0, react.useState)(() => sessions.list.getSnapshot());
	const [info, setInfo] = (0, react.useState)(null);
	const [activityFilter, setActivityFilter] = (0, react.useState)("daily");
	(0, react.useEffect)(() => {
		const refresh = () => setListState(sessions.list.getSnapshot());
		refresh();
		const unsubscribe = sessions.list.subscribe(refresh);
		sessions.refresh().catch(() => void 0);
		return unsubscribe;
	}, [sessions]);
	(0, react.useEffect)(() => {
		listState.ids.forEach((id) => {
			const snapshot = listState.projectionsBySession?.[id];
			if (!snapshot || snapshot.state !== "ready") sessions.refreshProjections(id).catch(() => void 0);
		});
	}, [listState.ids, sessions]);
	(0, react.useEffect)(() => {
		let active = true;
		fetch("/dsh-deep-analytics/info", { credentials: "same-origin" }).then((response) => response.json()).then((data) => {
			if (active) setInfo(data);
		}).catch(() => void 0);
		return () => {
			active = false;
		};
	}, []);
	const conversations = (0, react.useMemo)(() => listState.ids.map((id) => {
		const summary = listState.byId?.[id];
		const projection = listState.projectionsBySession?.[id];
		const buckets = bucketsOf(projection);
		const tokens = sumTokens(buckets);
		const created = sessionCreated(summary);
		const time = sessionTime(summary);
		const sessionStats = projection?.values?.sessionStats ?? summary?.projectionValues?.sessionStats ?? summary?.sessionStats ?? {};
		const duration = Number(sessionStats?.llmMs ?? 0) + Number(sessionStats?.toolMs ?? 0) || Math.max(0, time - created);
		const turnsRaw = sessionStats?.turns ?? 0;
		const stepsRaw = sessionStats?.steps ?? 0;
		return {
			id,
			title: sessionTitle(summary, id),
			time,
			created,
			buckets,
			tokens,
			turns: Number(turnsRaw) || 0,
			steps: Number(stepsRaw) || 0,
			model: sessionModel(summary, projection, info?.model ?? "Unknown"),
			durationMs: duration
		};
	}), [listState, info?.model]);
	const totalTurns = conversations.reduce((sum, c) => sum + c.turns, 0);
	const totalSteps = conversations.reduce((sum, c) => sum + c.steps, 0);
	const totalTokens = conversations.reduce((sum, c) => sum + c.tokens, 0);
	const peakTokens = conversations.reduce((max, c) => Math.max(max, c.tokens), 0);
	let longestTask = conversations.reduce((max, c) => Math.max(max, c.durationMs), 0);
	const timestamps = conversations.map((c) => c.time).filter((value) => Number.isFinite(value));
	const firstTime = timestamps.length ? Math.min(...timestamps) : 0;
	const lastTime = timestamps.length ? Math.max(...timestamps) : 0;
	const totalSpanMs = Math.max(1, lastTime - firstTime);
	if (longestTask <= 0) longestTask = totalSpanMs;
	conversations.reduce((sum, c) => sum + c.durationMs, 0) > 0 && conversations.reduce((sum, c) => sum + c.durationMs, 0);
	const totalDecodeTokens = conversations.reduce((sum, c) => sum + Number((listState.byId?.[c.id]?.projectionValues ?? listState.projectionsBySession?.[c.id]?.values)?.sessionStats?.decodeTokens ?? 0), 0);
	const totalDecodeMs = conversations.reduce((sum, c) => sum + Number((listState.byId?.[c.id]?.projectionValues ?? listState.projectionsBySession?.[c.id]?.values)?.sessionStats?.decodeMs ?? 0), 0);
	const avgTokPerSec = totalDecodeMs > 0 ? totalDecodeTokens / (totalDecodeMs / 1e3) : 0;
	const totalCacheRead = conversations.reduce((s, c) => s + c.buckets.cacheReadTokens, 0);
	const totalUncached = conversations.reduce((s, c) => s + c.buckets.uncachedInputTokens, 0);
	const cacheHit = totalCacheRead + totalUncached > 0 ? totalCacheRead / (totalCacheRead + totalUncached) * 100 : 0;
	conversations.filter((c) => c.durationMs > 0);
	const days = conversations.map((c) => dayKey(c.time));
	const ls = longestStreak(days);
	const cs = currentStreak(days);
	const modelCounts = {};
	conversations.forEach((c) => {
		const key = c.model || (info?.model ?? "Unknown");
		modelCounts[key] = (modelCounts[key] ?? 0) + c.tokens;
	});
	const models = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]);
	const totalModelTokens = models.reduce((s, m) => s + m[1], 0) || 1;
	const timeline = [...conversations].sort((a, b) => a.time - b.time).slice(-40);
	const maxTimeline = Math.max(1, ...timeline.map((c) => c.tokens));
	const countsByDay = {};
	conversations.forEach((c) => {
		const k = dayKey(c.time);
		countsByDay[k] = (countsByDay[k] ?? 0) + 1;
	});
	const maxDayCount = Math.max(1, ...Object.values(countsByDay));
	const today = /* @__PURE__ */ new Date();
	const cells = [];
	for (let i = 363; i >= 0; i--) {
		const k = dayKey((/* @__PURE__ */ new Date(today.getTime() - i * 864e5)).getTime());
		const count = countsByDay[k] ?? 0;
		const level = count === 0 ? 0 : Math.min(4, Math.ceil(count / maxDayCount * 4));
		cells.push({
			date: k,
			count,
			level
		});
	}
	const weekCounts = Array(53).fill(0);
	cells.forEach((cell, idx) => {
		weekCounts[Math.floor(idx / 7)] += cell.count;
	});
	const maxWeekCount = Math.max(1, ...weekCounts);
	const monthCounts = Array(12).fill(0);
	conversations.forEach((c) => {
		monthCounts[new Date(c.time).getMonth()] += 1;
	});
	const maxMonthCount = Math.max(1, ...monthCounts);
	let cumulativeRunning = 0;
	const cumulativeDayCounts = cells.map((cell) => {
		cumulativeRunning += cell.count;
		return cumulativeRunning;
	});
	const cumulativeTotal = cumulativeDayCounts.length ? cumulativeDayCounts[cumulativeDayCounts.length - 1] : 1;
	const months = monthCounts.map((count, idx) => ({
		label: new Date(2024, idx, 1).toLocaleString("en", { month: "short" }),
		count,
		level: count === 0 ? 0 : Math.min(4, Math.ceil(count / maxMonthCount * 4))
	}));
	const monthLabels = Array(53).fill("");
	let previousMonth = "";
	for (let w = 0; w < 53; w++) {
		const label = (/* @__PURE__ */ new Date(today.getTime() - (52 - w) * 7 * 864e5)).toLocaleString("en", { month: "short" });
		if (label !== previousMonth) {
			monthLabels[w] = label;
			previousMonth = label;
		}
	}
	const activeCells = cells.map((cell, idx) => {
		const weekCount = weekCounts[Math.floor(idx / 7)];
		const monthCount = monthCounts[(/* @__PURE__ */ new Date(cell.date + "T00:00:00")).getMonth()];
		const cumulativeCount = cumulativeDayCounts[idx];
		let count = cell.count;
		let maxForLevel = Math.max(1, ...cells.map((x) => x.count));
		if (activityFilter === "weekly") {
			count = weekCount;
			maxForLevel = maxWeekCount;
		}
		if (activityFilter === "monthly") {
			count = monthCount;
			maxForLevel = maxMonthCount;
		}
		if (activityFilter === "cumulative") {
			count = cumulativeCount;
			maxForLevel = cumulativeTotal;
		}
		const level = count === 0 ? 0 : Math.min(4, Math.ceil(count / maxForLevel * 4));
		return {
			...cell,
			count,
			level
		};
	});
	const activeColumns = 53;
	const activeAspect = "1 / 1";
	const skills = info?.skills ?? [];
	info?.pluginCount;
	const name = info?.name ?? "User";
	const insights = [];
	if (conversations.length > 0) {
		insights.push(`You have ${conversations.length} conversations with ${formatTokens(totalTokens)} total tokens.`);
		insights.push(`Average cache hit is ${cacheHit.toFixed(1)}%, indicating ${cacheHit > 50 ? "strong" : "moderate"} reuse of cached tokens.`);
		insights.push(`Your longest streak is ${ls} day${ls === 1 ? "" : "s"}; current streak is ${cs} day${cs === 1 ? "" : "s"}.`);
		if (models.length > 0) insights.push(`Most-used model is ${models[0][0]} with ${formatTokens(models[0][1])} tokens.`);
		if (totalTurns > 0) insights.push(`Average ${(totalTokens / Math.max(1, totalTurns)).toFixed(0)} tokens per turn.`);
		if (longestTask > 0) insights.push(`Longest task took ${formatMs(longestTask)}.`);
	} else insights.push("No activity yet. Start a conversation to see analytics.");
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "da-section",
		style: {
			width: "100%",
			maxHeight: "100vh",
			overflowY: "auto",
			overflowX: "hidden",
			paddingBottom: 48
		},
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("link", {
				rel: "stylesheet",
				href: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "da-header",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "da-greeting",
						children: t("greeting", { name })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", { children: t("title") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("intro") })
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "da-grid",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "da-card",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "label",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "bi bi-chat-dots" }),
									" ",
									t("card.turns")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "value",
								children: totalTurns.toLocaleString()
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sub",
								children: [conversations.length, " conversations"]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "da-card",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "label",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "bi bi-lightning" }),
									" ",
									t("card.toks")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "value",
								children: avgTokPerSec.toFixed(1)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sub",
								children: "decode tokens per second"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "da-card",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "label",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "bi bi-list-check" }),
									" ",
									t("card.steps")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "value",
								children: totalSteps.toLocaleString()
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sub",
								children: "across all turns"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "da-card",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "label",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "bi bi-infinity" }),
									" ",
									t("card.tokens")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "value",
								children: formatTokens(totalTokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sub",
								children: [totalTokens.toLocaleString(), " tokens"]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "da-card",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "label",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "bi bi-database" }),
									" ",
									t("card.cache")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "value",
								children: [cacheHit.toFixed(1), "%"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sub",
								children: "cache read / input"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "da-card",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "label",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "bi bi-graph-up-arrow" }),
									" ",
									t("card.peak")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "value",
								children: formatTokens(peakTokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sub",
								children: [peakTokens.toLocaleString(), " tokens"]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "da-card",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "label",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "bi bi-clock-history" }),
									" ",
									t("card.longestTask")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "value",
								children: formatMs(longestTask)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sub",
								children: "single task"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "da-card",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "label",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "bi bi-calendar-check" }),
									" ",
									t("card.longestStreak")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "value",
								children: ls
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sub",
								children: "days"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "da-card",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "label",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { className: "bi bi-fire" }),
									" ",
									t("card.currentStreak")
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "value",
								children: cs
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "sub",
								children: "days"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "da-panel",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("heatmap.title") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sub",
						children: t("heatmap.sub")
					}),
					conversations.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "da-empty",
						children: t("activity.empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								gap: 8,
								marginBottom: 12,
								flexWrap: "wrap"
							},
							children: [
								"daily",
								"weekly",
								"monthly",
								"cumulative"
							].map((filter) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setActivityFilter(filter),
								style: {
									padding: "4px 10px",
									fontSize: 12,
									borderRadius: 6,
									border: "1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.15))",
									background: activityFilter === filter ? "rgba(110,168,254,.25)" : "transparent",
									color: "inherit",
									cursor: "pointer",
									textTransform: "capitalize"
								},
								children: filter
							}, filter))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "da-heatmap",
							style: { gridTemplateColumns: `repeat(${activeColumns}, 1fr)` },
							children: activeCells.map((cell, idx) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: `da-heatmap-cell ${cell.level > 0 ? `l${cell.level}` : ""}`,
								style: { aspectRatio: activeAspect },
								title: `${cell.label ?? cell.date ?? idx}: ${cell.count}`
							}, idx))
						}),
						activityFilter !== "monthly" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "repeat(53, 1fr)",
								gap: 3,
								marginTop: 4,
								fontSize: 10,
								opacity: .65
							},
							children: monthLabels.map((label, idx) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									textAlign: "center",
									whiteSpace: "nowrap",
									overflow: "visible"
								},
								children: label
							}, idx))
						}),
						activityFilter === "monthly" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "grid",
								gridTemplateColumns: "repeat(12, 1fr)",
								gap: 3,
								marginTop: 4,
								fontSize: 10,
								opacity: .65
							},
							children: months.map((m, idx) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: { textAlign: "center" },
								children: m.label
							}, idx))
						})
					] })
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "da-two",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "da-panel",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("models.title") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "sub",
							children: "Token usage by model"
						}),
						models.length === 0 || totalModelTokens <= 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "da-empty",
							children: t("models.empty")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "da-pie-wrap",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "da-pie",
								style: { background: `conic-gradient(${models.map((m, i) => {
									const colors = [
										"#6ea8fe",
										"#247bbf",
										"#52c41a",
										"#faad14",
										"#ff4d4f",
										"#722ed1",
										"#13c2c2",
										"#eb2f96"
									];
									const start = models.slice(0, i).reduce((s, x) => s + x[1], 0) / totalModelTokens * 360;
									const end = start + m[1] / totalModelTokens * 360;
									return `${colors[i % colors.length]} ${start}deg ${end}deg`;
								}).join(", ")})` }
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "da-legend",
								children: models.map((m, i) => {
									const colors = [
										"#6ea8fe",
										"#247bbf",
										"#52c41a",
										"#faad14",
										"#ff4d4f",
										"#722ed1",
										"#13c2c2",
										"#eb2f96"
									];
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "da-dot",
											style: { background: colors[i % colors.length] }
										}),
										m[0],
										" - ",
										(m[1] / totalModelTokens * 100).toFixed(1),
										"% (",
										formatTokens(m[1]),
										")"
									] }, m[0]);
								})
							})]
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "da-panel",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("skills.title") }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "sub",
							children: skills.length > 0 ? "Configured skills" : "Skills discovered from your environment"
						}),
						skills.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "da-empty",
							children: t("skills.empty")
						}) : skills.map((skill, idx) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "da-bar-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "da-bar-label",
								children: skill
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "da-bar-track",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "da-bar-fill",
									style: { width: `${100 - idx * 12}%` }
								})
							})]
						}, `${skill}-${idx}`))
					]
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "da-panel",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("timeline.title") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sub",
						children: "Tokens per conversation over time"
					}),
					timeline.length === 0 || totalTokens === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "da-empty",
						children: t("timeline.empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "da-timeline",
						children: timeline.map((item) => {
							const height = Math.max(4, item.tokens / maxTimeline * 120);
							const date = new Date(item.time);
							const label = `${date.getMonth() + 1}/${date.getDate()}`;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "da-bar-wrap",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "da-bar",
									style: { height: `${height}px` },
									title: `${item.title}: ${item.tokens} tokens`
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "da-bar-label",
									children: label
								})]
							}, item.id);
						})
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "da-panel",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: t("insights.title") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "da-insights",
					children: insights.map((line, idx) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "da-insight",
						children: line
					}, idx))
				})]
			})
		]
	});
}

//#endregion
//#region src/client/locales.ts
const NS = "deepAnalytics";
const en = {
	nav: "Analytics",
	title: "Deep Analytics",
	intro: "A full-fledged view of your work in DeepSeek Harness: turns, tokens, activity, models, and insights.",
	greeting: "Hello, {name}",
	"card.turns": "Total turns",
	"card.steps": "Total steps",
	"card.toks": "Average tok/s",
	"card.tokens": "Lifetime tokens",
	"card.cache": "Average cache hit",
	"card.peak": "Peak tokens in a turn",
	"card.longestTask": "Longest task time",
	"card.longestStreak": "Longest streak days",
	"card.currentStreak": "Current streak days",
	"card.plugins": "Plugins installed",
	"heatmap.title": "Task activity",
	"heatmap.sub": "Contributions over the last year",
	"models.title": "Models used",
	"skills.title": "Top skills used",
	"insights.title": "Insights",
	"timeline.title": "Token usage over time",
	"models.empty": "No model data yet.",
	"skills.empty": "No skill data yet.",
	"timeline.empty": "No token usage data yet.",
	"activity.empty": "No activity yet."
};

//#endregion
//#region src/client/styles.ts
const SECTION_STYLES = `
.da-section { padding: 28px 32px; max-width: 1380px; margin: 0 auto; color: var(--dsw-alias-label-primary, #e6e6e6); min-height: 100%; }
.da-header { margin-bottom: 24px; }
.da-header h1 { margin: 0 0 6px; font-size: 30px; letter-spacing: -0.02em; }
.da-header p { margin: 0; opacity: .72; font-size: 14px; }
.da-greeting { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; opacity: .6; margin-bottom: 4px; }
.da-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 24px; }
.da-card { padding: 16px 18px; border: 1px solid var(--dsw-alias-border-l1, rgba(255,255,255,.12)); border-radius: 12px; background: var(--dsw-alias-bg-layer-2, rgba(255,255,255,.04)); transition: transform .15s ease, box-shadow .15s ease; overflow: hidden; min-height: 96px; }
.da-card:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,0,0,.18); }
.da-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; opacity: .65; display:flex; align-items:center; gap:6px; }
.da-card .value { font-size: 22px; font-weight: 700; margin-top: 10px; letter-spacing: -0.02em; line-height: 1.1; overflow-wrap: anywhere; word-break: break-word; }
.da-card .sub { margin-top: 6px; font-size: 12px; opacity: .65; }
.da-panel { margin-bottom: 24px; padding: 20px; border: 1px solid var(--border, rgba(255,255,255,.1)); border-radius: 14px; background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.03)); }
.da-panel h3 { margin: 0 0 4px; font-size: 16px; }
.da-panel .sub { font-size: 12px; opacity: .6; margin-bottom: 14px; }
.da-two { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
@media (max-width: 900px){ .da-two { grid-template-columns: 1fr; } }
.da-heatmap { display: grid; grid-template-columns: repeat(53, 1fr); gap: 3px; max-width: 100%; }
.da-heatmap-cell { aspect-ratio: 1 / 1; border-radius: 2px; background: var(--dsw-alias-bg-layer-3, rgba(255,255,255,.06)); }
.da-heatmap-cell.l1 { background: rgba(34,197,94,.25); }
.da-heatmap-cell.l2 { background: rgba(34,197,94,.45); }
.da-heatmap-cell.l3 { background: rgba(34,197,94,.65); }
.da-heatmap-cell.l4 { background: rgba(34,197,94,.85); }
.da-bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.da-bar-label { width: 120px; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.da-bar-track { flex: 1; height: 10px; border-radius: 5px; background: var(--dsw-alias-bg-layer-3, rgba(255,255,255,.08)); overflow: hidden; }
.da-bar-fill { height: 100%; border-radius: 5px; background: linear-gradient(90deg, #6ea8fe, #247bbf); }
.da-pie-wrap { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.da-pie { width: 160px; height: 160px; border-radius: 50%; position: relative; }
.da-legend { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.da-legend span { display: flex; align-items: center; gap: 8px; }
.da-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.da-timeline { display: flex; align-items: end; gap: 4px; min-height: 140px; overflow-x: auto; padding: 6px 0; }
.da-bar-wrap { display: flex; flex-direction: column; align-items: center; min-width: 20px; }
.da-bar { width: 14px; border-radius: 3px 3px 0 0; background: linear-gradient(180deg, #6ea8fe, #247bbf); }
.da-bar-label { font-size: 9px; margin-top: 4px; }
.da-empty { opacity: .65; padding: 12px 0; }
.da-insights { display: flex; flex-direction: column; gap: 8px; }
.da-insight { padding: 10px 12px; border-left: 3px solid #6ea8fe; background: var(--dsw-alias-bg-layer-1, rgba(255,255,255,.03)); border-radius: 6px; font-size: 13px; }
.da-monospace { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
`;

//#endregion
//#region src/client/index.ts
const PANEL_ID = "deep-analytics";
const inject = [
	"sessions",
	"slots",
	"locale"
];
function apply(ctx) {
	ctx.effect(() => ctx.locale.register(NS, { en }), "analytics: dictionaries");
	ctx.effect(() => {
		const tag = document.createElement("style");
		tag.dataset.plugin = "dsh-deep-analytics";
		tag.dataset.pluginCss = "dsh-deep-analytics/section.css";
		tag.textContent = SECTION_STYLES;
		document.head.appendChild(tag);
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
		link.dataset.plugin = "dsh-deep-analytics";
		document.head.appendChild(link);
		return () => {
			tag.remove();
			link.remove();
		};
	}, "analytics: stylesheet");
	ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
		name: "sidebar.panellist",
		id: PANEL_ID,
		order: 5,
		label: () => ctx.locale.bind(NS)("nav")
	}, AnalyticsIcon));
	ctx.slots.inject("main", () => ctx.slots.register({
		name: "main",
		key: PANEL_ID,
		locale: NS,
		inject: () => ({
			sessions: ctx.sessions,
			fetchInfo: () => fetch("/dsh-deep-analytics/info", { credentials: "same-origin" }).then((response) => response.json())
		})
	}, AnalyticsSection));
}

//#endregion
exports.PANEL_ID = PANEL_ID;
exports.apply = apply;
exports.inject = inject;
return module.exports; } });
//# sourceMappingURL=index.js.map