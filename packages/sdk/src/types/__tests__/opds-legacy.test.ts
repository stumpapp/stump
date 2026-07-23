import { legacyFeed } from '../opds-legacy'

// note these tests are for the zod schema, not actual api (that would be xml)

test('numeric text nodes (author name, entry/feed title) are coerced to strings', () => {
	const raw = {
		id: 'id',
		title: 2099,
		author: { name: 1942 },
		link: [],
		entry: [
			{
				id: 1,
				title: 2099,
				author: { name: 1942 },
				link: [],
			},
		],
	}

	const feed = legacyFeed.parse(raw)

	expect(feed.title).toBe('2099')
	expect(feed.author?.name).toBe('1942')
	expect(feed.entries[0]?.title).toBe('2099')
	expect(feed.entries[0]?.authors[0]?.name).toBe('1942')
})
