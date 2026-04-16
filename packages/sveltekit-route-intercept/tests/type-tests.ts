import {
	createInterceptor,
	createKitInterceptor,
	defineIntercept,
	withInterceptPayload,
	type NavigationDeps
} from '../src';

type PhotoPayload = {
	photo: {
		id: string;
		title: string;
	};
};

const isPhotoPayload = (value: unknown): value is PhotoPayload => {
	return typeof value === 'object' && value !== null && 'photo' in value;
};

const photoIntercept = defineIntercept({
	key: 'photo',
	route: '/photos/[id]',
	parsePayload: isPhotoPayload
});

const trustIntercept = defineIntercept({
	key: 'trust',
	route: '/photos/[id]'
});

trustIntercept.href({ id: 'x' });

// @ts-expect-error parsePayload is required when payload type is explicit
defineIntercept<'typed-photo', '/photos/[id]', PhotoPayload>({
	key: 'typed-photo',
	route: '/photos/[id]'
});

const photoHref = photoIntercept.href({ id: 'aurora-lake' });
const photoHrefTypecheck: string = photoHref;
void photoHrefTypecheck;

// @ts-expect-error missing required route param
photoIntercept.href({});

// @ts-expect-error extra param should not be accepted
photoIntercept.href({ id: 'aurora-lake', slug: 'x' });

const docsIntercept = defineIntercept({
	key: 'docs',
	route: '/docs/[...slug]',
	parsePayload(value): value is { markdown: string } {
		return typeof value === 'object' && value !== null;
	}
});

docsIntercept.href({ slug: ['guide', 'intro'] });
// @ts-expect-error catch-all requires array value
docsIntercept.href({ slug: 'guide' });

const optionalIntercept = defineIntercept({
	key: 'optional-docs',
	route: '/docs/[[...slug]]',
	parsePayload(value): value is { markdown: string } {
		return typeof value === 'object' && value !== null;
	}
});

optionalIntercept.href({});
optionalIntercept.href({ slug: ['guide'] });

type PageState = {
	count: number;
	__routeIntercept?: {
		photo?: PhotoPayload;
	};
};

const deps: NavigationDeps<PageState> = {
	preloadData: async () => ({
		type: 'loaded',
		status: 200,
		data: {
			photo: {
				id: 'aurora-lake',
				title: 'Aurora Lake'
			}
		}
	}),
	pushState: () => {},
	goto: async () => {},
	getState: () => ({ count: 0 })
};

const interceptor = createInterceptor(photoIntercept, deps);

interceptor.href({ id: 'coast-mist' });
// @ts-expect-error id is required
interceptor.href({});

const stateWithPayload = withInterceptPayload({ count: 1 }, 'photo', {
	photo: { id: 'x', title: 't' }
});

const payload = interceptor.getPayload(stateWithPayload);
if (payload) {
	const idTypecheck: string = payload.photo.id;
	void idTypecheck;
}

const kitInterceptor = createKitInterceptor<'photo', '/photos/[id]', PhotoPayload>({
	key: 'photo',
	route: '/photos/[id]',
	parsePayload: isPhotoPayload
});

kitInterceptor.href({ id: 'foo' });
// @ts-expect-error id is required for inferred route params
kitInterceptor.href({});

const jsonKitInterceptor = createKitInterceptor({
	key: 'photo-json',
	route: '/photos/[id]'
});

jsonKitInterceptor.href({ id: 'x' });

// @ts-expect-error parsePayload is required when payload type is explicit
createKitInterceptor<'photo-strict', '/photos/[id]', PhotoPayload>({
	key: 'photo-strict',
	route: '/photos/[id]'
});
