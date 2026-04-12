<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { user } from '$lib/stores/auth';
	import { Dashboard, Key, File, Usage, Settings } from '$lib/components/icons';
	import Logo from '$lib/components/Logo.svelte';

	interface Props {
		data: { user: { id: string; orgId: string; role: string } };
		children: Snippet;
	}

	let { data, children }: Props = $props();
	let sidebarOpen = $state(false);

	$effect(() => {
		user.set({
			id: data.user.id,
			email: '',
			role: data.user.role as 'owner' | 'admin' | 'member',
			orgId: data.user.orgId
		});
	});

	// Close sidebar on route change
	$effect(() => {
		$page.url.pathname;
		sidebarOpen = false;
	});

	const navSections = [
		{
			label: '// workspace',
			items: [
				{ href: '/dashboard', label: 'dashboard', icon: Dashboard },
				{ href: '/dashboard/keys', label: 'api keys', icon: Key },
				{ href: '/dashboard/files', label: 'files', icon: File }
			]
		},
		{
			label: '// analytics',
			items: [{ href: '/dashboard/usage', label: 'usage', icon: Usage }]
		},
		{
			label: '// config',
			items: [{ href: '/dashboard/settings', label: 'settings', icon: Settings }]
		}
	];

	const allNavItems = navSections.flatMap(s => s.items);

	function getInitials(email: string): string {
		return email ? email.substring(0, 2).toUpperCase() : 'U';
	}

	function getPagePath(): string {
		const path = $page.url.pathname;
		return '~/' + path.replace(/^\//, '').replace(/\/$/, '');
	}

	function handleLogout() {
		fetch('/logout', { method: 'POST' }).then(() => {
			window.location.href = '/login';
		});
	}
</script>

<div class="app-layout">
	<!-- Overlay for tablet drawer -->
	{#if sidebarOpen}
		<div class="sidebar-overlay" onclick={() => (sidebarOpen = false)}></div>
	{/if}

	<aside class="sidebar" class:open={sidebarOpen}>
		<div class="sidebar-header">
			<a href="/" class="logo">
				<Logo size={22} />
				<span class="logo-text">kyro</span>
			</a>
			<button class="sidebar-close" onclick={() => (sidebarOpen = false)} aria-label="Close menu">✕</button>
		</div>

		<nav class="sidebar-nav">
			{#each navSections as section}
				<div class="nav-section-label">{section.label}</div>
				{#each section.items as item}
					{@const isActive = $page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/dashboard')}
					<a href={item.href} class="nav-item" class:active={isActive}>
						<span class="nav-icon"><item.icon size={14} /></span>
						<span class="nav-label">{item.label}</span>
					</a>
				{/each}
			{/each}
		</nav>

		<div class="sidebar-footer">
			<div class="user-chip">
				<div class="user-avatar">{getInitials($user?.email || '')}</div>
				<div class="user-details">
					<span class="user-email">{$user?.email || 'user'}</span>
					<span class="user-role">{$user?.role || 'member'}</span>
				</div>
			</div>
			<button class="logout-btn" onclick={handleLogout}>
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
					<polyline points="16 17 21 12 16 7" />
					<line x1="21" y1="12" x2="9" y2="12" />
				</svg>
				<span>logout</span>
			</button>
		</div>
	</aside>

	<div class="main-wrapper">
		<header class="topbar">
			<div class="topbar-left">
				<button class="hamburger" onclick={() => (sidebarOpen = true)} aria-label="Open menu">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<line x1="3" y1="6" x2="21" y2="6" />
						<line x1="3" y1="12" x2="21" y2="12" />
						<line x1="3" y1="18" x2="21" y2="18" />
					</svg>
				</button>
				<span class="prompt-char">$</span>
				<span class="topbar-path">{getPagePath()}</span>
				<span class="cursor"></span>
			</div>
			<div class="topbar-right">
				<span class="status-indicator"></span>
				<span class="status-text">connected</span>
			</div>
		</header>

		<main class="main-content">
			{@render children()}
		</main>
	</div>

	<!-- Mobile bottom tab bar -->
	<nav class="bottom-tabs">
		{#each allNavItems as item}
			{@const isActive = $page.url.pathname === item.href || ($page.url.pathname.startsWith(item.href) && item.href !== '/dashboard')}
			<a href={item.href} class="tab-item" class:active={isActive}>
				<span class="tab-icon"><item.icon size={18} /></span>
				<span class="tab-label">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.app-layout {
		display: flex;
		min-height: 100vh;
	}

	/* ── Sidebar ── */
	.sidebar {
		width: 196px;
		background: var(--color-bg);
		border-right: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.sidebar-header {
		padding: var(--space-4) var(--space-4);
		border-bottom: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.sidebar-close {
		display: none;
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: var(--font-size-xs);
		cursor: pointer;
		padding: var(--space-1);
		line-height: 1;
	}

	.sidebar-overlay {
		display: none;
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
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-text);
		color: var(--color-bg);
		border-radius: var(--radius-sm);
		font-weight: 700;
		font-size: 12px;
		flex-shrink: 0;
	}

	/* ── Nav ── */
	.sidebar-nav {
		flex: 1;
		padding: var(--space-3) var(--space-2);
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.nav-section-label {
		font-family: var(--font-mono);
		font-size: var(--font-size-2xs);
		color: var(--color-text-ghost);
		letter-spacing: 0.8px;
		padding: var(--space-3) var(--space-2) var(--space-2);
		user-select: none;
	}

	.nav-section-label:first-child {
		padding-top: var(--space-2);
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: 7px var(--space-3);
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		text-decoration: none;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		transition: all 0.1s ease;
		position: relative;
		margin-bottom: 1px;
	}

	.nav-item:hover {
		color: var(--color-text-dim);
		background: var(--color-bg-2);
	}

	.nav-item.active {
		color: var(--color-text);
		background: var(--color-bg-3);
	}

	.nav-item.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 2px;
		height: 16px;
		background: var(--color-text);
		border-radius: 0 2px 2px 0;
	}

	.nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.5;
		flex-shrink: 0;
	}

	.nav-item:hover .nav-icon,
	.nav-item.active .nav-icon {
		opacity: 0.8;
	}

	.nav-label { flex: 1; }

	/* ── Footer ── */
	.sidebar-footer {
		padding: var(--space-3) var(--space-2);
		border-top: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.user-chip {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-1);
	}

	.user-avatar {
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-3);
		border: 1px solid var(--color-border-2);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: var(--font-size-2xs);
		font-weight: 600;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.user-email {
		font-family: var(--font-mono);
		font-size: var(--font-size-2xs);
		color: var(--color-text-muted);
		text-overflow: ellipsis;
		overflow: hidden;
		white-space: nowrap;
	}

	.user-role {
		font-family: var(--font-mono);
		font-size: var(--font-size-2xs);
		color: var(--color-text-ghost);
	}

	.logout-btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		width: 100%;
		padding: 7px var(--space-3);
		background: none;
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-text-ghost);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		cursor: pointer;
		transition: all 0.1s ease;
		text-align: left;
	}

	.logout-btn:hover {
		color: var(--color-danger);
		background: var(--color-bg-2);
	}

	/* ── Main ── */
	.main-wrapper {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.topbar {
		height: 42px;
		padding: 0 var(--space-5);
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-bg);
		flex-shrink: 0;
	}

	.topbar-left {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-xs);
		min-width: 0;
	}

	.hamburger {
		display: none;
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 4px;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
	}

	.hamburger:hover {
		color: var(--color-text-dim);
		background: var(--color-bg-2);
	}

	.topbar-path {
		font-family: var(--font-mono);
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.prompt-char {
		font-family: var(--font-mono);
		color: var(--color-success);
		font-weight: 700;
		flex-shrink: 0;
	}

	.cursor {
		display: inline-block;
		width: 7px;
		height: 13px;
		background: var(--color-success);
		opacity: 0.6;
		animation: blink 1s step-end infinite;
		vertical-align: middle;
		border-radius: 1px;
		flex-shrink: 0;
	}

	@keyframes blink {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 0; }
	}

	.topbar-right {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.status-indicator {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-success);
		box-shadow: 0 0 6px var(--color-success);
	}

	.status-text {
		font-family: var(--font-mono);
		font-size: var(--font-size-2xs);
		color: var(--color-text-ghost);
		letter-spacing: 0.5px;
	}

	.main-content {
		flex: 1;
		padding: var(--space-5) var(--space-6);
		overflow-y: auto;
	}

	/* ── Bottom tabs (mobile only) ── */
	.bottom-tabs {
		display: none;
	}

	/* ── Tablet: drawer sidebar ── */
	@media (max-width: 900px) {
		.sidebar {
			position: fixed;
			top: 0;
			left: 0;
			height: 100vh;
			z-index: 200;
			transform: translateX(-100%);
			transition: transform 0.2s ease;
			width: 220px;
		}

		.sidebar.open {
			transform: translateX(0);
		}

		.sidebar-close {
			display: flex;
		}

		.sidebar-overlay {
			display: block;
			position: fixed;
			inset: 0;
			background: rgba(0, 0, 0, 0.6);
			z-index: 199;
		}

		.hamburger {
			display: flex;
		}

		.main-content {
			padding: var(--space-4) var(--space-4);
		}
	}

	/* ── Mobile: bottom tab bar ── */
	@media (max-width: 640px) {
		.bottom-tabs {
			display: flex;
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			background: var(--color-bg);
			border-top: 1px solid var(--color-border);
			z-index: 100;
			padding-bottom: env(safe-area-inset-bottom);
		}

		.tab-item {
			flex: 1;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 3px;
			padding: var(--space-2) var(--space-1);
			color: var(--color-text-ghost);
			text-decoration: none;
			font-family: var(--font-mono);
			font-size: 9px;
			letter-spacing: 0.3px;
			transition: color 0.1s ease;
		}

		.tab-item.active {
			color: var(--color-text);
		}

		.tab-icon {
			display: flex;
			opacity: 0.4;
		}

		.tab-item.active .tab-icon {
			opacity: 1;
		}

		.tab-label {
			text-overflow: ellipsis;
			overflow: hidden;
			white-space: nowrap;
			max-width: 100%;
		}

		.main-content {
			padding: var(--space-3) var(--space-3);
			padding-bottom: calc(60px + env(safe-area-inset-bottom));
		}

		.topbar-path {
			max-width: 140px;
		}

		.status-text {
			display: none;
		}
	}
</style>
