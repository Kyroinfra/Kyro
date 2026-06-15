<script lang="ts">
	interface Props {
		size?: 'sm' | 'md' | 'lg';
	}

	let { size = 'md' }: Props = $props();
</script>

<div class="spinner spinner-{size}"></div>

<style>
	.spinner {
		border: 2px solid var(--color-bg-3);
		border-top-color: var(--color-accent);
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	.spinner-sm {
		width: 16px;
		height: 16px;
	}

	.spinner-md {
		width: 24px;
		height: 24px;
	}

	.spinner-lg {
		width: 40px;
		height: 40px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
