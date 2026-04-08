<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { user } from '$lib/stores/auth';
</script>

<svelte:head>
	<title>Dashboard - Kyro</title>
</svelte:head>

<div class="dashboard">
	<header class="dashboard-header">
		<div>
			<h1>Welcome back</h1>
			<p class="subtitle">Here's what's happening with your API</p>
		</div>
	</header>

	<div class="stats-grid">
		<Card>
			<div class="stat-card">
				<span class="stat-icon">🔑</span>
				<div class="stat-info">
					<span class="stat-value">0</span>
					<span class="stat-label">API Keys</span>
				</div>
			</div>
		</Card>
		<Card>
			<div class="stat-card">
				<span class="stat-icon">📊</span>
				<div class="stat-info">
					<span class="stat-value">0</span>
					<span class="stat-label">API Requests</span>
				</div>
			</div>
		</Card>
		<Card>
			<div class="stat-card">
				<span class="stat-icon">📁</span>
				<div class="stat-info">
					<span class="stat-value">0 MB</span>
					<span class="stat-label">Storage Used</span>
				</div>
			</div>
		</Card>
		<Card>
			<div class="stat-card">
				<span class="stat-icon">👥</span>
				<div class="stat-info">
					<span class="stat-value">1</span>
					<span class="stat-label">Team Members</span>
				</div>
			</div>
		</Card>
	</div>

	<div class="quick-actions">
		<h2>Quick Actions</h2>
		<div class="actions-grid">
			<a href="/dashboard/keys" class="action-card">
				<span class="action-icon">🔑</span>
				<span class="action-label">Create API Key</span>
			</a>
			<a href="/dashboard/files" class="action-card">
				<span class="action-icon">📤</span>
				<span class="action-label">Upload File</span>
			</a>
			<a href="/dashboard/usage" class="action-card">
				<span class="action-icon">📈</span>
				<span class="action-label">View Analytics</span>
			</a>
			<a href="/dashboard/settings" class="action-card">
				<span class="action-icon">⚙️</span>
				<span class="action-label">Settings</span>
			</a>
		</div>
	</div>
</div>

<style>
	.dashboard {
		max-width: 1200px;
	}

	.dashboard-header {
		margin-bottom: var(--space-6);
	}

	.dashboard-header h1 {
		font-size: var(--font-size-2xl);
		font-weight: 600;
		color: var(--color-text);
	}

	.subtitle {
		color: var(--color-text-muted);
		margin-top: var(--space-1);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-8);
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.stat-icon {
		font-size: 32px;
	}

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: var(--font-size-2xl);
		font-weight: 600;
		color: var(--color-text);
	}

	.stat-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.quick-actions h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: var(--space-4);
	}

	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--space-4);
	}

	.action-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-6);
		background: var(--color-bg-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all 0.15s ease;
	}

	.action-card:hover {
		background: var(--color-bg-3);
		border-color: var(--color-accent);
	}

	.action-icon {
		font-size: 24px;
	}

	.action-label {
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--color-text);
	}
</style>
