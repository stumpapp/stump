import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { getEpubResource } from '~api/query/epub';
import { UseEpubReturn } from '~hooks/useEpub';

interface EpubReaderProps extends UseEpubReturn {}

export default function EpubReader({ epub, actions, ...rest }: EpubReaderProps) {
	console.log(epub, rest);

	// const { isLoading: isFetchingResource, data: content } = useQuery(
	// 	['getEbubResource', actions.currentResource()],
	// 	{
	// 		queryFn: () => getEpubResource().then((res) => res.data),
	// 	},
	// );

	const [content, setContent] = useState<string>();

	useEffect(() => {
		getEpubResource({
			id: epub.mediaEntity.id,
			root: epub.rootBase,
			resourceId: actions.currentResource()?.content!,
		}).then((res) => {
			console.log(res);

			setContent(rest.correctHtmlUrls(res.data));
		});
	}, []);

	return (
		<div className="w-full h-full">
			{content && <div dangerouslySetInnerHTML={{ __html: content }} />}
		</div>
	);
}
