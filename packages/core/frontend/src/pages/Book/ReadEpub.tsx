import React from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import EpubReader from '~components/Media/EpubReader';
import LazyEpubReader from '~components/Media/LazyEpubReader';
import { useEpub } from '~hooks/useEpub';

export default function ReadEpub() {
	const { id, loc } = useParams();

	const [search] = useSearchParams();

	if (!id) {
		throw new Error('Media id is required');
	} else if (search.get('stream') && search.get('stream') !== 'true') {
		return <LazyEpubReader id={id} />;
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
