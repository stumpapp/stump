import { Box, Spacer, Text } from '@chakra-ui/react';
import clsx from 'clsx';
import React from 'react';
import { Link } from 'react-router-dom';

export interface CardProps {
	to: string;
	imageAlt: string;
	imageSrc: string;
	title: string;
	subtitle?: string;
	onMouseEnter?: () => void;
}

// FIXME: onError should behave differently to accomodate new cards that get rendered when new Series/Media
// are created during a scan. When a Series is created, there won't be any Media to render a thumbnail for at first.
// So, I think maybe there should be some retry logic in here? retry once every few ms for like 9ms before showing a
// fallback image?
// TODO: add /public/fallback-card.png
export default function Card({ to, imageAlt, imageSrc, title, subtitle, onMouseEnter }: CardProps) {
	return (
		<Box
			as={Link}
			shadow="base"
			bg="gray.50"
			border="1.5px solid"
			borderColor="transparent"
			_dark={{ bg: 'gray.750' }}
			_hover={{
				borderColor: 'brand.500',
			}}
			rounded="md"
			to={to}
			onMouseEnter={onMouseEnter}
		>
			<Box px={1.5}>
				<img
					alt={imageAlt}
					className="h-96 w-[16rem] md:h-72 md:w-[12rem] object-cover"
					src={imageSrc}
					onError={(err) => {
						// @ts-ignore
						// err.target.src = '/fallback-card.png';
						err.target.src = '/favicon.png';
					}}
				/>
			</Box>

			<Box
				className={clsx(
					subtitle ? 'h-[5rem]' : 'h-[4rem]',
					'flex flex-col max-w-[12rem] break-all  p-2',
				)}
				color="black"
				_dark={{ color: 'gray.100' }}
			>
				{/* TODO: truncate SMARTER :) */}
				<Text className="card-title" fontSize="md" as="h3">
					{title}
				</Text>

				<Spacer />

				<Text size="sm">{subtitle}</Text>
			</Box>
		</Box>
	);
}
