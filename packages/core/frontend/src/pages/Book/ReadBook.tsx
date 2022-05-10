import React from 'react';
import { useMutation, useQuery } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { updateMediaProgress } from '~api/mutation/media';
import { getMediaById, getMediaPage } from '~api/query/media';
import ComicBookReader from '~components/Media/ComicBookReader';

// TODO: handle redirects I will *probably* add for when a user
// comes here trying to read pages of an epub.
export default function ReadBook() {
	const navigate = useNavigate();

	const { id, page } = useParams();

	if (!id) {
		throw new Error('Media id is required');
	} else if (!page) {
		navigate(`/books/${id}/pages/1`);

		// TODO: do I need this?
		return null;
	}

	function handleChangePage(newPage: number) {
		saveProgress();
		navigate(`/books/${id}/pages/${newPage}`);
	}

	const { mutate: saveProgress } = useMutation(() => updateMediaProgress(id, parseInt(page, 10)));

	const { isLoading: fetchingBook, data: media } = useQuery('getMediaById', {
		queryFn: async () => getMediaById(id).then((res) => res.data),
	});

	if (fetchingBook) {
		return <div>Loading...</div>;
	}

	if (!media) {
		throw new Error('Media not found');
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

	return <div>Not a comic book; Can't do that yet! :)</div>;
}
