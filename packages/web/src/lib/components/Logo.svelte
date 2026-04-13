<script lang="ts">
	let { size = 26, class: className = '' }: { size?: number; class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 32 32"
	width={size}
	height={size}
	class="logo-svg {className}"
>
	<rect width="32" height="32" rx="3" fill="#e8e8e8"/>
	<path d="M8 8h4v5h3v-5h4v5h3v5h-3v6h-3v-6H8v5H5V8h3v5h3V8h-3z" fill="#050505"/>
	<path d="M5 8h3v5h3V8zM11 8h3v5h-3zM17 8h4v5h3v5h-3v6h-3v-6h-4v5H5V8h3v5h3V8h3v5h3V8h3z" fill="#050505"/>
</svg>

<style>
	.logo-svg {
		display: block;
		flex-shrink: 0;
	}
</style>