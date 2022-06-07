import React from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import EpubReader from '~components/Media/EpubReader';
import { useEpub } from '~hooks/useEpub';

export default function ReadEpub() {
	const navigate = useNavigate();

	const { id, loc } = useParams();

	if (!id) {
		throw new Error('Media id is required');
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

	return <EpubReader epub={epub} {...rest} />;
}
