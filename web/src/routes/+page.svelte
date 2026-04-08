<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';

	type HealthStatus = 'checking' | 'connected' | 'degraded' | 'error';

	let status: HealthStatus = $state('checking');
	let health: {
		uptime?: number;
		database?: string;
		redis?: string;
		timestamp?: string;
	} = $state({});

	onMount(async () => {
		try {
			const res = await fetch('/health');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			health = data;
			status = data.status === 'ok' ? 'connected' : 'degraded';
		} catch {
			status = 'error';
		}
	});

	function formatUptime(seconds: number): string {
		if (!seconds) return '—';
		const d = Math.floor(seconds / 86400);
		const h = Math.floor((seconds % 86400) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		if (d > 0) return `${d}d ${h}h`;
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m ${seconds % 60}s`;
	}

	const statusConfig = {
		checking: { label: 'Connecting…', dot: 'dot-pulse', color: 'var(--color-warning)' },
		connected: { label: 'All systems operational', dot: 'dot-online', color: 'var(--color-success)' },
		degraded:  { label: 'Degraded', dot: 'dot-degraded', color: 'var(--color-warning)' },
		error:     { label: 'Backend unreachable', dot: 'dot-error', color: 'var(--color-danger)' },
	};

	let cfg = $derived(statusConfig[status]);
</script>

<svelte:head>
	<title>Kyro — API Management Platform</title>
</svelte:head>

<div class="landing">
	<!-- Header -->
	<header class="header">
		<a href="/" class="logo">
			<span class="logo-mark">K</span>
			<span class="logo-text">Kyro</span>
		</a>
		<nav class="nav">
			<a href="/health" class="nav-link">Status</a>
			<a href="/login" class="nav-link">Sign In</a>
			<a href="/register" class="nav-btn">Get Started</a>
		</nav>
	</header>

	<!-- Status bar -->
	<div class="status-bar" style="--status-color: {cfg.color}">
		<span class="dot {cfg.dot}"></span>
		<span class="status-label">{cfg.label}</span>

		{#if status === 'connected' || status === 'degraded'}
			<span class="status-divider">·</span>
			<span class="status-detail">
				DB <span class="chip" class:chip-ok={health.database === 'connected'} class:chip-err={health.database !== 'connected'}>{health.database}</span>
			</span>
			<span class="status-divider">·</span>
			<span class="status-detail">
				Redis <span class="chip" class:chip-ok={health.redis === 'connected'} class:chip-err={health.redis !== 'connected'}>{health.redis}</span>
			</span>
			<span class="status-divider">·</span>
			<span class="status-detail muted">up {formatUptime(health.uptime ?? 0)}</span>
		{/if}
	</div>

	<!-- Hero -->
	<main class="hero">
		<div class="hero-inner">
			<div class="eyebrow">API Management Platform</div>
			<h1 class="hero-title">
				Build faster.<br />
				Ship with&nbsp;<span class="accent">confidence.</span>
			</h1>
			<p class="hero-sub">
				Manage API keys, track usage in real time, and store files —
				all in one unified platform built for modern teams.
			</p>
			<div class="hero-cta">
				<a href="/register" class="cta-primary">Start Building Free</a>
				<a href="/login" class="cta-secondary">Sign In →</a>
			</div>
		</div>

		<!-- Feature cards -->
		<div class="features">
			<div class="feature-card">
				<div class="feature-icon">🔑</div>
				<h3>API Key Management</h3>
				<p>Create, scope, and revoke keys with fine-grained permission control.</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">📊</div>
				<h3>Usage Analytics</h3>
				<p>Real-time dashboards with daily breakdowns and bandwidth tracking.</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">📁</div>
				<h3>File Storage</h3>
				<p>Upload, serve, and manage files with per-org storage quotas.</p>
			</div>
			<div class="feature-card">
				<div class="feature-icon">🛡️</div>
				<h3>Rate Limiting</h3>
				<p>Redis-backed rate limiting protects your infrastructure automatically.</p>
			</div>
		</div>
	</main>

	<footer class="footer">
		<span>© 2026 Kyro</span>
		<a href="/health">System Status</a>
	</footer>
</div>

<style>
	.landing {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg);
	}

	/* ── Header ── */
	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-8);
		border-bottom: 1px solid var(--color-border);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		text-decoration: none;
		font-size: var(--font-size-lg);
		font-weight: 700;
		color: var(--color-text);
	}

	.logo-mark {
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-accent);
		color: white;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-base);
	}

	.nav {
		display: flex;
		align-items: center;
		gap: var(--space-5);
	}

	.nav-link {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-decoration: none;
		transition: color 0.15s;
	}

	.nav-link:hover {
		color: var(--color-text);
		text-decoration: none;
	}

	.nav-btn {
		height: 34px;
		padding: 0 var(--space-4);
		background: var(--color-accent);
		color: white;
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-decoration: none;
		display: flex;
		align-items: center;
		transition: background 0.15s;
	}

	.nav-btn:hover {
		background: var(--color-accent-hover);
		text-decoration: none;
	}

	/* ── Status bar ── */
	.status-bar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-8);
		background: var(--color-bg-2);
		border-bottom: 1px solid var(--color-border);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
	}

	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.dot-online  { background: var(--color-success); }
	.dot-degraded { background: var(--color-warning); }
	.dot-error   { background: var(--color-danger); }

	.dot-pulse {
		background: var(--color-warning);
		animation: pulse 1.2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
	}

	.status-label {
		color: var(--status-color);
		font-weight: 500;
	}

	.status-divider {
		color: var(--color-border);
	}

	.status-detail {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.status-detail.muted {
		color: var(--color-text-muted);
	}

	.chip {
		display: inline-flex;
		align-items: center;
		padding: 0 5px;
		height: 16px;
		border-radius: var(--radius-sm);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.chip-ok  { background: rgba(34,197,94,0.15); color: var(--color-success); }
	.chip-err { background: rgba(239,68,68,0.15);  color: var(--color-danger); }

	/* ── Hero ── */
	.hero {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-12) var(--space-8);
		gap: var(--space-12);
	}

	.hero-inner {
		max-width: 680px;
		text-align: center;
	}

	.eyebrow {
		display: inline-block;
		padding: 0 var(--space-3);
		height: 24px;
		line-height: 24px;
		border-radius: var(--radius-full);
		background: rgba(99,102,241,0.12);
		color: var(--color-accent);
		font-size: var(--font-size-xs);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		margin-bottom: var(--space-5);
	}

	.hero-title {
		font-size: clamp(36px, 6vw, 56px);
		font-weight: 700;
		line-height: 1.1;
		color: var(--color-text);
		letter-spacing: -0.02em;
		margin-bottom: var(--space-5);
	}

	.accent {
		color: var(--color-accent);
	}

	.hero-sub {
		font-size: var(--font-size-lg);
		color: var(--color-text-muted);
		line-height: 1.6;
		max-width: 520px;
		margin: 0 auto var(--space-8);
	}

	.hero-cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
		flex-wrap: wrap;
	}

	.cta-primary {
		height: 48px;
		padding: 0 var(--space-6);
		background: var(--color-accent);
		color: white;
		border-radius: var(--radius-md);
		font-size: var(--font-size-base);
		font-weight: 600;
		text-decoration: none;
		display: flex;
		align-items: center;
		transition: background 0.15s, transform 0.1s;
	}

	.cta-primary:hover {
		background: var(--color-accent-hover);
		text-decoration: none;
		transform: translateY(-1px);
	}

	.cta-secondary {
		height: 48px;
		padding: 0 var(--space-5);
		color: var(--color-text-muted);
		font-size: var(--font-size-base);
		font-weight: 500;
		text-decoration: none;
		display: flex;
		align-items: center;
		transition: color 0.15s;
	}

	.cta-secondary:hover {
		color: var(--color-text);
		text-decoration: none;
	}

	/* ── Features ── */
	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-4);
		width: 100%;
		max-width: 900px;
	}

	.feature-card {
		padding: var(--space-6);
		background: var(--color-bg-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		transition: border-color 0.15s, transform 0.15s;
	}

	.feature-card:hover {
		border-color: var(--color-accent);
		transform: translateY(-2px);
	}

	.feature-icon {
		font-size: 28px;
		margin-bottom: var(--space-3);
	}

	.feature-card h3 {
		font-size: var(--font-size-base);
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--space-2);
	}

	.feature-card p {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		line-height: 1.5;
	}

	/* ── Footer ── */
	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-8);
		border-top: 1px solid var(--color-border);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.footer a {
		color: var(--color-text-muted);
		text-decoration: none;
	}

	.footer a:hover {
		color: var(--color-text);
	}
</style>
