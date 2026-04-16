import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Single interceptor route configuration consumed by the Vite plugin.
 */
export type InterceptorEntry = {
	key: string;
	route: string;
};

/**
 * Options for `sveltekitRouteIntercept` code generation.
 */
export type SveltekitRouteInterceptPluginOptions = {
	interceptors: readonly InterceptorEntry[];
	typesOutputFile?: string;
	runtimeOutputFile?: string;
	packageImport?: string;
};

const DEFAULT_TYPES_OUTPUT = 'src/intercept.generated.d.ts';
const DEFAULT_RUNTIME_OUTPUT = 'src/lib/interceptors.generated.ts';
const DEFAULT_PACKAGE_IMPORT = '@wiscaksono/sveltekit-route-intercept';
const DANGEROUS_IDENTIFIERS = new Set(['__proto__', 'prototype', 'constructor']);

const escapeStringLiteral = (value: string) => {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\r/g, '\\r')
		.replace(/\n/g, '\\n')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
};

const quoteString = (value: string) => {
	return `'${escapeStringLiteral(value)}'`;
};

const toIdentifier = (value: string) => {
	const cleaned = value.replace(/[^a-zA-Z0-9_$]/g, ' ');
	const words = cleaned
		.split(' ')
		.map((word) => word.trim())
		.filter(Boolean);

	if (words.length === 0) {
		return 'interceptor';
	}

	const [first = 'interceptor', ...rest] = words;
	const head = first.toLowerCase();
	const tail = rest.map((word) => word[0]?.toUpperCase() + word.slice(1).toLowerCase()).join('');

	const candidate = `${head}${tail}`;
	const identifier = /^[$A-Z_][0-9A-Z_$]*$/i.test(candidate) ? candidate : `_${candidate}`;

	if (DANGEROUS_IDENTIFIERS.has(identifier)) {
		return `_${identifier}`;
	}

	return identifier;
};

const assertPathWithinRoot = (rootPath: string, outputPath: string, label: string) => {
	const relativePath = relative(rootPath, outputPath);
	if (relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))) {
		return;
	}

	throw new Error(`${label} must stay inside project root: ${outputPath}`);
};

const writeFileIfChanged = (filePath: string, content: string) => {
	let currentContent: string | null = null;

	try {
		currentContent = readFileSync(filePath, 'utf8');
	} catch {
		currentContent = null;
	}

	if (currentContent === content) {
		return;
	}

	const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
	writeFileSync(temporaryPath, content);
	renameSync(temporaryPath, filePath);
};

/**
 * Generates route-interceptor type/runtime helpers for a SvelteKit project.
 *
 * @remarks
 * This plugin writes two files:
 * - a global page-state augmentation/types file
 * - runtime interceptor factory helpers
 *
 * Files are only written when content changes to reduce watch churn.
 *
 * @param options - Interceptor entries and optional output/import overrides.
 * @returns A Vite plugin that runs codegen during build start.
 *
 * @example
 * ```ts
 * import { sveltekitRouteIntercept } from '@wiscaksono/sveltekit-route-intercept/vite';
 *
 * export default defineConfig({
 * 	plugins: [
 * 		sveltekitRouteIntercept({
 * 			interceptors: [{ key: 'photo', route: '/photos/[id]' }]
 * 		})
 * 	]
 * });
 * ```
 */
export function sveltekitRouteIntercept(options: SveltekitRouteInterceptPluginOptions): Plugin {
	let root = process.cwd();

	return {
		name: 'sveltekit-route-intercept:codegen',
		configResolved(config) {
			root = config.root;
		},
		buildStart() {
			const uniqueKeys = new Set<string>();
			for (const entry of options.interceptors) {
				if (uniqueKeys.has(entry.key)) {
					throw new Error(`Duplicate interceptor key detected: ${entry.key}`);
				}
				uniqueKeys.add(entry.key);
			}

			const seenFactoryNames = new Map<string, string>();
			for (const entry of options.interceptors) {
				const generatedNames = [toIdentifier(entry.key), `${toIdentifier(entry.key)}Typed`];

				for (const generatedName of generatedNames) {
					const existing = seenFactoryNames.get(generatedName);
					if (existing && existing !== entry.key) {
						throw new Error(
							`Interceptor keys \"${existing}\" and \"${entry.key}\" collide to generated factory \"${generatedName}\"`
						);
					}

					seenFactoryNames.set(generatedName, entry.key);
				}
			}

			const typesOutputPath = resolve(root, options.typesOutputFile ?? DEFAULT_TYPES_OUTPUT);
			const runtimeOutputPath = resolve(root, options.runtimeOutputFile ?? DEFAULT_RUNTIME_OUTPUT);

			assertPathWithinRoot(root, typesOutputPath, 'typesOutputFile');
			assertPathWithinRoot(root, runtimeOutputPath, 'runtimeOutputFile');

			mkdirSync(dirname(typesOutputPath), { recursive: true });
			mkdirSync(dirname(runtimeOutputPath), { recursive: true });

			const packageImport = options.packageImport ?? DEFAULT_PACKAGE_IMPORT;

			const keys = options.interceptors.map((entry) => quoteString(entry.key)).join(' | ') || 'never';

			const shape = options.interceptors
				.map((entry) => `\t\t\t${quoteString(entry.key)}?: unknown;`)
				.join('\n');

			const routeMap = options.interceptors
				.map((entry) => `\t${quoteString(entry.key)}: ${quoteString(entry.route)};`)
				.join('\n');

			const typesContent = [
				'// Generated by @wiscaksono/sveltekit-route-intercept/vite',
				'// Do not edit manually.',
				'',
				`import type { RouteParamsFromPath } from ${quoteString(packageImport)};`,
				'',
				`export type InterceptKeys = ${keys};`,
				'',
				'export type InterceptRouteMap = {',
				routeMap || '\t[key: string]: never;',
				'};',
				'',
				'export type InterceptParams<K extends InterceptKeys> = RouteParamsFromPath<InterceptRouteMap[K]>;',
				'',
				'declare global {',
				'\tnamespace App {',
				'\t\tinterface PageState {',
				`\t\t\t__routeIntercept?: {\n${shape}\n\t\t\t};`,
				'\t\t}',
				'\t}',
				'}',
				'',
				'export {};',
				''
			].join('\n');

			const runtimeFactories = options.interceptors
				.map((entry) => {
					const factoryName = toIdentifier(entry.key);
					const typedFactoryName = `${factoryName}Typed`;
					const keyLiteral = quoteString(entry.key);
					const routeLiteral = quoteString(entry.route);
					return [
						`\t${factoryName}: (config: Omit<CreateKitInterceptorJsonConfig<${keyLiteral}, ${routeLiteral}>, 'key' | 'route'> = {}) =>`,
						`\t\tcreateKitInterceptor<${keyLiteral}, ${routeLiteral}>({`,
						'\t\t\t...config,',
						`\t\t\tkey: ${keyLiteral},`,
						`\t\t\troute: ${routeLiteral}`,
						'\t\t}),',
						`\t${typedFactoryName}: <TPayload extends JsonValue>(config: Omit<CreateKitInterceptorConfig<${keyLiteral}, ${routeLiteral}, TPayload>, 'key' | 'route'>) =>`,
						`\t\tcreateKitInterceptor<${keyLiteral}, ${routeLiteral}, TPayload>({`,
						'\t\t\t...config,',
						`\t\t\tkey: ${keyLiteral},`,
						`\t\t\troute: ${routeLiteral}`,
						'\t\t})'
					].join('\n');
				})
				.join(',\n');

			const runtimeContent = [
				'// Generated by @wiscaksono/sveltekit-route-intercept/vite',
				'// Do not edit manually.',
				'',
				`import { createKitInterceptor, type CreateKitInterceptorConfig, type CreateKitInterceptorJsonConfig, type JsonValue } from ${quoteString(packageImport)};`,
				'',
				'export const interceptors = {',
				runtimeFactories || '\t// no interceptors configured',
				'} as const;',
				''
			].join('\n');

			writeFileIfChanged(typesOutputPath, typesContent);
			writeFileIfChanged(runtimeOutputPath, runtimeContent);
		}
	};
}
