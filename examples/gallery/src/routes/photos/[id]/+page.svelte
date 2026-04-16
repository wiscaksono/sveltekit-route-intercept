<script lang="ts">
	import type { Photo } from '$lib/photos';

	let { data }: { data: { photo: Photo } } = $props();
</script>

<article class="detail">
	<div class="visual" style={`background: linear-gradient(155deg, ${data.photo.color}, #0f172a);`}></div>
	<h1>{data.photo.title}</h1>
	<p class="location">{data.photo.location}</p>
	<p>{data.photo.description}</p>
</article>

<style>
	.detail {
		display: grid;
		gap: 0.8rem;
	}

	.visual {
		height: 280px;
		border-radius: 14px;
	}

	h1,
	p {
		margin: 0;
	}

	.location {
		font-size: 0.82rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #64748b;
	}
</style>
