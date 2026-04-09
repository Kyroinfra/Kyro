<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { formatBytes, formatNumber } from '$lib/utils/format';

	interface Props {
		data: {
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
	let selectedRange = $state<'7' | '30' | '90'>('30');

	const filteredData = $derived(() => {
		const days = parseInt(selectedRange);
		return data.daily.slice(0, days).reverse();
	});

	const totalBandwidth = $derived(data.stats.totalBytesIn + data.stats.totalBytesOut);

	function renderChart() {
		if (chart) {
			chart.destroy();
		}

		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;

		const chartData = filteredData();

		chart = new Chart(ctx, {
			type: 'line',
			data: {
				labels: chartData.map(d => {
					const date = new Date(d.date);
					return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
				}),
				datasets: [
					{
						label: 'Requests',
						data: chartData.map(d => d.requests),
						borderColor: '#6366f1',
						backgroundColor: 'rgba(99, 102, 241, 0.1)',
						fill: true,
						tension: 0.3,
						yAxisID: 'y'
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					intersect: false,
					mode: 'index'
				},
				plugins: {
					legend: {
						display: false
					},
					tooltip: {
						backgroundColor: '#17171a',
						titleColor: '#e8e8ed',
						bodyColor: '#6b6b78',
						borderColor: '#2a2a30',
						borderWidth: 1,
						padding: 12,
						displayColors: false
					}
				},
				scales: {
					x: {
						grid: {
							color: '#2a2a30',
							drawTicks: false
						},
						ticks: {
							color: '#6b6b78',
							font: { size: 11 }
						}
					},
					y: {
						position: 'right',
						grid: {
							color: '#2a2a30',
							drawTicks: false
						},
						ticks: {
							color: '#6b6b78',
							font: { size: 11 },
							callback: (value: number | string) => formatNumber(Number(value))
						}
					}
				}
			}
		});
	}

	onMount(() => {
		renderChart();
		return () => {
			if (chart) chart.destroy();
		};
	});

	$effect(() => {
		selectedRange;
		if (chartCanvas) {
			renderChart();
		}
	});
</script>

<svelte:head>
	<title>Usage - Kyro</title>
</svelte:head>

<div class="usage-page">
	<header class="page-header">
		<div>
			<h1>Usage</h1>
			<p class="subtitle">Monitor your API usage and resource consumption</p>
		</div>
	</header>

	<div class="stats-grid">
		<Card>
			<div class="stat-card">
				<span class="stat-icon">📊</span>
				<div class="stat-info">
					<span class="stat-value">{formatNumber(data.stats.totalRequests)}</span>
					<span class="stat-label">Total Requests</span>
				</div>
			</div>
		</Card>
		<Card>
			<div class="stat-card">
				<span class="stat-icon">📥</span>
				<div class="stat-info">
					<span class="stat-value">{formatBytes(data.stats.totalBytesIn)}</span>
					<span class="stat-label">Data In</span>
				</div>
			</div>
		</Card>
		<Card>
			<div class="stat-card">
				<span class="stat-icon">📤</span>
				<div class="stat-info">
					<span class="stat-value">{formatBytes(data.stats.totalBytesOut)}</span>
					<span class="stat-label">Data Out</span>
				</div>
			</div>
		</Card>
		<Card>
			<div class="stat-card">
				<span class="stat-icon">💾</span>
				<div class="stat-info">
					<span class="stat-value">{formatBytes(data.stats.totalStorage)}</span>
					<span class="stat-label">Storage Used</span>
				</div>
			</div>
		</Card>
	</div>

	<Card>
		<div class="chart-header">
			<h2>Request History</h2>
			<div class="range-selector">
				<button
					class="range-btn"
					class:active={selectedRange === '7'}
					onclick={() => (selectedRange = '7')}
				>
					7D
				</button>
				<button
					class="range-btn"
					class:active={selectedRange === '30'}
					onclick={() => (selectedRange = '30')}
				>
					30D
				</button>
				<button
					class="range-btn"
					class:active={selectedRange === '90'}
					onclick={() => (selectedRange = '90')}
				>
					90D
				</button>
			</div>
		</div>
		<div class="chart-container">
			<canvas bind:this={chartCanvas}></canvas>
		</div>
	</Card>
</div>

<style>
	.usage-page {
		max-width: 1200px;
	}

	.page-header {
		margin-bottom: var(--space-6);
	}

	.page-header h1 {
		font-size: var(--font-size-2xl);
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
	}

	.subtitle {
		color: var(--color-text-muted);
		margin-top: var(--space-1);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.stat-icon {
		font-size: 24px;
	}

	.stat-info {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: var(--font-size-xl);
		font-weight: 600;
		color: var(--color-text);
	}

	.stat-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.chart-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.chart-header h2 {
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-text);
		margin: 0;
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
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.range-btn:hover {
		color: var(--color-text);
	}

	.range-btn.active {
		background: var(--color-accent);
		color: white;
	}

	.chart-container {
		height: 300px;
		position: relative;
	}
</style>