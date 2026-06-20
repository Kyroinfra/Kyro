<script lang="ts">
	import { apiKey, apiKeyVerified, apiKeyPrefix, clearApiKey } from '$lib/stores/apiKey';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	interface Props {
		// Called to verify the key — should throw on failure.
		// Typically a lightweight read-scope call (e.g. listing files).
		verify: (key: string) => Promise<void>;
	}

	let { verify }: Props = $props();

	let localKey = $state($apiKey);
	let verifying = $state(false);
	let error = $state<string | null>(null);

	async function handleVerify() {
		if (!localKey.trim()) {
			error = 'Please enter an API key';
			return;
		}

		verifying = true;
		error = null;

		try {
			await verify(localKey);
			apiKey.set(localKey);
			apiKeyVerified.set(true);
			apiKeyPrefix.set(localKey.slice(0, 16));
		} catch (e: any) {
			error = e.message || 'Invalid API key. Make sure it has read scope.';
			apiKeyVerified.set(false);
		} finally {
			verifying = false;
		}
	}

	function handleChange() {
		clearApiKey();
		localKey = '';
		error = null;
	}
</script>

{#if !$apiKeyVerified}
	<Card>
		<div class="api-key-section">
			<div class="api-key-header">
				<span class="api-key-icon">🔐</span>
				<span class="api-key-title">API Key</span>
			</div>
			<div class="api-key-input-section">
				<p class="api-key-desc">Enter your full API key to continue</p>
				<div class="api-key-row">
					<input
						type="password"
						class="api-key-input"
						bind:value={localKey}
						placeholder="kyro_live_..."
						onkeydown={(e) => e.key === 'Enter' && handleVerify()}
					/>
					<Button onclick={handleVerify} loading={verifying}>Verify</Button>
				</div>
				{#if error}
					<div class="api-key-error">{error}</div>
				{/if}
			</div>
		</div>
	</Card>
{:else}
	<Card>
		<div class="api-key-section">
			<div class="api-key-verified">
				<div class="verified-info">
					<span class="verified-icon">✓</span>
					<span class="verified-text">Connected</span>
					{#if $apiKeyPrefix}
						<span class="verified-prefix">key_{$apiKeyPrefix}***</span>
					{/if}
				</div>
				<Button variant="ghost" size="sm" onclick={handleChange}>Change</Button>
			</div>
		</div>
	</Card>
{/if}

<style>
	.api-key-section {
		padding: var(--space-2) 0;
	}

	.api-key-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-bottom: var(--space-3);
	}

	.api-key-icon {
		color: var(--color-text-muted);
	}

	.api-key-title {
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		font-weight: 600;
		color: var(--color-text);
		text-transform: uppercase;
	}

	.api-key-input-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.api-key-desc {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		margin: 0;
	}

	.api-key-row {
		display: flex;
		gap: var(--space-3);
	}

	.api-key-input {
		flex: 1;
		max-width: 400px;
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: var(--font-size-base);
		font-family: var(--font-mono);
	}

	.api-key-input:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	.api-key-error {
		color: var(--color-danger);
		font-size: var(--font-size-sm);
	}

	.api-key-verified {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3);
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-md);
	}

	.verified-info {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.verified-icon {
		color: var(--color-success);
		font-size: var(--font-size-lg);
	}

	.verified-text {
		font-weight: 500;
		color: var(--color-success);
	}

	.verified-prefix {
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	@media (max-width: 640px) {
		.api-key-row {
			flex-direction: column;
		}

		.api-key-input {
			max-width: 100%;
		}
	}
</style>
