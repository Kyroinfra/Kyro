<script lang="ts">
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { Key, File, Usage, Settings, Collection, Chat } from '$lib/components/icons';
  import { formatBytes, formatDate, formatDateTime } from '$lib/utils/format';

  interface Props {
    data: {
      stats: {
        totalRequests: number;
        totalStorage: number;
        totalBytesIn: number;
        totalBytesOut: number;
        activeApiKeys: number;
        totalMembers: number;
        storageLimit: number;
      };
      recentKeys: Array<{
        id: string;
        name: string;
        prefix: string;
        scopes: string[];
        lastUsedAt: string | null;
        revokedAt: string | null;
        createdAt: string;
      }>;
      members: Array<{
        id: string;
        email: string;
        role: string;
      }>;
    };
  }

  let { data }: Props = $props();

  const storageUsedPct = $derived(
    Math.min(100, Math.round((data.stats.totalStorage / data.stats.storageLimit) * 100))
  );

  const storageColor = $derived(
    storageUsedPct >= 90 ? 'var(--color-danger)' :
    storageUsedPct >= 70 ? 'var(--color-warning)' :
    'var(--color-text-muted)'
  );

  const quickActions = [
    { href: '/dashboard/keys',        label: 'Create API Key',    icon: Key },
    { href: '/dashboard/files',       label: 'Upload File',       icon: File },
    { href: '/dashboard/collections', label: 'New Collection',    icon: Collection },
    { href: '/dashboard/ask',         label: 'Ask Your Files',    icon: Chat },
    { href: '/dashboard/usage',       label: 'View Analytics',    icon: Usage },
    { href: '/dashboard/settings',    label: 'Settings',          icon: Settings },
  ];

  function lastUsedLabel(ts: string | null): string {
    if (!ts) return 'never used';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 2)  return 'used just now';
    if (mins < 60) return `used ${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `used ${hrs}h ago`;
    return `used ${Math.floor(hrs / 24)}d ago`;
  }
</script>

<svelte:head>
  <title>Dashboard - Kyro</title>
</svelte:head>

<div class="dashboard">

  <!-- Header -->
  <header class="page-header">
    <div class="header-left">
      <span class="prompt">$</span>
      <span class="command">./dashboard.sh</span>
    </div>
  </header>

  <!-- ── Stats row ── -->
  <div class="section-label">// statistics</div>
  <div class="stats-grid">

    <Card>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-icon"><Key size={12} /></span>
          <span class="stat-label">API Keys</span>
        </div>
        <div class="stat-value">
          <span class="bracket">[</span><span class="value">{data.stats.activeApiKeys}</span><span class="bracket">]</span>
        </div>
        <div class="stat-sub">active keys</div>
      </div>
    </Card>

    <Card>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-icon"><Usage size={12} /></span>
          <span class="stat-label">Requests</span>
        </div>
        <div class="stat-value">
          <span class="bracket">[</span><span class="value">{data.stats.totalRequests.toLocaleString()}</span><span class="bracket">]</span>
        </div>
        <div class="stat-sub">total all time</div>
      </div>
    </Card>

    <Card>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-icon"><File size={12} /></span>
          <span class="stat-label">Storage</span>
        </div>
        <div class="stat-value">
          <span class="bracket">[</span><span class="value">{formatBytes(data.stats.totalStorage)}</span><span class="bracket">]</span>
        </div>
        <div class="stat-sub storage-sub" style="color: {storageColor}">
          {storageUsedPct}% of {formatBytes(data.stats.storageLimit)} used
        </div>
        <div class="storage-bar">
          <div class="storage-fill" style="width: {storageUsedPct}%; background: {storageColor}"></div>
        </div>
      </div>
    </Card>

    <Card>
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Members</span>
        </div>
        <div class="stat-value">
          <span class="bracket">[</span><span class="value">{data.stats.totalMembers}</span><span class="bracket">]</span>
        </div>
        {#if data.members.length > 0}
          <div class="stat-sub">{data.members[0].role}{data.stats.totalMembers > 1 ? ` + ${data.stats.totalMembers - 1} more` : ''}</div>
        {:else}
          <div class="stat-sub">in your org</div>
        {/if}
      </div>
    </Card>

  </div>

  <!-- ── Panels row: keys + bandwidth ── -->
  <div class="panels-grid">

    <!-- Recent API keys panel -->
    <Card padding="none">
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">// api keys</span>
          <a href="/dashboard/keys" class="panel-link">manage →</a>
        </div>
        {#if data.recentKeys.length === 0}
          <div class="panel-empty">
            <span>No keys yet.</span>
            <a href="/dashboard/keys">Create one →</a>
          </div>
        {:else}
          {#each data.recentKeys as key}
            <div class="key-row">
              <span class="key-dot" class:key-dot-active={!key.revokedAt} class:key-dot-revoked={!!key.revokedAt}></span>
              <div class="key-info">
                <span class="key-name">{key.name}</span>
                <span class="key-meta">{key.prefix}*** · {lastUsedLabel(key.lastUsedAt)}</span>
              </div>
              {#if key.revokedAt}
                <Badge variant="default">revoked</Badge>
              {:else}
                <Badge variant="success">active</Badge>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </Card>

    <!-- Bandwidth + storage panel -->
    <Card padding="none">
      <div class="panel">
        <div class="panel-header">
          <span class="panel-title">// bandwidth</span>
          <a href="/dashboard/usage" class="panel-link">details →</a>
        </div>
        <div class="bw-rows">
          <div class="bw-row">
            <span class="bw-label">Data In</span>
            <span class="bw-value">{formatBytes(data.stats.totalBytesIn)}</span>
          </div>
          <div class="bw-divider"></div>
          <div class="bw-row">
            <span class="bw-label">Data Out</span>
            <span class="bw-value">{formatBytes(data.stats.totalBytesOut)}</span>
          </div>
          <div class="bw-divider"></div>
          <div class="bw-row">
            <span class="bw-label">Total Requests</span>
            <span class="bw-value">{data.stats.totalRequests.toLocaleString()}</span>
          </div>
        </div>

        <div class="storage-section">
          <div class="storage-row">
            <span class="bw-label">Storage</span>
            <span class="bw-value" style="color: {storageColor}">{formatBytes(data.stats.totalStorage)} / {formatBytes(data.stats.storageLimit)}</span>
          </div>
          <div class="storage-track">
            <div class="storage-fill-wide" style="width: {storageUsedPct}%; background: {storageColor}"></div>
          </div>
          <div class="storage-footer">
            <span class="storage-pct" style="color: {storageColor}">{storageUsedPct}% used</span>
            <span class="storage-free">{formatBytes(data.stats.storageLimit - data.stats.totalStorage)} free</span>
          </div>
        </div>
      </div>
    </Card>

  </div>

  <!-- ── Quick actions ── -->
  <div class="section-label">// quick actions</div>
  <div class="actions-grid">
    {#each quickActions as action}
      <a href={action.href} class="action-card">
        <span class="action-icon"><action.icon size={13} /></span>
        <span class="action-marker">›</span>
        <span class="action-label">{action.label}</span>
      </a>
    {/each}
  </div>

</div>

<style>
  .dashboard {
    max-width: 920px;
  }

  /* ── Header ── */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-6);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
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

  /* ── Section label ── */
  .section-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-ghost);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: var(--space-3);
  }

  /* ── Stats grid ── */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: 4px;
  }

  .stat-icon {
    color: var(--color-text-muted);
    display: flex;
    opacity: 0.6;
  }

  .stat-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-xl);
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.2;
  }

  .bracket {
    color: var(--color-text-muted);
  }

  .value {
    color: var(--color-text);
  }

  .stat-sub {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    margin-top: 2px;
  }

  .storage-bar {
    height: 2px;
    background: var(--color-bg-4);
    border-radius: 2px;
    overflow: hidden;
    margin-top: var(--space-2);
  }

  .storage-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  /* ── Panels grid ── */
  .panels-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    margin-bottom: var(--space-6);
  }

  .panel {
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .panel-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  .panel-link {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    transition: color 0.1s ease;
  }

  .panel-link:hover {
    color: var(--color-text-dim);
  }

  .panel-empty {
    padding: var(--space-5) var(--space-4);
    display: flex;
    gap: var(--space-2);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .panel-empty a {
    color: var(--color-text-dim);
  }

  /* Key rows */
  .key-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
  }

  .key-row:last-child {
    border-bottom: none;
  }

  .key-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .key-dot-active {
    background: var(--color-success);
    box-shadow: 0 0 5px rgba(0, 204, 102, 0.4);
  }

  .key-dot-revoked {
    background: var(--color-text-muted);
  }

  .key-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .key-name {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .key-meta {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Bandwidth rows */
  .bw-rows {
    padding: var(--space-2) 0;
  }

  .bw-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-4);
  }

  .bw-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  .bw-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text);
    font-weight: 600;
  }

  .bw-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0 var(--space-4);
  }

  .storage-section {
    border-top: 1px solid var(--color-border);
    padding: var(--space-3) var(--space-4);
    margin-top: var(--space-1);
  }

  .storage-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-2);
  }

  .storage-track {
    height: 3px;
    background: var(--color-bg-4);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: var(--space-2);
  }

  .storage-fill-wide {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .storage-footer {
    display: flex;
    justify-content: space-between;
  }

  .storage-pct {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: 600;
  }

  .storage-free {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
  }

  /* ── Quick actions ── */
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
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
    transition: border-color 0.1s ease, background 0.1s ease;
  }

  .action-card:hover {
    border-color: var(--color-border-hover);
    background: var(--color-bg-3);
  }

  .action-icon {
    display: flex;
    color: var(--color-text-muted);
    opacity: 0.6;
  }

  .action-marker {
    font-family: var(--font-mono);
    color: var(--color-success);
    font-weight: 600;
    font-size: var(--font-size-sm);
  }

  .action-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text);
  }

  /* ── Responsive ── */

  /* Tablet: 2-col stats, 1-col panels */
  @media (max-width: 860px) {
    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .panels-grid {
      grid-template-columns: 1fr;
    }

    .actions-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Mobile: full single column */
  @media (max-width: 540px) {
    .dashboard {
      max-width: 100%;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-2);
    }

    .stat-value {
      font-size: var(--font-size-lg);
    }

    .panels-grid {
      grid-template-columns: 1fr;
      gap: var(--space-2);
    }

    .actions-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-2);
    }

    .action-card {
      padding: var(--space-2) var(--space-3);
    }

    .action-label {
      font-size: var(--font-size-xs);
    }

    /* On small screens, hide bandwidth panel detail in favour of storage stat card */
    .bw-row:last-child,
    .bw-divider:last-of-type {
      display: none;
    }
  }

  /* Very small: single column actions */
  @media (max-width: 360px) {
    .stats-grid {
      grid-template-columns: 1fr 1fr;
    }

    .actions-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
