import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { any } from 'zod';
import { getEpubResource } from '~api/query/epub';

interface EpubReaderProps {
	epub: Epub;
}

export default function EpubReader({ epub, actions, ...rest }: any) {
	console.log(epub, rest);

	// const { isLoading: isFetchingResource, data: content } = useQuery(
	// 	['getEbubResource', actions.currentResource()],
	// 	{
	// 		queryFn: () => getEpubResource().then((res) => res.data),
	// 	},
	// );

	const [content, setContent] = useState(null);

	useEffect(() => {
		getEpubResource({
			id: epub.mediaEntity.id,
			root: epub.rootBase,
			resourceId: actions.currentResource()?.content,
		}).then((res) => {
			console.log(res);

			setContent(rest.sanitizeHtml(res.data));
		});
	}, []);

	return (
		<div className="w-full h-full">
			{content && <div dangerouslySetInnerHTML={{ __html: content }} />}
		</div>
	);
}
