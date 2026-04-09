<script lang="ts">
	import { onMount } from 'svelte';
	import { getHealth, checkHealth, type HealthResponse } from '$lib/api/health';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';

	let loading = $state(true);
	let health: HealthResponse | null = $state(null);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			health = await getHealth();
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to connect to backend';
		} finally {
			loading = false;
		}
	});

	function formatUptime(seconds: number): string {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		if (days > 0) return `${days}d ${hours}h`;
		if (hours > 0) return `${hours}h ${mins}m`;
		return `${mins}m`;
	}

	function formatTimestamp(ts: string): string {
		return new Date(ts).toLocaleString();
	}
</script>

<div class="health-page">
	<header class="page-header">
		<h1>System Health</h1>
		<p class="subtitle">Backend connection status</p>
	</header>

	{#if loading}
		<div class="loading">
			<Spinner size="lg" />
			<p>Checking backend status...</p>
		</div>
	{:else if error}
		<Card>
			<div class="status-card error">
				<div class="status-icon error">✕</div>
				<div class="status-info">
					<h2>Connection Failed</h2>
					<p class="error-message">{error}</p>
					<p class="hint">Make sure the backend container is running</p>
				</div>
			</div>
		</Card>
	{:else if health}
		<div class="status-grid">
			<Card>
				<div class="status-card">
					<div class="status-icon" class:success={health.status === 'ok'} class:degraded={health.status === 'degraded'}>
						{health.status === 'ok' ? '✓' : '⚠'}
					</div>
					<div class="status-info">
						<h2>Status: <Badge variant={health.status === 'ok' ? 'success' : 'warning'}>{health.status}</Badge></h2>
						<p class="muted">Server is responding</p>
					</div>
				</div>
			</Card>

			<Card>
				<div class="detail-card">
					<h3>Uptime</h3>
					<p class="detail-value">{formatUptime(health.uptime)}</p>
					<p class="muted">Since last restart</p>
				</div>
			</Card>

			<Card>
				<div class="detail-card">
					<h3>Timestamp</h3>
					<p class="detail-value">{formatTimestamp(health.timestamp)}</p>
					<p class="muted">Server time</p>
				</div>
			</Card>

			<Card>
				<div class="detail-card">
					<h3>Database</h3>
					<p class="detail-value">
						<Badge variant={health.database === 'connected' ? 'success' : 'danger'}>
							{health.database}
						</Badge>
					</p>
					<p class="muted">PostgreSQL connection</p>
				</div>
			</Card>

			<Card>
				<div class="detail-card">
					<h3>Redis</h3>
					<p class="detail-value">
						<Badge variant={health.redis === 'connected' ? 'success' : 'danger'}>
							{health.redis}
						</Badge>
					</p>
					<p class="muted">Redis connection</p>
				</div>
			</Card>
		</div>
	{/if}
</div>

<style>
	.health-page {
		max-width: 800px;
		margin: 0 auto;
		padding: var(--space-8) var(--space-4);
	}

	.page-header {
		margin-bottom: var(--space-8);
	}

	.page-header h1 {
		font-size: var(--font-size-3xl);
		font-weight: 700;
		color: var(--color-text);
	}

	.subtitle {
		font-size: var(--font-size-base);
		color: var(--color-text-muted);
		margin-top: var(--space-2);
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-12);
		color: var(--color-text-muted);
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-4);
	}

	.status-card {
		display: flex;
		align-items: flex-start;
		gap: var(--space-4);
	}

	.status-card.error {
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--space-4);
	}

	.status-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xl);
		font-weight: 700;
		flex-shrink: 0;
	}

	.status-icon.success {
		background: rgba(34, 197, 94, 0.15);
		color: var(--color-success);
	}

	.status-icon.degraded {
		background: rgba(245, 158, 11, 0.15);
		color: var(--color-warning);
	}

	.status-icon.error {
		background: rgba(239, 68, 68, 0.15);
		color: var(--color-danger);
	}

	.status-info h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-text);
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.error-message {
		color: var(--color-danger);
		margin-top: var(--space-2);
	}

	.hint {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin-top: var(--space-2);
	}

	.muted {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin-top: var(--space-1);
	}

	.detail-card {
		text-align: center;
	}

	.detail-card h3 {
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.detail-value {
		font-size: var(--font-size-2xl);
		font-weight: 600;
		color: var(--color-text);
		margin-top: var(--space-2);
	}
</style>
