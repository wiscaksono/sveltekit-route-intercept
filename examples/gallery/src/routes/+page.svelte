<main class="home">
	<p class="pill">@wiscaksono/sveltekit-route-intercept</p>
	<h1>SvelteKit Route Interception</h1>
	<p>
		This demo shows Next-style modal interception using shallow history state while preserving canonical
		routes.
	</p>
	<a href="/photos">Open gallery demo</a>
</main>

<style>
	.home {
		max-width: 720px;
		margin: 0 auto;
		padding: 4rem 1.2rem;
		display: grid;
		gap: 1rem;
	}

	.pill {
		width: fit-content;
		padding: 0.3rem 0.6rem;
		font-size: 0.75rem;
		border-radius: 999px;
		background: #e2e8f0;
	}

	h1 {
		margin: 0;
		font-size: clamp(2rem, 4vw, 2.8rem);
	}

	p {
		margin: 0;
		line-height: 1.6;
	}

	a {
		width: fit-content;
		padding: 0.75rem 1rem;
		border-radius: 10px;
		text-decoration: none;
		font-weight: 600;
		color: white;
		background: #0f172a;
	}
</style>
