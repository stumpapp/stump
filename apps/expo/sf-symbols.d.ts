export {}

// https://github.com/nandorojo/sf-symbols-typescript/issues/8
// ^ there is a patch based off of the PR for that issue, i've subscribed.
// hopefully it gets merged

declare module 'sf-symbols-typescript' {
	interface CustomSymbols {
		'comic.bubble': true
		manga: true
	}
}
