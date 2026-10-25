<script lang="ts">
	interface Props {
		size?: number;
	}

	let { size = 18 }: Props = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
	<circle cx="11" cy="11" r="8" />
	<path d="m21 21-4.3-4.3" />
</svg>
