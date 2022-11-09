import { Heading, Text, useColorModeValue } from '@chakra-ui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

interface Props {
	title?: string;
	cards: JSX.Element[];
	onScrollEnd?: () => void;
	isLoadingNext?: boolean;
	hasNext?: boolean;
}

export default function SlidingCardList({
	cards,
	onScrollEnd,
	isLoadingNext,
	hasNext,
	title,
}: Props) {
	const parentRef = useRef(null);
	const columnVirtualizer = useVirtualizer({
		count: cards.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 350,
		// FIXME: this is an absurd overscan... needs to change, however I cannot get it to work with less
		overscan: 75,
		horizontal: true,
	});

	// TODO: I think this can be a problematic implementation.
	const handleScroll = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
		const currPos = e.currentTarget.scrollLeft;
		const maxPos = e.currentTarget.scrollWidth - e.currentTarget.clientWidth;

		if (currPos >= maxPos - 350 && !isLoadingNext) {
			onScrollEnd?.();
		}
	};

	useEffect(() => {
		const [lastItem] = [...columnVirtualizer.getVirtualItems()].reverse();

		if (!lastItem) {
			return;
		}

		// console.log({
		// 	lastItem,
		// 	lastItemIndex: lastItem.index,
		// 	cardsLength: cards.length,
		// 	lastItemIndexEqualsCardsLengthMinusOne: lastItem.index === cards.length - 1,
		// 	hasNext,
		// });

		if (lastItem.index >= cards.length - 5 && hasNext && !isLoadingNext) {
			onScrollEnd?.();
		}
	}, [
		hasNext,
		onScrollEnd,
		cards.length,
		isLoadingNext,
		columnVirtualizer.getVirtualItems().length,
	]);

	// console.log({
	// 	virtualCount: columnVirtualizer.getVirtualItems().length,
	// 	cardsLength: cards.length,
	// });

	return (
		<div className="w-full flex flex-col space-y-2">
			<div className="flex flex-row items-center justify-between">
				{title && <Heading fontSize="lg">{title}</Heading>}
				<div className="self-end">
					{/* <Text
						to="#"
						as={Link}
						className="transition-colors duration-150"
						fontSize="sm"
						color={useColorModeValue('gray.700', 'gray.300')}
						_hover={{ color: 'brand.500' }}
					>
						See More
					</Text> */}
				</div>
			</div>
			<div
				className="w-full flex flex-row space-x-2 overflow-x-scroll pb-4"
				ref={parentRef}
				onScroll={handleScroll}
			>
				<div
					className="w-full relative flex flex-row space-x-2"
					style={{
						width: `${columnVirtualizer.getTotalSize()}px`,
					}}
				>
					{columnVirtualizer.getVirtualItems().map((virtualItem) => {
						return cards[virtualItem.index];
					})}
				</div>
			</div>
		</div>
	);
}
