# @wiscaksono/sveltekit-route-intercept

Type-safe route interception for SvelteKit.

## What this library is

This library solves one pattern.

You have a real route like `/photos/[id]`, but when users click from inside the app, you want to show
that route in a modal. The URL still updates to the canonical route. If users refresh that URL or open
it directly, they still get the normal page route.

If you know Next.js Intercepting Routes, this is the same idea in SvelteKit:
https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes

Route params are inferred from route templates like `/photos/[id]` and `/docs/[...slug]`.

## Install

```bash
pnpm add @wiscaksono/sveltekit-route-intercept
```

## How to use

### 1) Configure the Vite plugin

```ts
import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { sveltekitRouteIntercept } from '@wiscaksono/sveltekit-route-intercept/vite';

export default defineConfig({
	plugins: [
		sveltekitRouteIntercept({
			interceptors: [{ key: 'photo', route: '/photos/[id]' }]
		}),
		sveltekit()
	]
});
```

This generates:

- `src/intercept.generated.d.ts`
- `src/lib/interceptors.generated.ts`

### 2) Use the generated interceptor in your page

```svelte
<script lang="ts">
	import Modal from '$lib/Modal.svelte';
	import { interceptors } from '$lib/interceptors.generated';

	type PhotoPayload = { photo: { id: string; title: string } };

	const isPhotoPayload = (value: unknown): value is PhotoPayload => {
		return typeof value === 'object' && value !== null && 'photo' in value;
	};

	const photo = interceptors.photoTyped<PhotoPayload>({
		parsePayload: isPhotoPayload
	});

	const selected = $derived(photo.selected());
</script>

<a use:photo.link={{ params: { id: 'aurora-lake' } }} href={photo.href({ id: 'aurora-lake' })}>
	Open photo
</a>

{#if selected}
	<Modal title={selected.photo.title} onclose={() => photo.close()}>
		<!-- render route content -->
	</Modal>
{/if}
```

### 3) Choose your typing mode

- `interceptors.photo()` uses JSON-safe payload validation.
- `interceptors.photoTyped<TPayload>({ parsePayload })` requires a type guard and gives strict payload typing.

## Behavior

- Interception runs on normal in-app left-click navigation.
- `_blank`, `download`, modified clicks, and external links are bypassed.
- If preload fails, redirects, or payload parsing fails, navigation falls back to `goto`.

## Lower-level APIs

If you want lower-level control, these are also exported:

- `defineIntercept`
- `createInterceptor`
- `createKitInterceptor`
- `createInterceptLinkAction`

## Type tests

Run package type-level contract tests:

```bash
pnpm --filter @wiscaksono/sveltekit-route-intercept test:types
```
