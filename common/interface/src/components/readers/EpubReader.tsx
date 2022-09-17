import { UseEpubReturn } from '@stump/client';
import { getEpubResource } from '@stump/client/api';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/*
	NOTE: I have decided to move this streamable epub reading to a future feature.
	I have to write a mini epub engine to get this working. Readium isn't MIT licensed,
	and I'd rather not change MIT if possibile. So, for now, I'm going to get the 
	epub.js reader working well and then get the other core features imlpemented
	before I jump back into this. Once that happens, the overview of what needs to get
	implemented will be:
		- epubcfi parsing and generating
		- epubcfi navigation (server and client side)
			- server should be able to send a resource to the client based on cfi
			- server should be able to generate a cfi based on a resource (from spine)
		- client needs to be responsive and render pages correctly
		- client needs to be able to render epub resources (images, css, etc)
		- much more
	Some of this has been started, but not finished.
*/
export default function EpubReader({ epub, actions, ...rest }: UseEpubReturn) {
	const navigate = useNavigate();

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

	function handleClickEvent(e: React.MouseEvent<HTMLDivElement, MouseEvent>) {
		if (e.target instanceof HTMLAnchorElement && e.target.href) {
			e.preventDefault();
			// Note: I am assuming at this point I have a valid href.
			// i.e. the epub link has been canonicalized and points to a valid
			// epubcfi.
			navigate(e.target.href);
		}
	}

	return (
		<div className="w-full h-full">
			{content && <div onClick={handleClickEvent} dangerouslySetInnerHTML={{ __html: content }} />}
		</div>
	);
}
