import { useMutation, useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { updateMediaProgress } from '~api/media';
import { getMediaById, getMediaPage } from '~api/media';
import ImageBasedReader, {
	AnimatedImageBasedReader,
} from '~components/Media/Readers/ImageBasedReader';
import { ARCHIVE_EXTENSION, EBOOK_EXTENSION } from '~util/patterns';

export default function ReadBook() {
	const navigate = useNavigate();

	const { id, page } = useParams();

	const [search] = useSearchParams();

	if (!id) {
		throw new Error('Media id is required');
	}

	const { isLoading: fetchingBook, data: media } = useQuery(['getMediaById'], {
		queryFn: async () => getMediaById(id).then((res) => res.data),
	});

	const { mutate: saveProgress } = useMutation(
		['updateReadProgress'],
		() => updateMediaProgress(id, parseInt(page!, 10)),
		{
			onError(err) {
				console.error(err);
			},
		},
	);

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

	if (media.extension.match(EBOOK_EXTENSION)) {
		return <Navigate to={`/epub/${id}?stream=false`} />;
	} else if (!page || parseInt(page, 10) <= 0) {
		return <Navigate to={`/books/${id}/pages/1`} />;
	} else if (parseInt(page, 10) > media.pages) {
		return <Navigate to={`/books/${id}/pages/${media.pages}`} />;
	}

	if (media.extension.match(ARCHIVE_EXTENSION)) {
		const animated = !!search.get('animated');

		// TODO: this will be merged under ImageBasedReader once animations get stable. animation will become a prop
		// eventually. This is just a debug tool for me right now, and will not remain as separate components in the future.
		const Component = animated ? AnimatedImageBasedReader : ImageBasedReader;

		return (
			<Component
				media={media}
				currentPage={parseInt(page, 10)}
				getPageUrl={(pageNumber) => getMediaPage(id, pageNumber)}
				onPageChange={handleChangePage}
			/>
		);
	}

	return <div>Not a supported book or i just can't do that yet! :)</div>;
}
