<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import Chart from "chart.js/auto";
  import Card from "$lib/components/ui/Card.svelte";
  import { formatBytes, formatNumber } from "$lib/utils/format";

  interface Props {
    data: {
      range: string;
      stats: {
        totalRequests: number;
        totalBytesIn: number;
        totalBytesOut: number;
        totalStorage: number;
        activeApiKeys: number;
      };
      daily: Array<{
        date: string;
        requests: number;
        bytesIn: number;
        bytesOut: number;
      }>;
    };
  }

  let { data }: Props = $props();

  let chartCanvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  // selectedRange is derived from the server-loaded range so it always
  // stays in sync after navigation.
  let selectedRange = $derived(data.range as "7" | "30" | "90");

  function changeRange(r: "7" | "30" | "90") {
    goto(`?range=${r}`, { keepFocus: true });
  }

  function renderChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }

    const ctx = chartCanvas?.getContext("2d");
    if (!ctx) return;

    // Data arrives pre-filtered from the server; just reverse to chronological order
    const displayData = [...data.daily].reverse();

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: displayData.map((d) => {
          const date = new Date(d.date);
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        }),
        datasets: [
          {
            label: "Requests",
            data: displayData.map((d) => d.requests),
            borderColor: "#ffffff",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            fill: true,
            tension: 0.3,
            yAxisID: "y",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: "#0a0a0a",
            titleColor: "#ffffff",
            bodyColor: "#666666",
            borderColor: "#1a1a1a",
            borderWidth: 1,
            padding: 12,
            displayColors: false,
          },
        },
        scales: {
          x: {
            grid: {
              color: "#1a1a1a",
              drawTicks: false,
            },
            ticks: {
              color: "#6b6b78",
              font: { size: 11 },
            },
          },
          y: {
            position: "right",
            grid: {
              color: "#2a2a30",
              drawTicks: false,
            },
            ticks: {
              color: "#6b6b78",
              font: { size: 11 },
              callback: (value: number | string) => formatNumber(Number(value)),
            },
          },
        },
      },
    });
  }

  onMount(() => {
    renderChart();
    return () => {
      if (chart) chart.destroy();
    };
  });

  // Re-render whenever the server sends fresh data (i.e. after range navigation)
  $effect(() => {
    // Touch data.daily so the effect tracks it
    void data.daily;
    if (chartCanvas) renderChart();
  });
</script>

<svelte:head>
  <title>Usage - Kyro</title>
</svelte:head>

<div class="usage-page">
  <header class="page-header">
    <div class="header-content">
      <span class="prompt">$</span>
      <span class="command">./usage.sh</span>
    </div>
  </header>

  <div class="stats-grid">
    <Card>
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Total Requests</span>
          <span class="stat-value">
            <span class="bracket">[</span>
            {formatNumber(data.stats.totalRequests)}
            <span class="bracket">]</span>
          </span>
        </div>
      </div>
    </Card>
    <Card>
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Data In</span>
          <span class="stat-value">
            <span class="bracket">[</span>
            {formatBytes(data.stats.totalBytesIn)}
            <span class="bracket">]</span>
          </span>
        </div>
      </div>
    </Card>
    <Card>
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Data Out</span>
          <span class="stat-value">
            <span class="bracket">[</span>
            {formatBytes(data.stats.totalBytesOut)}
            <span class="bracket">]</span>
          </span>
        </div>
      </div>
    </Card>
    <Card>
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Storage</span>
          <span class="stat-value">
            <span class="bracket">[</span>
            {formatBytes(data.stats.totalStorage)}
            <span class="bracket">]</span>
          </span>
        </div>
      </div>
    </Card>
    <Card>
      <div class="stat-card">
        <div class="stat-info">
          <span class="stat-label">Active API Keys</span>
          <span class="stat-value">
            <span class="bracket">[</span>
            {formatNumber(data.stats.activeApiKeys)}
            <span class="bracket">]</span>
          </span>
        </div>
      </div>
    </Card>
  </div>

  <Card>
    <div class="chart-header">
      <span class="chart-title">// Request History</span>
      <div class="range-selector">
        {#each (["7", "30", "90"] as const) as r}
          <button
            class="range-btn"
            class:active={selectedRange === r}
            onclick={() => changeRange(r)}
          >
            <span class="range-marker">[</span>{r}d<span class="range-marker">]</span>
          </button>
        {/each}
      </div>
    </div>
    <div class="chart-container">
      {#if data.daily.length === 0}
        <div class="chart-empty">
          <span class="chart-empty-text">// no data for this period</span>
        </div>
      {:else}
        <canvas bind:this={chartCanvas}></canvas>
      {/if}
    </div>
  </Card>
</div>

<style>
  .usage-page {
    max-width: 1200px;
  }

  .page-header {
    margin-bottom: var(--space-5);
  }

  .header-content {
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

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-3);
    margin-bottom: var(--space-5);
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .stat-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .stat-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  .bracket {
    color: var(--color-text-muted);
  }

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-4);
  }

  .chart-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  .range-selector {
    display: flex;
    gap: var(--space-1);
    background: var(--color-bg);
    padding: var(--space-1);
    border-radius: var(--radius-md);
  }

  .range-btn {
    padding: var(--space-1) var(--space-3);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--color-text-muted);
    font-size: var(--font-size-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .range-btn:hover {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.03);
  }

  .range-btn.active {
    background: var(--color-accent);
    color: var(--color-bg);
    border-color: var(--color-accent);
    font-weight: 600;
  }

  .range-btn:not(.active) {
    color: #8b8b98;
  }

  .chart-container {
    height: 300px;
    position: relative;
  }

  .chart-empty {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .chart-empty-text {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-ghost);
  }

  @media (max-width: 640px) {
    .usage-page {
      max-width: 100%;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .chart-header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-3);
    }

    .range-selector {
      align-self: stretch;
      justify-content: space-between;
    }

    .range-btn {
      flex: 1;
      text-align: center;
    }

    .chart-container {
      height: 220px;
    }
  }
</style>
