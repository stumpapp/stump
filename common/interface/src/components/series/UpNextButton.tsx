import { Link } from 'react-router-dom';
import Button from '../../ui/Button';

import { useUpNextInSeries } from '@stump/client';

interface Props {
	seriesId: string;
}

export default function UpNextButton({ seriesId }: Props) {
	const { media, isLoading } = useUpNextInSeries(seriesId);
	// TODO: Change this once Stump supports epub progress tracking.
	if (media?.extension === 'epub') {
		return null;
	}

	return (
		<Button
			isDisabled={!isLoading && !media}
			as={Link}
			to={`/books/${media?.id}/pages/${media?.currentPage || 1}`}
			disabled={!media}
			title={`Continue reading ${media?.name || 'from where you left off'}`}
			colorScheme="brand"
		>
			Continue
		</Button>
	);
}
