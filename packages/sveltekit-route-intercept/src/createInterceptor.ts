import { getInterceptPayload, withInterceptPayload } from './state';
import type {
	ClickOptions,
	InterceptDefinition,
	JsonValue,
	NavigationDeps,
	OpenResult,
	PreloadResult,
	RouteParams
} from './types';

const DEFAULT_ALLOW_INTERCEPT = (event: MouseEvent) => {
	if (event.defaultPrevented) return false;
	if (event.button !== 0) return false;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
	return typeof window === 'undefined' || window.innerWidth >= 768;
};

const ABSOLUTE_PROTOCOL = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

type AnchorLike = {
	target?: string | null;
	href?: string;
	hasAttribute?: (name: string) => boolean;
	getAttribute?: (name: string) => string | null;
};

const isExternalLink = (href: string) => {
	if (!href || (!ABSOLUTE_PROTOCOL.test(href) && !href.startsWith('//'))) {
		return false;
	}

	if (typeof window === 'undefined') {
		return false;
	}

	try {
		const resolved = new URL(href, window.location.href);
		return resolved.origin !== window.location.origin;
	} catch {
		return true;
	}
};

const shouldBypassAnchorSemantics = (event: MouseEvent, href: string) => {
	if (!event.currentTarget || typeof event.currentTarget !== 'object') {
		return false;
	}

	const anchor = event.currentTarget as AnchorLike;
	const target = (anchor.target ?? anchor.getAttribute?.('target') ?? '').toLowerCase();
	if (target && target !== '_self') {
		return true;
	}

	if (anchor.hasAttribute?.('download')) {
		return true;
	}

	return isExternalLink(anchor.href ?? href);
};

/**
 * Creates an interceptor from a definition and navigation dependencies.
 *
 * @remarks
 * The returned object provides href generation, programmatic open, click
 * handling, close navigation, and payload extraction from page state.
 *
 * @typeParam TKey - Stable key used for payload storage in page state.
 * @typeParam TRoute - Route template represented by the definition.
 * @typeParam TParams - Route parameter shape used by href/open.
 * @typeParam TPayload - Parsed payload type stored after interception.
 * @typeParam TPageState - Concrete page state object used by navigation.
 * @param definition - Interceptor definition created by `defineIntercept`.
 * @param navigation - Adapter around preload, pushState, goto, and state reads.
 * @returns Interceptor helpers for open/click/close and payload access.
 *
 * @example
 * ```ts
 * const definition = defineIntercept({
 * 	key: 'photo',
 * 	route: '/photos/[id]',
 * 	parsePayload: (value): value is { photo: { id: string } } => {
 * 		return typeof value === 'object' && value !== null && 'photo' in value;
 * 	}
 * });
 *
 * const interceptor = createInterceptor(definition, navigationDeps);
 * ```
 */
export function createInterceptor<
	TKey extends string,
	TRoute extends string,
	TParams extends RouteParams,
	TPayload extends JsonValue,
	TPageState extends Record<string, unknown>
>(
	definition: InterceptDefinition<TKey, TRoute, TParams, TPayload>,
	navigation: NavigationDeps<TPageState>
) {
	const allowIntercept = navigation.allowIntercept ?? DEFAULT_ALLOW_INTERCEPT;

	const resolveHref = (href: string) => {
		return navigation.resolveHref ? navigation.resolveHref(href) : href;
	};

	const handleRedirect = async (location: string) => {
		if (navigation.handleRedirect) {
			await navigation.handleRedirect(location);
			return;
		}

		if (typeof window !== 'undefined') {
			window.location.href = location;
		}
	};

	const open = async (params: TParams, hrefOverride?: string): Promise<OpenResult<TPayload>> => {
		const href = resolveHref(hrefOverride ?? definition.href(params));
		let result: PreloadResult;

		try {
			result = await navigation.preloadData(href);
		} catch {
			await navigation.goto(href);
			return { type: 'navigated', href };
		}

		if (result.type === 'redirect') {
			await handleRedirect(result.location);
			return { type: 'redirected', location: result.location };
		}

		if (result.status >= 200 && result.status < 300 && definition.parsePayload(result.data)) {
			const nextState = withInterceptPayload(navigation.getState(), definition.key, result.data);
			navigation.pushState(href, nextState);
			return { type: 'intercepted', href, payload: result.data };
		}

		await navigation.goto(href);
		return { type: 'navigated', href };
	};

	const handleClick = async (
		event: MouseEvent,
		options: ClickOptions<TParams>
	): Promise<OpenResult<TPayload>> => {
		const href = options.href ?? definition.href(options.params);

		if (shouldBypassAnchorSemantics(event, href)) {
			return { type: 'bypassed', href: resolveHref(href) };
		}

		if (!allowIntercept(event)) {
			return { type: 'bypassed', href: resolveHref(href) };
		}

		event.preventDefault();
		return open(options.params, href);
	};

	return {
		definition,
		href: (params: TParams) => resolveHref(definition.href(params)),
		open,
		handleClick,
		close: () => {
			if (typeof history !== 'undefined') history.back();
		},
		getPayload: (state: Record<string, unknown>) => {
			return getInterceptPayload<TKey, TPayload>(state, definition.key);
		}
	};
}
