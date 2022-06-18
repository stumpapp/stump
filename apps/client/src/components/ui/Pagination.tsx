import React from 'react';
import { ArrowLeft, ArrowRight } from 'phosphor-react';
import { Box, Flex, HStack, useColorModeValue } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

interface PaginationArrowProps {
	kind: 'previous' | 'next';
	isDisabled?: boolean;
	href: string;
}

function PaginationArrow({ kind, isDisabled, href }: PaginationArrowProps) {
	return (
		<Flex mt="-1px" w={0} flex="1 1 0%" justify={kind === 'next' ? 'flex-end' : 'flex-start'}>
			<Box
				as={Link}
				aria-disabled={isDisabled}
				to={href}
				className={clsx(
					isDisabled && 'pointer-events-none',
					'border-t-2 border-transparent inline-flex items-center text-sm font-medium',
				)}
				pt={4}
				pr={kind === 'previous' ? '1' : '0'}
				pl={kind === 'next' ? '1' : '0'}
				color={useColorModeValue('gray.500', 'gray.300')}
				_hover={{ borderColor: useColorModeValue('gray.600', 'gray.600') }}
			>
				{kind === 'previous' ? (
					<>
						<ArrowLeft className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
						Previous
					</>
				) : (
					<>
						Next
						<ArrowRight className="ml-3 h-5 w-5 text-gray-400" aria-hidden="true" />
					</>
				)}
			</Box>
		</Flex>
	);
}

interface PaginationProps {
	pages: number;
	currentPage: number;
	// onNext: () => void;
	// onPrevious: () => void;
}

export default function Pagination({ pages, currentPage }: PaginationProps) {
	const location = useLocation();

	return (
		<HStack
			borderTop="1px solid"
			borderColor={useColorModeValue('gray.200', 'gray.700')}
			justify="space-between"
		>
			<PaginationArrow
				kind="previous"
				href={`${location.pathname}?page=${currentPage - 1}`}
				isDisabled={currentPage === 0}
			/>

			<HStack></HStack>

			<PaginationArrow
				kind="next"
				href={`${location.pathname}?page=${currentPage + 1}`}
				isDisabled={currentPage >= pages - 1}
			/>
		</HStack>
	);
}
