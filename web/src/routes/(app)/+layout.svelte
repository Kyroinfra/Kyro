<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { user } from '$lib/stores/auth';

	interface Props {
		data: { user: { id: string; orgId: string; role: string } };
		children: Snippet;
	}

	let { data, children }: Props = $props();

	$effect(() => {
		user.set({
			id: data.user.id,
			email: '',
			role: data.user.role as 'owner' | 'admin' | 'member',
			orgId: data.user.orgId
		});
	});

	const navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: '🏠' },
		{ href: '/dashboard/keys', label: 'API Keys', icon: '🔑' },
		{ href: '/dashboard/files', label: 'Files', icon: '📁' },
		{ href: '/dashboard/usage', label: 'Usage', icon: '📊' },
		{ href: '/dashboard/settings', label: 'Settings', icon: '⚙️' }
	];

	function getInitials(email: string): string {
		return email ? email.substring(0, 2).toUpperCase() : 'U';
	}

	function handleLogout() {
		fetch('/logout', { method: 'POST' }).then(() => {
			window.location.href = '/login';
		});
	}
</script>

<div class="app-layout">
	<aside class="sidebar">
		<div class="sidebar-header">
			<a href="/" class="logo">
				<span class="logo-icon">K</span>
				<span class="logo-text">Kyro</span>
			</a>
		</div>

		<nav class="sidebar-nav">
			{#each navItems as item}
				<a href={item.href} class="nav-item" class:active={$page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/dashboard')}>
					<span class="nav-icon">{item.icon}</span>
					<span class="nav-label">{item.label}</span>
				</a>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<button class="logout-btn" onclick={handleLogout}>
				<span>📤</span>
				<span>Logout</span>
			</button>
		</div>
	</aside>

	<div class="main-wrapper">
		<header class="topbar">
			<div class="topbar-left">
				<h1 class="page-title">Dashboard</h1>
			</div>
			<div class="topbar-right">
				<div class="user-menu">
					<div class="user-avatar">
						{getInitials($user?.email || '')}
					</div>
					<div class="user-info">
						<span class="user-email">{$user?.email || 'User'}</span>
						<span class="user-role">{$user?.role}</span>
					</div>
				</div>
			</div>
		</header>

		<main class="main-content">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.app-layout {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 240px;
		background: var(--color-bg-2);
		border-right: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.sidebar-header {
		padding: var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-lg);
		font-weight: 700;
		color: var(--color-text);
		text-decoration: none;
	}

	.logo-icon {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-accent);
		color: white;
		border-radius: var(--radius-sm);
	}

	.sidebar-nav {
		flex: 1;
		padding: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		text-decoration: none;
		font-size: var(--font-size-sm);
		font-weight: 500;
		transition: all 0.15s ease;
	}

	.nav-item:hover {
		background: var(--color-bg-3);
		color: var(--color-text);
	}

	.nav-item.active {
		background: var(--color-accent);
		color: white;
	}

	.nav-icon {
		font-size: var(--font-size-base);
	}

	.sidebar-footer {
		padding: var(--space-3);
		border-top: 1px solid var(--color-border);
	}

	.logout-btn {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-3);
		background: none;
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.logout-btn:hover {
		background: var(--color-bg-3);
		color: var(--color-danger);
	}

	.main-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.topbar {
		height: 64px;
		padding: 0 var(--space-6);
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-bg);
	}

	.page-title {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-text);
	}

	.user-menu {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.user-avatar {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-accent);
		color: white;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: 600;
	}

	.user-info {
		display: flex;
		flex-direction: column;
	}

	.user-email {
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--color-text);
	}

	.user-role {
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-transform: capitalize;
	}

	.main-content {
		flex: 1;
		padding: var(--space-6);
		overflow-y: auto;
	}
</style>
