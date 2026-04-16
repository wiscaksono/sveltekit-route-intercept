<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		onclose,
		children
	}: {
		title: string;
		onclose: () => void;
		children: Snippet;
	} = $props();
</script>

<div
	class="overlay"
	role="button"
	tabindex="0"
	aria-label="Close modal"
	onclick={(event) => event.target === event.currentTarget && onclose()}
	onkeydown={(event) => event.key === 'Escape' && onclose()}
>
	<div class="dialog" role="dialog" aria-modal="true" aria-label={title}>
		<header>
			<h2>{title}</h2>
			<button type="button" onclick={onclose}>Close</button>
		</header>
		<section>{@render children()}</section>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 30;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgb(15 23 42 / 0.62);
	}

	.dialog {
		width: min(680px, 100%);
		border-radius: 18px;
		overflow: hidden;
		background: white;
		box-shadow: 0 28px 50px rgb(15 23 42 / 0.3);
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.9rem 1rem;
		border-bottom: 1px solid #e2e8f0;
	}

	h2 {
		margin: 0;
		font-size: 1rem;
	}

	button {
		border: none;
		border-radius: 8px;
		padding: 0.45rem 0.7rem;
		background: #e2e8f0;
		cursor: pointer;
	}

	section {
		padding: 1rem;
	}
</style>
