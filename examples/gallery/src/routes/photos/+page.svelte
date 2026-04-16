<script lang="ts">
	import Modal from '$lib/Modal.svelte';
	import { interceptors } from '$lib/interceptors.generated';
	import PhotoPage from './[id]/+page.svelte';
	import type { Photo } from '$lib/photos';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type PhotoPayload = { photo: Photo };
	const isPhotoPayload = (value: unknown): value is PhotoPayload => {
		if (typeof value !== 'object' || value === null || !('photo' in value)) return false;

		const photo = (value as { photo?: unknown }).photo;
		return (
			typeof photo === 'object' &&
			photo !== null &&
			'id' in photo &&
			'title' in photo &&
			'description' in photo &&
			'location' in photo &&
			'color' in photo
		);
	};

	const photoIntercept = interceptors.photoTyped<PhotoPayload>({ parsePayload: isPhotoPayload });

	const selected = $derived(photoIntercept.selected());
</script>

<main class="gallery">
	<header>
		<h1>Intercepted gallery</h1>
		<p>
			Desktop clicks are intercepted into a modal with URL updates. Hard refresh on a photo URL keeps
			the canonical route behavior.
		</p>
	</header>

	<section>
		{#each data.thumbnails as item (item.id)}
			<a
				use:photoIntercept.link={{ params: { id: item.id } }}
				href={photoIntercept.href({ id: item.id })}
				class="card"
			>
				<div style={`background: linear-gradient(155deg, ${item.color}, #1e293b);`}></div>
				<h2>{item.title}</h2>
				<p>{item.location}</p>
			</a>
		{/each}
	</section>
</main>

{#if selected}
	<Modal title={selected.photo.title} onclose={() => photoIntercept.close()}>
		<PhotoPage data={selected} />
	</Modal>
{/if}

<style>
	.gallery {
		max-width: 1024px;
		margin: 0 auto;
		padding: 2rem 1.2rem 4rem;
		display: grid;
		gap: 1.2rem;
	}

	header h1,
	header p,
	h2 {
		margin: 0;
	}

	header p {
		line-height: 1.6;
		color: #334155;
	}

	section {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 0.9rem;
	}

	.card {
		display: grid;
		gap: 0.55rem;
		padding: 0.75rem;
		text-decoration: none;
		border-radius: 14px;
		border: 1px solid #dbe4f0;
		background: white;
		box-shadow: 0 8px 20px rgb(15 23 42 / 0.06);
	}

	.card div {
		height: 130px;
		border-radius: 10px;
	}

	.card p {
		margin: 0;
		font-size: 0.9rem;
		color: #64748b;
	}
</style>
