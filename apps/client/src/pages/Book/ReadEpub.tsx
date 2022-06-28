import React from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useEpub } from '~hooks/useEpub';
import EpubReader from '~components/Media/EpubReader';
import LazyEpubReader from '~components/Media/LazyEpubReader';

export default function ReadEpub() {
	const { id } = useParams();

	const [search] = useSearchParams();

	const loc = search.get('loc');

	if (!id) {
		throw new Error('Media id is required');
	} else if (search.get('stream') && search.get('stream') !== 'true') {
		// TODO: remove the loc from search..
		return <LazyEpubReader id={id} loc={loc} />;
	}

	const { isFetchingBook, epub, ...rest } = useEpub(id, { loc });

	if (isFetchingBook) {
		return <div>Loading...</div>;
	}

	if (!epub) {
		throw new Error('Epub not found');
	}

	if (!epub.mediaEntity.extension.match(/epub/)) {
		return <Navigate to={`/books/${id}/pages/${epub.mediaEntity.currentPage ?? 1}`} />;
	}

	// else if (!loc) {
	// 	return <Navigate to={`/books/${id}/pages/1`} />;
	// }

	return <EpubReader isFetchingBook={isFetchingBook} epub={epub} {...rest} />;
}
