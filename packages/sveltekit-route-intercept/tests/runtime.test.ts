import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createInterceptor } from '../src/createInterceptor';
import { defineIntercept } from '../src/defineIntercept';
import { interpolateRoutePath } from '../src/internal/route';
import { sveltekitRouteIntercept } from '../src/vite';

describe('interpolateRoutePath', () => {
	it('handles optional catch-all with empty array', () => {
		expect(interpolateRoutePath('/docs/[[...slug]]', { slug: [] })).toBe('/docs');
		expect(interpolateRoutePath('/docs/[[...slug]]', {})).toBe('/docs');
		expect(interpolateRoutePath('/docs/[[...slug]]', { slug: ['guide', 'intro'] })).toBe(
			'/docs/guide/intro'
		);
	});
});

describe('createInterceptor', () => {
	it('falls back to goto when preloadData throws', async () => {
		const definition = defineIntercept({
			key: 'photo',
			route: '/photos/[id]'
		});

		const goto = vi.fn(async () => {});
		const preloadData = vi.fn(async () => {
			throw new Error('boom');
		});

		const interceptor = createInterceptor(definition, {
			preloadData,
			pushState: vi.fn(),
			goto,
			getState: () => ({})
		});

		const result = await interceptor.open({ id: 'aurora-lake' });

		expect(result).toEqual({ type: 'navigated', href: '/photos/aurora-lake' });
		expect(goto).toHaveBeenCalledWith('/photos/aurora-lake');
	});

	it('bypasses interception for target _blank and download links', async () => {
		const definition = defineIntercept({
			key: 'photo',
			route: '/photos/[id]'
		});

		const preloadData = vi.fn(async () => ({ type: 'loaded' as const, status: 200, data: {} }));

		const interceptor = createInterceptor(definition, {
			preloadData,
			pushState: vi.fn(),
			goto: vi.fn(async () => {}),
			getState: () => ({})
		});

		const blankResult = await interceptor.handleClick(
			{
				defaultPrevented: false,
				button: 0,
				metaKey: false,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				currentTarget: {
					target: '_blank',
					href: '/photos/aurora-lake',
					hasAttribute: () => false,
					getAttribute: () => '_blank'
				},
				preventDefault: vi.fn()
			} as unknown as MouseEvent,
			{ params: { id: 'aurora-lake' } }
		);

		const downloadResult = await interceptor.handleClick(
			{
				defaultPrevented: false,
				button: 0,
				metaKey: false,
				ctrlKey: false,
				shiftKey: false,
				altKey: false,
				currentTarget: {
					target: '',
					href: '/photos/aurora-lake',
					hasAttribute: (name: string) => name === 'download',
					getAttribute: () => null
				},
				preventDefault: vi.fn()
			} as unknown as MouseEvent,
			{ params: { id: 'aurora-lake' } }
		);

		expect(blankResult.type).toBe('bypassed');
		expect(downloadResult.type).toBe('bypassed');
		expect(preloadData).not.toHaveBeenCalled();
	});

	it('bypasses interception for external absolute links', async () => {
		const definition = defineIntercept({
			key: 'photo',
			route: '/photos/[id]'
		});

		const preloadData = vi.fn(async () => ({ type: 'loaded' as const, status: 200, data: {} }));

		const interceptor = createInterceptor(definition, {
			preloadData,
			pushState: vi.fn(),
			goto: vi.fn(async () => {}),
			getState: () => ({})
		});

		const previousWindow = globalThis.window;
		Object.defineProperty(globalThis, 'window', {
			value: {
				location: {
					href: 'https://app.test/gallery',
					origin: 'https://app.test'
				}
			},
			configurable: true
		});

		try {
			const result = await interceptor.handleClick(
				{
					defaultPrevented: false,
					button: 0,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
					currentTarget: {
						target: '',
						href: 'https://external.test/photos/aurora-lake',
						hasAttribute: () => false,
						getAttribute: () => null
					},
					preventDefault: vi.fn()
				} as unknown as MouseEvent,
				{ params: { id: 'aurora-lake' } }
			);

			expect(result.type).toBe('bypassed');
			expect(preloadData).not.toHaveBeenCalled();
		} finally {
			Object.defineProperty(globalThis, 'window', {
				value: previousWindow,
				configurable: true
			});
		}
	});
});

describe('vite plugin codegen', () => {
	it('throws on duplicate keys and generated factory collisions', () => {
		const root = mkdtempSync(join(tmpdir(), 'route-intercept-'));

		const duplicate = sveltekitRouteIntercept({
			interceptors: [
				{ key: 'photo', route: '/photos/[id]' },
				{ key: 'photo', route: '/photos/[slug]' }
			]
		});

		duplicate.configResolved?.({ root } as never);
		expect(() => duplicate.buildStart?.call({} as never)).toThrow(
			'Duplicate interceptor key detected: photo'
		);

		const colliding = sveltekitRouteIntercept({
			interceptors: [
				{ key: 'photo-item', route: '/photos/[id]' },
				{ key: 'photo item', route: '/photos/[slug]' }
			]
		});

		colliding.configResolved?.({ root } as never);
		expect(() => colliding.buildStart?.call({} as never)).toThrow('collide to generated factory');
	});

	it('escapes string literals and exposes configurable generated factories', () => {
		const root = mkdtempSync(join(tmpdir(), 'route-intercept-'));
		const plugin = sveltekitRouteIntercept({
			interceptors: [{ key: "pho'to", route: "/photos/'[id]" }]
		});

		plugin.configResolved?.({ root } as never);
		plugin.buildStart?.call({} as never);

		const types = readFileSync(join(root, 'src/intercept.generated.d.ts'), 'utf8');
		const runtime = readFileSync(join(root, 'src/lib/interceptors.generated.ts'), 'utf8');

		expect(types).toContain("'pho\\'to'");
		expect(runtime).toContain('CreateKitInterceptorJsonConfig<');
		expect(runtime).toContain('phoToTyped');
		expect(runtime).toContain('config: Omit<CreateKitInterceptorConfig<');
		expect(runtime).toContain("...config");
		expect(runtime).toContain("key: 'pho\\'to'");
		expect(runtime).toContain("route: '/photos/\\'[id]'");
	});

	it('rejects output paths outside project root', () => {
		const root = mkdtempSync(join(tmpdir(), 'route-intercept-'));
		const plugin = sveltekitRouteIntercept({
			interceptors: [{ key: 'photo', route: '/photos/[id]' }],
			typesOutputFile: '../outside/intercept.generated.d.ts'
		});

		plugin.configResolved?.({ root } as never);
		expect(() => plugin.buildStart?.call({} as never)).toThrow('typesOutputFile must stay inside project root');
	});
});
