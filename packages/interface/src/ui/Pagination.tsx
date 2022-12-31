import { Box, Flex, HStack, useColorModeValue } from '@chakra-ui/react'
import clsx from 'clsx'
import { ArrowLeft, ArrowRight, DotsThree } from 'phosphor-react'
import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useWindowSize } from 'rooks'

import PagePopoverForm from '../components/PagePopoverForm'
import { usePagination } from '../hooks/usePagination'

interface PaginationArrowProps {
	kind: 'previous' | 'next'
	isDisabled?: boolean
	href: string
}

function PaginationArrow({ kind, isDisabled, href }: PaginationArrowProps) {
	const disabledText = useColorModeValue('gray.300', 'gray.500')
	const textColor = useColorModeValue('gray.600', 'gray.300')

	return (
		<Flex mt="-1px" w={0} flex="1 1 0%" justify={kind === 'next' ? 'flex-end' : 'flex-start'}>
			<Box
				as={Link}
				aria-disabled={isDisabled}
				to={href}
				// FIXME: I need to figure out how to disable the link while not removing pointer events
				className={clsx(
					isDisabled && 'pointer-events-none cursor-not-allowed',
					'border-t-2 border-transparent inline-flex items-center text-sm font-medium',
				)}
				pt={4}
				pr={kind === 'previous' ? '1' : '0'}
				pl={kind === 'next' ? '1' : '0'}
				fontSize={{ base: 'xs', md: 'sm' }}
				color={isDisabled ? disabledText : textColor}
				_hover={{ borderColor: useColorModeValue('gray.300', 'gray.600') }}
			>
				{kind === 'previous' ? (
					<>
						<ArrowLeft className="mr-3 h-4 w-4 md:h-5 md:w-5 text-gray-600" aria-hidden="true" />
						Previous
					</>
				) : (
					<>
						Next
						<ArrowRight className="ml-3 h-4 w-4 md:h-5 md:w-5 text-gray-600" aria-hidden="true" />
					</>
				)}
			</Box>
		</Flex>
	)
}

interface PaginationLinkProps {
	href: string
	value: number
	isActive: boolean
}

function PaginationLink({ value, href, isActive }: PaginationLinkProps) {
	const nonActiveColor = useColorModeValue('gray.550', 'gray.300')
	const nonActiveBorder = useColorModeValue('gray.300', 'gray.600')
	return (
		<Box
			as={Link}
			to={href}
			pt={4}
			px={4}
			fontSize={{ base: 'xs', md: 'sm' }}
			color={isActive ? 'brand.500' : nonActiveColor}
			borderColor={isActive ? 'brand.500' : 'transparent'}
			_hover={{
				borderColor: isActive ? 'brand.500' : nonActiveBorder,
			}}
			className="border-t-2 inline-flex items-center text-sm font-medium"
		>
			{value}
		</Box>
	)
}

export interface PaginationProps {
	position?: 'top' | 'bottom'
	pages: number
	currentPage: number
}

export default function Pagination({ position = 'top', pages, currentPage }: PaginationProps) {
	const navigate = useNavigate()
	const location = useLocation()

	const { innerWidth: screenWidth } = useWindowSize()

	const numbersToShow = useMemo(() => {
		if (screenWidth != null) {
			if (screenWidth < 768) {
				return 5
			}

			if (screenWidth < 992) {
				return 7
			}
		}

		return 10
	}, [screenWidth])

	const { pageRange } = usePagination({ currentPage, numbersToShow, totalPages: pages })

	function handleEllipsisNavigate(page: number) {
		navigate(`${location.pathname}?page=${page}`)
	}

	return (
		<HStack
			borderTop="1px solid"
			borderColor={useColorModeValue('gray.200', 'gray.700')}
			justify="space-between"
			align="center"
			pb={position === 'bottom' ? 8 : 0}
		>
			<PaginationArrow
				kind="previous"
				href={`${location.pathname}?page=${currentPage - 1}`}
				isDisabled={currentPage === 1}
			/>

			<HStack align="center">
				{pageRange.map((page, i) => {
					if (typeof page === 'number') {
						return (
							<PaginationLink
								key={`${i}, pagination-${page}`}
								href={`${location.pathname}?page=${page}`}
								isActive={page === currentPage}
								value={page}
							/>
						)
					}

					return (
						<PagePopoverForm
							pos={i}
							key={`${i}-pagination-ellipsis`}
							totalPages={pages}
							onPageChange={handleEllipsisNavigate}
							trigger={
								<Box
									as={'button'}
									pt={4}
									px={4}
									className="text-sm font-medium inline-flex items-center cursor-pointer focus:outline-none active:outline-none"
								>
									<DotsThree />
								</Box>
							}
						/>
					)
				})}
			</HStack>

			<PaginationArrow
				kind="next"
				href={`${location.pathname}?page=${currentPage + 1}`}
				isDisabled={currentPage >= pages}
			/>
		</HStack>
	)
}
