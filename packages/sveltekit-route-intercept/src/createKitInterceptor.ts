import { goto, preloadData, pushState } from '$app/navigation';
import { base } from '$app/paths';
import { page } from '$app/state';
import { createInterceptor } from './createInterceptor';
import { defineIntercept } from './defineIntercept';
import { createInterceptLinkAction } from './interceptLink';
import type {
	ClickOptions,
	InterceptDefinition,
	JsonValue,
	NavigationDeps,
	OpenResult,
	RouteParamsFromPath
} from './types';

type KitInterceptorOptions = Pick<
	NavigationDeps<Record<string, unknown>>,
	'allowIntercept' | 'resolveHref' | 'handleRedirect'
>;

/**
 * Base configuration for creating a SvelteKit-native interceptor.
 */
type CreateKitInterceptorBaseConfig<TKey extends string, TRoute extends string> = {
	key: TKey;
	route: TRoute;
	href?: (params: RouteParamsFromPath<TRoute>) => string;
} & KitInterceptorOptions;

/**
 * Configuration for strict payload typing in `createKitInterceptor`.
 */
export type CreateKitInterceptorConfig<
	TKey extends string,
	TRoute extends string,
	TPayload extends JsonValue
> = CreateKitInterceptorBaseConfig<TKey, TRoute> & {
	parsePayload: (value: unknown) => value is TPayload;
};

/**
 * Configuration for JSON-safe interception using default payload validation.
 */
export type CreateKitInterceptorJsonConfig<TKey extends string, TRoute extends string> =
	CreateKitInterceptorBaseConfig<TKey, TRoute> & {
		parsePayload?: undefined;
	};

type KitPageState = Record<string, unknown>;

type KitInterceptorResult<
	TKey extends string,
	TRoute extends string,
	TPayload extends JsonValue
> = {
	definition: InterceptDefinition<TKey, TRoute, RouteParamsFromPath<TRoute>, TPayload>;
	href: (params: RouteParamsFromPath<TRoute>) => string;
	open: (params: RouteParamsFromPath<TRoute>, hrefOverride?: string) => Promise<OpenResult<TPayload>>;
	handleClick: (
		event: MouseEvent,
		options: ClickOptions<RouteParamsFromPath<TRoute>>
	) => Promise<OpenResult<TPayload>>;
	close: () => void;
	getPayload: (state: Record<string, unknown>) => TPayload | undefined;
	link: ReturnType<typeof createInterceptLinkAction<RouteParamsFromPath<TRoute>, TPayload>>;
	selected: () => TPayload | undefined;
};

function toKitInterceptorResult<
	TKey extends string,
	TRoute extends string,
	TPayload extends JsonValue
>(
	interceptor: ReturnType<
		typeof createInterceptor<
			TKey,
			TRoute,
			RouteParamsFromPath<TRoute>,
			TPayload,
			KitPageState
		>
	>,
	getCurrentState: () => KitPageState
): KitInterceptorResult<TKey, TRoute, TPayload> {
	const link = createInterceptLinkAction(interceptor);

	return {
		...interceptor,
		link,
		selected: () => interceptor.getPayload(getCurrentState())
	};
}

const ABSOLUTE_PROTOCOL = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

function withBasePath(href: string): string {
	if (!href || ABSOLUTE_PROTOCOL.test(href) || href.startsWith('//')) {
		return href;
	}

	if (!href.startsWith('/') || !base || base === '/') {
		return href;
	}

	if (href === base || href.startsWith(`${base}/`)) {
		return href;
	}

	return `${base}${href}`;
}

/**
 * Creates a SvelteKit-native interceptor with JSON-safe payload typing.
 *
 * @remarks
 * This overload uses `isJsonValue` for payload validation and is ideal when
 * your page data is already JSON-serializable.
 *
 * @typeParam TKey - Stable key used for payload storage in page state.
 * @typeParam TRoute - Route template like `/photos/[id]`.
 * @param config - Interceptor configuration and optional navigation hooks.
 * @returns SvelteKit-ready interceptor helpers, including `link` and `selected`.
 */
export function createKitInterceptor<
	TKey extends string,
	TRoute extends string
>(
	config: CreateKitInterceptorJsonConfig<TKey, TRoute>
): KitInterceptorResult<TKey, TRoute, JsonValue>;

/**
 * Creates a SvelteKit-native interceptor with strict payload typing.
 *
 * @remarks
 * This overload requires `parsePayload`, so `selected()` and intercepted
 * payloads are narrowed to `TPayload`.
 *
 * @typeParam TKey - Stable key used for payload storage in page state.
 * @typeParam TRoute - Route template like `/photos/[id]`.
 * @typeParam TPayload - Payload type accepted by `parsePayload`.
 * @param config - Interceptor configuration including `parsePayload`.
 * @returns SvelteKit-ready interceptor helpers, including `link` and `selected`.
 *
 * @example
 * ```ts
 * const photo = createKitInterceptor({
 * 	key: 'photo',
 * 	route: '/photos/[id]',
 * 	parsePayload: (value): value is { photo: { id: string } } => {
 * 		return typeof value === 'object' && value !== null && 'photo' in value;
 * 	}
 * });
 * ```
 */
export function createKitInterceptor<
	TKey extends string,
	TRoute extends string,
	TPayload extends JsonValue
>(config: CreateKitInterceptorConfig<TKey, TRoute, TPayload>): KitInterceptorResult<TKey, TRoute, TPayload>;

export function createKitInterceptor<
	TKey extends string,
	TRoute extends string,
	TPayload extends JsonValue
>(
	config: CreateKitInterceptorJsonConfig<TKey, TRoute> | CreateKitInterceptorConfig<TKey, TRoute, TPayload>
): KitInterceptorResult<TKey, TRoute, JsonValue | TPayload> {
	const { allowIntercept, resolveHref, handleRedirect, ...definitionConfig } = config;
	const getCurrentState = () => page.state as KitPageState;

	const navigation: NavigationDeps<KitPageState> = {
		preloadData,
		pushState,
		goto,
		getState: getCurrentState
	};

	if (allowIntercept) {
		navigation.allowIntercept = allowIntercept;
	}

	if (resolveHref) {
		navigation.resolveHref = resolveHref;
	} else {
		navigation.resolveHref = withBasePath;
	}

	if (handleRedirect) {
		navigation.handleRedirect = handleRedirect;
	}

	if ('parsePayload' in definitionConfig && definitionConfig.parsePayload) {
		const definition = defineIntercept(definitionConfig);
		const interceptor = createInterceptor(definition, navigation);
		return toKitInterceptorResult(interceptor, getCurrentState);
	}

	const definition = defineIntercept(definitionConfig);
	const interceptor = createInterceptor(definition, navigation);
	return toKitInterceptorResult(interceptor, getCurrentState);
}

export type { CreateKitInterceptorBaseConfig };
