<script lang="ts">
  interface Props {
    size?: number;
  }

  let { size = 18 }: Props = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M18 20V10" />
  <path d="M12 20V4" />
  <path d="M6 20v-6" />
</svg>
