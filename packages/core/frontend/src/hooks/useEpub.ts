import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import { getEpubBaseUrl, getEpubById } from '~api/query/epub';

interface EpubOptions {
	loc?: string;
}

export function useEpub(id: string, options?: EpubOptions) {
	const [chapter, setChapter] = useState(2);

	const { isLoading: isFetchingBook, data: epub } = useQuery(['getEpubById', id], {
		queryFn: () => getEpubById(id).then((res) => res.data),
	});

	const actions = useMemo(
		() => ({
			currentResource() {
				return epub?.toc.find((item) => item.playOrder === chapter);
			},
			hasNext() {},
			hasPrevious() {},
			next() {},
			previous() {},
		}),
		[epub],
	);

	function sanitizeHtml(html: string) {
		// replace all src attributes with `{epubBaseURl}/{root}/{src}`
		// replace all href attributes with `{epubBaseURl}/{root}/{href}`

		// TODO: what happens when rootBase is not set?
		// FIXME: not even working
		let santized = html.replaceAll('src="', `src="${getEpubBaseUrl(id)}/${epub?.rootBase ?? ''}/`);

		santized = html.replaceAll('href="', `href="${getEpubBaseUrl(id)}/${epub?.rootBase ?? ''}/`);

		return santized;
	}

	return {
		isFetchingBook,
		epub,
		actions,
		sanitizeHtml,
	};
}
