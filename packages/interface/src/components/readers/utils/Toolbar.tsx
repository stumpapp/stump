import { motion } from 'framer-motion';
import { ArrowLeft } from 'phosphor-react';
import { Link, useParams } from 'react-router-dom';

import { Heading } from '@chakra-ui/react';
import { getMediaPage } from '@stump/client/api';
import { useCallback, useEffect, useRef } from 'react';
import { defaultRangeExtractor, Range, useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';

interface ToolbarProps {
	title: string;
	currentPage: number;
	pages: number;
	visible: boolean;
	onPageChange(page: number): void;
}

export default function Toolbar({
	title,
	currentPage,
	pages,
	visible,
	onPageChange,
}: ToolbarProps) {
	const { id } = useParams();

	if (!id) {
		// should never happen
		throw new Error('No ID provided');
	}

	const parentRef = useRef<HTMLDivElement>(null);
	const rangeRef = useRef([0, 0]);
	const columnVirtualizer = useVirtualizer({
		count: pages,
		getScrollElement: () => parentRef.current,
		estimateSize: () => 80,
		overscan: 5,
		horizontal: true,
		rangeExtractor: useCallback((range: Range) => {
			rangeRef.current = [range.startIndex, range.endIndex];
			return defaultRangeExtractor(range);
		}, []),
		enableSmoothScroll: true,
	});

	// FIXME: this is super scufffed, something is throwing off the scrollToIndex and the
	// workaround is atrocious...
	useEffect(() => {
		if (visible) {
			// FIXME: why no work
			// columnVirtualizer.scrollToIndex(currentPage, { smoothScroll: true });
			setTimeout(() => {
				const totalSize = columnVirtualizer.getTotalSize();
				const offset = (totalSize / pages) * currentPage;

				const targetID = `${id}-page-${currentPage}`;
				const target = document.getElementById(targetID);

				if (target) {
					target.scrollIntoView({ behavior: 'smooth', inline: 'center' });
				} else {
					// FIXME: this actually doesn't work lol
					parentRef.current?.scrollTo({ left: offset, behavior: 'smooth' });
				}
			}, 50);
		}
	}, [visible, currentPage]);

	const variants = (position: 'top' | 'bottom') => ({
		hidden: {
			opacity: 0,
			y: position === 'top' ? '-100%' : '100%',
			transition: {
				duration: 0.2,
				ease: 'easeInOut',
			},
		},
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.2,
				ease: 'easeInOut',
			},
		},
	});

	return (
		<div className={!visible ? 'invisible' : 'visible'}>
			<motion.nav
				animate={visible ? 'visible' : 'hidden'}
				variants={variants('top')}
				transition={{ duration: 0.2, ease: 'easeInOut' }}
				className="fixed top-0 p-4 w-full bg-opacity-90 bg-gray-700 text-white z-[100]"
			>
				<div className="flex justify-between items-center w-full">
					<div className="flex items-center space-x-4">
						<Link className="flex items-center" title="Go to media overview" to={`/books/${id}`}>
							<ArrowLeft size={'1.25rem'} />
						</Link>

						<Heading size="sm">{title}</Heading>
					</div>
					<div className="flex items-center">TODO: idk what</div>
				</div>
			</motion.nav>
			<motion.nav
				animate={visible ? 'visible' : 'hidden'}
				variants={variants('bottom')}
				transition={{ duration: 0.2, ease: 'easeInOut' }}
				className="fixed bottom-0 p-4 w-full bg-opacity-75 shadow-lg text-white z-[100] overflow-x-scroll"
			>
				<div
					className="flex space-x-2 w-full bottom-0 select-none relative"
					ref={parentRef}
					style={{
						width: `${columnVirtualizer.getTotalSize()}px`,
					}}
				>
					{/* TODO: tool tips? */}
					{/* FIXME: styling isn't quite right, should have space on either side... */}
					{columnVirtualizer.getVirtualItems().map((virtualItem, idx) => (
						<img
							id={`${id}-page-${idx + 1}`}
							key={virtualItem.key}
							src={getMediaPage(id, idx + 1)}
							className={clsx(
								currentPage === idx + 1 ? '-translate-y-1 border-brand' : 'border-transparent',
								'cursor-pointer h-32 w-auto rounded-md transition duration-300 hover:-translate-y-2 shadow-xl border-solid border-2 hover:border-brand',
							)}
							onClick={() => onPageChange(idx + 1)}
						/>
					))}
				</div>
			</motion.nav>
		</div>
	);
}
