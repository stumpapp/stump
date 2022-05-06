import { useBoolean } from '@chakra-ui/react';
import React from 'react';
import { useMutation } from 'react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { updateMediaProgress } from '~api/mutation/media';
import { getMediaPage } from '~api/query/media';
import Toolbar from '~components/Media/Toolbar';

// TODO: handle redirects I will *probably* add for when a user
// comes here trying to read pages of an epub.
// TODO: preload next pages?
export default function ReadBook() {
	const [showToolbar, { toggle }] = useBoolean(false);
	const navigate = useNavigate();

	const { id, page } = useParams();

	if (!id) {
		throw new Error('Media id is required');
	} else if (!page) {
		navigate(`/books/${id}/pages/1`);

		// TODO: do I need this?
		return null;
	}

	const { mutate: saveProgress } = useMutation(() => updateMediaProgress(id, parseInt(page, 10)));

	// useEffect(() => {
	// 	() => {
	// 		saveProgress();
	// 	};
	// }, []);

	return (
		<div className="h-full w-full flex justify-center items-center">
			<img
				onClick={toggle}
				// Note: Comic book ratio is -> 663 : 1024
				className="object-scale-down max-h-full"
				src={getMediaPage(id, parseInt(page, 10))}
				onError={(err) => {
					// @ts-ignore
					err.target.src = '/src/favicon.png';
				}}
			/>

			<Toolbar visible={showToolbar} />
		</div>
	);
}
