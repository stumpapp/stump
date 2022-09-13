import { Media } from '@stump/core';
import ListItem from '../ListItem';

interface Props {
	isLoading: boolean;
	media?: Media[];
}

export default function MediaList({ media, isLoading }: Props) {
	if (isLoading) {
		return <div>Loading...</div>;
	} else if (!media) {
		return <div>whoop</div>;
	}

	return (
		<div className="flex flex-col space-y-2 flex-1">
			{media.map(({ id, name, description }, i) => (
				<ListItem
					key={id}
					id={id}
					title={name}
					subtitle={description}
					href={`/books/${id}`}
					even={i % 2 === 0}
				/>
			))}
		</div>
	);
}
