import type { Action } from 'svelte/action';
import type { JsonValue, RouteParams } from './types';

type InterceptorLike<TParams extends RouteParams, TPayload extends JsonValue> = {
	href: (params: TParams) => string;
	handleClick: (event: MouseEvent, options: { params: TParams; href?: string }) => Promise<
		| { type: 'intercepted'; payload: TPayload }
		| { type: 'redirected'; location: string }
		| { type: 'navigated'; href: string }
		| { type: 'bypassed'; href: string }
	>;
};

/**
 * Parameters consumed by the link action returned from `createInterceptLinkAction`.
 */
export type InterceptLinkOptions<TParams extends RouteParams, TPayload extends JsonValue> = {
	params: TParams;
	disabled?: boolean;
};

/**
 * Creates a Svelte action that wires an anchor element to an interceptor.
 *
 * @remarks
 * The action keeps `href` in sync with route params and forwards click events
 * to `interceptor.handleClick` unless disabled.
 *
 * @typeParam TParams - Route parameter shape accepted by the interceptor.
 * @typeParam TPayload - Payload type returned when interception succeeds.
 * @param interceptor - Interceptor created by `createInterceptor` or `createKitInterceptor`.
 * @returns A Svelte action for `<a use:...>`.
 *
 * @example
 * ```svelte
 * <a use:photo.link={{ params: { id: photoId } }}>Open photo</a>
 * ```
 */
export function createInterceptLinkAction<TParams extends RouteParams, TPayload extends JsonValue>(
	interceptor: InterceptorLike<TParams, TPayload>
) {
	const action: Action<HTMLAnchorElement, InterceptLinkOptions<TParams, TPayload>> = (node, options) => {
		let current = options;

		const syncHref = () => {
			node.setAttribute('href', interceptor.href(current.params));
		};

		syncHref();

		const onClick = (event: MouseEvent) => {
			if (current.disabled) return;

			const href = node.getAttribute('href') ?? interceptor.href(current.params);

			void interceptor.handleClick(event, {
				params: current.params,
				href
			});
		};

		node.addEventListener('click', onClick);

		return {
			update(next) {
				current = next;
				syncHref();
			},
			destroy() {
				node.removeEventListener('click', onClick);
			}
		};
	};

	return action;
}
