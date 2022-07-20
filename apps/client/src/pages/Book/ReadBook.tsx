import React from 'react';
import { useMutation, useQuery } from 'react-query';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { updateMediaProgress } from '~api/media';
import { getMediaById, getMediaPage } from '~api/media';
import ComicBookReader from '~components/Media/ComicBookReader';

export default function ReadBook() {
	const navigate = useNavigate();

	const { id, page } = useParams();

	if (!id) {
		throw new Error('Media id is required');
	}

	const { isLoading: fetchingBook, data: media } = useQuery('getMediaById', {
		queryFn: async () => getMediaById(id).then((res) => res.data),
	});

	const { mutate: saveProgress } = useMutation(() => updateMediaProgress(id, parseInt(page!, 10)));

	function handleChangePage(newPage: number) {
		saveProgress();
		navigate(`/books/${id}/pages/${newPage}`);
	}

	if (fetchingBook) {
		return <div>Loading...</div>;
	}

	if (!media) {
		throw new Error('Media not found');
	}

	if (media.extension.match(/epub/)) {
		return <Navigate to={`/epub/${id}?stream=false`} />;
	} else if (!page || parseInt(page, 10) <= 0) {
		return <Navigate to={`/books/${id}/pages/1`} />;
	} else if (parseInt(page, 10) > media.pages) {
		return <Navigate to={`/books/${id}/pages/${media.pages}`} />;
	}

	if (media.extension.match(/cbr|cbz/)) {
		return (
			<ComicBookReader
				media={media}
				currentPage={parseInt(page, 10)}
				getPageUrl={(pageNumber) => getMediaPage(id, pageNumber)}
				onPageChange={handleChangePage}
			/>
		);
	}

	return <div>Not a supported book or i just can't do that yet! :)</div>;
}
