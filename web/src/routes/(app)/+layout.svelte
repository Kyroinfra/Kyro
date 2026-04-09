<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { user } from '$lib/stores/auth';
	import { Dashboard, Key, File, Usage, Settings } from '$lib/components/icons';

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
		{ href: '/dashboard', label: 'Dashboard', icon: Dashboard },
		{ href: '/dashboard/keys', label: 'API Keys', icon: Key },
		{ href: '/dashboard/files', label: 'Files', icon: File },
		{ href: '/dashboard/usage', label: 'Usage', icon: Usage },
		{ href: '/dashboard/settings', label: 'Settings', icon: Settings }
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
				<span class="logo-mark">K</span>
				<span class="logo-text">kyro</span>
			</a>
		</div>

		<nav class="sidebar-nav">
			{#each navItems as item}
				{@const isActive = $page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/dashboard')}
				<a href={item.href} class="nav-item" class:active={isActive}>
					<span class="nav-icon">
						<item.icon size={16} />
					</span>
					<span class="nav-label">{item.label}</span>
					{#if isActive}
						<span class="nav-indicator">></span>
					{/if}
				</a>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<button class="logout-btn" onclick={handleLogout}>
				<span class="nav-icon">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
						<polyline points="16 17 21 12 16 7" />
						<line x1="21" y1="12" x2="9" y2="12" />
					</svg>
				</span>
				<span>Logout</span>
			</button>
		</div>
	</aside>

	<div class="main-wrapper">
		<header class="topbar">
			<div class="topbar-left">
				<span class="prompt">$</span>
				<h1 class="page-title">{$page.url.pathname.replace('/dashboard', 'dashboard').replace('/', '')}</h1>
			</div>
			<div class="topbar-right">
				<div class="user-menu">
					<div class="user-avatar">
						{getInitials($user?.email || '')}
					</div>
					<div class="user-info">
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
		width: 200px;
		background: var(--color-bg);
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
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text);
		text-decoration: none;
		text-transform: lowercase;
	}

	.logo-mark {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-text);
		color: var(--color-bg);
		border-radius: var(--radius-sm);
		font-weight: 700;
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
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		text-decoration: none;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		transition: all 0.15s ease;
		position: relative;
	}

	.nav-item:hover {
		color: var(--color-text);
		background: var(--color-bg-2);
	}

	.nav-item.active {
		color: var(--color-text);
		background: var(--color-bg-2);
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.7;
	}

	.nav-item:hover .nav-icon,
	.nav-item.active .nav-icon {
		opacity: 1;
	}

	.nav-label {
		flex: 1;
	}

	.nav-indicator {
		color: var(--color-text);
		font-weight: 600;
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
		padding: var(--space-2) var(--space-3);
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.logout-btn:hover {
		color: var(--color-danger);
		background: var(--color-bg-2);
	}

	.main-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.topbar {
		height: 48px;
		padding: 0 var(--space-4);
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-bg);
	}

	.topbar-left {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.prompt {
		font-family: var(--font-mono);
		color: var(--color-success);
		font-weight: 600;
	}

	.page-title {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--color-text);
		text-transform: lowercase;
	}

	.user-menu {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.user-avatar {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		font-weight: 600;
		color: var(--color-text);
	}

	.user-info {
		display: flex;
		flex-direction: column;
	}

	.user-role {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-muted);
		text-transform: capitalize;
	}

	.main-content {
		flex: 1;
		padding: var(--space-5);
		overflow-y: auto;
	}
</style>