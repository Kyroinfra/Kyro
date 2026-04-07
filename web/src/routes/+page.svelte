<script lang="ts">
	import { redirect } from '@sveltejs/kit';
</script>

<script lang="ts" context="module">
	export const load = () => {
		throw redirect(302, '/health');
	};
</script>
