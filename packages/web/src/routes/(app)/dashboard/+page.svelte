<script lang="ts">
  import Card from "$lib/components/ui/Card.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { Key, File, Usage, Settings } from "$lib/components/icons";

  interface Props {
    data: {
      stats: {
        totalRequests: number;
        totalStorage: number;
        activeApiKeys: number;
        totalMembers: number;
      };
    };
  }

  let { data }: Props = $props();

  const stats = [
    { label: "API Keys", value: data.stats.activeApiKeys, icon: Key },
    { label: "Requests", value: data.stats.totalRequests, icon: Usage },
    {
      label: "Storage",
      value: formatBytes(data.stats.totalStorage),
      icon: File,
    },
    { label: "Members", value: data.stats.totalMembers, icon: null },
  ];

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
</script>

<svelte:head>
  <title>Dashboard - Kyro</title>
</svelte:head>

<div class="dashboard">
  <header class="dashboard-header">
    <span class="prompt">$</span>
    <span class="command">./dashboard.sh</span>
  </header>

  <div class="stats-section">
    <div class="section-label">// Statistics</div>
    <div class="stats-grid">
      {#each stats as stat}
        <Card>
          <div class="stat-card">
            <div class="stat-header">
              {#if stat.icon}
                <span class="stat-icon">
                  <svelte:component this={stat.icon} size={14} />
                </span>
              {/if}
              <span class="stat-label">{stat.label}</span>
            </div>
            <div class="stat-value">
              <span class="bracket">[</span>
              <span class="value"
                >{typeof stat.value === "number"
                  ? stat.value.toLocaleString()
                  : stat.value}</span
              >
              <span class="bracket">]</span>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  </div>

  <div class="actions-section">
    <div class="section-label">// Quick Actions</div>
    <div class="actions-grid">
      <a href="/dashboard/keys" class="action-card">
        <span class="action-marker">></span>
        <span class="action-label">Create API Key</span>
      </a>
      <a href="/dashboard/files" class="action-card">
        <span class="action-marker">></span>
        <span class="action-label">Upload File</span>
      </a>
      <a href="/dashboard/usage" class="action-card">
        <span class="action-marker">></span>
        <span class="action-label">View Analytics</span>
      </a>
      <a href="/dashboard/settings" class="action-card">
        <span class="action-marker">></span>
        <span class="action-label">Settings</span>
      </a>
    </div>
  </div>
</div>

<style>
  .dashboard {
    max-width: 900px;
  }

  .dashboard-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-6);
  }

  .prompt {
    font-family: var(--font-mono);
    color: var(--color-success);
    font-weight: 600;
  }

  .command {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  .section-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--space-3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .stat-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .stat-icon {
    color: var(--color-text-muted);
    display: flex;
  }

  .stat-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-text);
  }

  .bracket {
    color: var(--color-text-muted);
  }

  .value {
    color: var(--color-text);
  }

  .actions-section {
    margin-top: var(--space-6);
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--space-3);
  }

  .action-card {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .action-card:hover {
    border-color: var(--color-text-muted);
    background: var(--color-bg-3);
  }

  .action-marker {
    font-family: var(--font-mono);
    color: var(--color-success);
    font-weight: 600;
  }

  .action-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text);
  }
  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .actions-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .dashboard {
      max-width: 100%;
    }
  }
</style>
