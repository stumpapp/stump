import { Heading, Text, useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import { Link } from 'react-router-dom';

interface Props {
	title?: string;
	children: React.ReactNode;
	onScrollEnd?: () => void;
	isLoadingNext?: boolean;
}

// TODO: VIRTAULIZE THIS LIST!!!!! I will only really use this for image cards, which
// can really bog down the browser if there are too many of them.
export default function SlidingCardList({ children, onScrollEnd, isLoadingNext, title }: Props) {
	// TODO: I think this can be a problematic implementation.
	const handleScroll = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
		const currPos = e.currentTarget.scrollLeft;
		const maxPos = e.currentTarget.scrollWidth - e.currentTarget.clientWidth;

		if (currPos >= maxPos - 350 && !isLoadingNext) {
			onScrollEnd?.();
		}
	};

	return (
		<div className="w-full flex flex-col space-y-2">
			<div className="flex flex-row items-center justify-between">
				{title && <Heading fontSize="lg">{title}</Heading>}
				<div className="self-end">
					<Text
						to="#"
						as={Link}
						className="transition-colors duration-150"
						fontSize="sm"
						color={useColorModeValue('gray.700', 'gray.300')}
						_hover={{ color: 'brand.500' }}
					>
						See More
					</Text>
				</div>
			</div>
			<div
				onScroll={handleScroll}
				className="w-full flex flex-row space-x-2 overflow-x-scroll pb-4 scrollbar-hide"
			>
				{children}
			</div>
		</div>
	);
}
