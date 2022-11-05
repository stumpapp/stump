import { Heading } from '@chakra-ui/react';
import React from 'react';

interface Props {
	title?: string;
	children: React.ReactNode;
	onScrollEnd?: () => void;
	isLoadingNext?: boolean;
}

export default function SlidingCardList({ children, onScrollEnd, isLoadingNext, title }: Props) {
	// TODO: I think this can be a problematic implementation.
	const handleScroll = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
		const currPos = e.currentTarget.scrollLeft;
		const maxPos = e.currentTarget.scrollWidth - e.currentTarget.clientWidth;

		if (currPos >= maxPos - 350 && !isLoadingNext) {
			onScrollEnd?.();
		}
	};

	const content = (
		<div
			onScroll={handleScroll}
			className="w-full flex flex-row space-x-2 overflow-x-scroll pb-4 scrollbar-hide"
		>
			{children}
		</div>
	);

	if (title) {
		return (
			<div className="w-full flex flex-col space-y-2">
				{title && <Heading fontSize="lg">{title}</Heading>}
				{content}
			</div>
		);
	}

	return content;
}
