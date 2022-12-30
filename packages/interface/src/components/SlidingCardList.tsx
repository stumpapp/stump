import { ButtonGroup, Heading } from '@chakra-ui/react';
import { defaultRangeExtractor, Range, useVirtualizer } from '@tanstack/react-virtual';
import { CaretLeft, CaretRight } from 'phosphor-react';
import { useCallback, useEffect, useRef } from 'react';
import { IconButton } from '../ui/Button';
import ToolTip from '../ui/ToolTip';

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
	const parentRef = useRef<HTMLDivElement>(null);
	const visibleRef = useRef([0, 0]);
	const columnVirtualizer = useVirtualizer({
		count: cards.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 350,
		// FIXME: this is an absurd overscan... needs to change, however I cannot get it to work with less
		overscan: 75,
		horizontal: true,
		rangeExtractor: useCallback((range: Range) => {
			visibleRef.current = [range.startIndex, range.endIndex];
			return defaultRangeExtractor(range);
		}, []),
		enableSmoothScroll: true,
	});

	useEffect(() => {
		const [lastItem] = [...columnVirtualizer.getVirtualItems()].reverse();

		if (!lastItem) {
			return;
		}

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

	const handleSkipAhead = (skipValue = 5) => {
		let nextIndex = visibleRef?.current[1] + skipValue || 10;

		if (nextIndex > columnVirtualizer.getVirtualItems().length - 1) {
			nextIndex = columnVirtualizer.getVirtualItems().length - 1;
		}

		columnVirtualizer.scrollToIndex(nextIndex, { smoothScroll: true });
	};

	const handleSkipBackward = (skipValue = 5) => {
		let nextIndex = visibleRef?.current[0] - skipValue || 0;

		if (nextIndex < 0) {
			nextIndex = 0;
		}

		columnVirtualizer.scrollToIndex(nextIndex, { smoothScroll: true });
	};

	const canSkipBackward = visibleRef.current[0] > 0;
	// FIXME: wrong, the overscan messes this up I think...
	const canSkipForward = visibleRef.current[1] * 2 < cards.length;

	return (
		<div className="w-full flex flex-col space-y-2">
			<div className="flex flex-row items-center justify-between">
				{title && <Heading fontSize="lg">{title}</Heading>}
				<div className="self-end">
					<ButtonGroup isAttached={false}>
						<ToolTip label="Seek backwards" isDisabled={!canSkipBackward}>
							<IconButton
								disabled={!canSkipBackward}
								onClick={() => handleSkipBackward()}
								onDoubleClick={() => handleSkipBackward(20)}
							>
								<CaretLeft />
							</IconButton>
						</ToolTip>
						<ToolTip label="Seek Ahead" isDisabled={!canSkipForward}>
							<IconButton
								disabled={!canSkipForward}
								onClick={() => handleSkipAhead()}
								onDoubleClick={() => handleSkipAhead(20)}
							>
								<CaretRight />
							</IconButton>
						</ToolTip>
					</ButtonGroup>
				</div>
			</div>
			<div
				className="w-full flex flex-row space-x-2 overflow-x-scroll pb-4 scrollbar-hide"
				ref={parentRef}
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
