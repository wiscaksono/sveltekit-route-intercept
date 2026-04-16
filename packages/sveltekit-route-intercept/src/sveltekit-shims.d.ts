declare module '$app/navigation' {
	export function preloadData(
		href: string
	): Promise<{ type: 'loaded'; status: number; data: Record<string, unknown> } | { type: 'redirect'; location: string }>;
	export function pushState(url: string | URL, state: Record<string, unknown>): void;
	export function goto(url: string | URL): Promise<void>;
}

declare module '$app/state' {
	export const page: {
		state: Record<string, unknown>;
	};
}

declare module '$app/paths' {
	export const base: string;
}
