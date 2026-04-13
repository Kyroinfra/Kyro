<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="auth-layout">
	<div class="scanlines"></div>
	<div class="auth-container">
		{@render children()}
	</div>
</div>

<style>
	.auth-layout {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-4);
		background: var(--color-bg);
		position: relative;
	}

	.auth-container {
		width: 100%;
		max-width: 380px;
		position: relative;
		z-index: 1;
	}
</style>
