import { sveltekitRouteIntercept } from '@wiscaksono/sveltekit-route-intercept/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
	resolve: {
		alias: {
			'@wiscaksono/sveltekit-route-intercept': resolve(
				__dirname,
				'../../packages/sveltekit-route-intercept/src/index.ts'
			),
			'@wiscaksono/sveltekit-route-intercept/vite': resolve(
				__dirname,
				'../../packages/sveltekit-route-intercept/src/vite.ts'
			)
		}
	},
	plugins: [
		sveltekitRouteIntercept({
			interceptors: [{ key: 'photo', route: '/photos/[id]' }]
		}),
		sveltekit()
	]
});
