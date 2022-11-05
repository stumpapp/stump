import clsx from 'clsx';
import { FileX } from 'phosphor-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { Box, Spacer, Text, useBoolean, useColorModeValue } from '@chakra-ui/react';

export interface CardProps {
	to: string;
	imageAlt: string;
	imageSrc: string;
	imageFallback?: string;
	title: string;
	subtitle?: string;
	variant?: 'default' | 'large';
	showMissingOverlay?: boolean;
	onMouseEnter?: () => void;
}

// FIXME: onError should behave differently to accomodate new cards that get rendered when new Series/Media
// are created during a scan. When a Series is created, there won't be any Media to render a thumbnail for at first.
// So, I think maybe there should be some retry logic in here? retry once every few ms for like 9ms before showing a
// fallback image?
export default function Card({
	to,
	imageAlt,
	imageSrc,
	imageFallback,
	title,
	subtitle,
	variant = 'default',
	showMissingOverlay,
	onMouseEnter,
}: CardProps) {
	const [isFallback, { on }] = useBoolean(false);

	const src = useMemo(() => {
		if (isFallback || showMissingOverlay) {
			return imageFallback ?? '/fallbacks/image-file.svg';
		}

		return imageSrc;
	}, [isFallback, showMissingOverlay]);

	return (
		<Box
			as={Link}
			shadow="base"
			bg="gray.50"
			border="1.5px solid"
			borderColor="transparent"
			_dark={{ bg: 'gray.750' }}
			_hover={{
				borderColor: showMissingOverlay ? 'transparent' : 'brand.500',
			}}
			rounded="md"
			to={to}
			onMouseEnter={onMouseEnter}
			maxW="16rem"
			// aspect ratio of 2:3, so if maxW is 16rem, then maxH is 24rem. If maxW is 16rem, then minW is 10.666rem
			minW="10.666rem"
			className="relative overflow-hidden"
		>
			{showMissingOverlay && (
				// FIXME: this has terrible UX, not very readable. very ugly lmfao
				<Box
					bg={useColorModeValue('whiteAlpha.500', 'blackAlpha.600')}
					color={useColorModeValue('red.400', 'red.200')}
					className="flex flex-col space-y-2 items-center justify-center absolute inset-0 h-full w-full !bg-opacity-50"
				>
					<FileX className="w-12 h-12" />
					<Text fontSize="sm" fontWeight="semibold" textShadow="1.5px">
						Missing!
					</Text>
				</Box>
			)}
			<Box px={1.5}>
				<img
					alt={imageAlt}
					className={clsx(
						variant === 'default' ? 'h-auto ' : 'min-h-96',
						// FIXME: object-scale-down fixes the pixely look, but is NOT desired styling :weary: how annoying
						!isFallback && 'object-cover',
						// 663:1024 is standard aspect ratio for comic books. Stump supports a wider range of media, however
						// for now these cards will be tailored to that aspect ratio.
						'w-full aspect-[2/3]',
					)}
					src={src}
					onError={(_) => {
						on();
					}}
				/>
			</Box>

			{variant === 'default' && (
				<Box
					className={clsx(
						subtitle ? 'h-[5rem]' : 'h-[4rem]',
						'flex flex-col max-w-[calc(100%-0.75rem)] p-2',
					)}
					color="black"
					_dark={{ color: 'gray.100' }}
				>
					<Text fontSize="sm" as="h3" fontWeight="medium" className="[hyphens:auto]" noOfLines={2}>
						{title}
					</Text>

					<Spacer />

					<Text fontSize="xs" color={useColorModeValue('gray.700', 'gray.300')}>
						{subtitle}
					</Text>
				</Box>
			)}
		</Box>
	);
}
