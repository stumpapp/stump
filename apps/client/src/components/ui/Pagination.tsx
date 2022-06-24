import React, { useMemo, useRef } from 'react';
import { ArrowLeft, ArrowRight, DotsThree } from 'phosphor-react';
import {
	Box,
	ButtonGroup,
	Flex,
	FormControl,
	FormErrorMessage,
	FormLabel,
	HStack,
	Popover,
	PopoverArrow,
	PopoverBody,
	PopoverContent,
	PopoverFooter,
	PopoverHeader,
	PopoverTrigger,
	useColorModeValue,
	useDisclosure,
} from '@chakra-ui/react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { usePagination } from '~hooks/usePagination';
import Button from './Button';
import Input from './Input';
import Form from './Form';
import { z } from 'zod';
import { FieldValues, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWindowSize } from '~hooks/useWindowSize';

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
				// FIXME: I need to figure out how to disable the link while not removing pointer events
				className={clsx(
					isDisabled && 'pointer-events-none cursor-not-allowed',
					'border-t-2 border-transparent inline-flex items-center text-sm font-medium',
				)}
				pt={4}
				pr={kind === 'previous' ? '1' : '0'}
				pl={kind === 'next' ? '1' : '0'}
				fontSize={{ base: 'xs', md: 'sm' }}
				color={
					isDisabled
						? useColorModeValue('gray.300', 'gray.500')
						: useColorModeValue('gray.500', 'gray.300')
				}
				_hover={{ borderColor: useColorModeValue('gray.600', 'gray.600') }}
			>
				{kind === 'previous' ? (
					<>
						<ArrowLeft className="mr-3 h-4 w-4 md:h-5 md:w-5 text-gray-400" aria-hidden="true" />
						Previous
					</>
				) : (
					<>
						Next
						<ArrowRight className="ml-3 h-4 w-4 md:h-5 md:w-5 text-gray-400" aria-hidden="true" />
					</>
				)}
			</Box>
		</Flex>
	);
}

interface PaginationLinkProps {
	href: string;
	value: number;
	isActive: boolean;
}

function PaginationLink({ value, href, isActive }: PaginationLinkProps) {
	return (
		<Box
			as={Link}
			to={href}
			pt={4}
			px={4}
			fontSize={{ base: 'xs', md: 'sm' }}
			color={isActive ? 'brand.500' : useColorModeValue('gray.500', 'gray.300')}
			borderColor={isActive ? 'brand.500' : 'transparent'}
			_hover={{
				borderColor: isActive ? 'brand.500' : useColorModeValue('gray.300', 'gray.600'),
			}}
			className="border-t-2 inline-flex items-center text-sm font-medium"
		>
			{value}
		</Box>
	);
}

interface PaginationEllipsisProps extends Pick<PaginationProps, 'pages' | 'position'> {
	onNavigate: (page: number) => void;
}

function PaginationEllipsis({ position, pages, onNavigate }: PaginationEllipsisProps) {
	const inputRef = useRef<any>(null);

	const { isOpen, onOpen, onClose } = useDisclosure();

	const schema = z.object({
		goTo: z.string().refine(
			(val) => {
				const num = parseInt(val, 10);

				return num > 0 && num <= pages;
			},
			() => ({
				message: `Please enter a number from 1 to ${pages}.`,
			}),
		),
	});

	const form = useForm({
		resolver: zodResolver(schema),
	});

	const register = form.register('goTo');

	const errors = useMemo(() => {
		return form.formState.errors;
	}, [form.formState.errors]);

	function handleSubmit(values: FieldValues) {
		if (values.goTo) {
			onClose();
			setTimeout(() => {
				form.reset();
				onNavigate(values.goTo);
			}, 50);
		}
	}

	return (
		<Popover
			isOpen={isOpen}
			onOpen={onOpen}
			onClose={onClose}
			placement={position === 'bottom' ? 'top' : 'bottom'}
			closeOnBlur={true}
			initialFocusRef={inputRef}
		>
			<PopoverTrigger>
				<Box
					as={'button'}
					pt={4}
					px={4}
					className="text-sm font-medium inline-flex items-center cursor-pointer"
				>
					<DotsThree />
				</Box>
			</PopoverTrigger>
			<PopoverContent borderColor="gray.650">
				<PopoverHeader pt={4} fontWeight="bold" border="0">
					Go to page
				</PopoverHeader>
				<PopoverArrow />
				<PopoverBody>
					<Form id="pagination-page-entry-form" form={form} onSubmit={handleSubmit}>
						<FormControl isInvalid={!!errors.goTo}>
							<FormLabel htmlFor="goTo">Enter page</FormLabel>
							{/* TODO: auto focus not working */}
							<Input
								type="number"
								autoFocus
								max={pages}
								{...register}
								ref={(ref) => {
									if (ref) {
										register.ref(ref);
										inputRef.current = ref;
									}
								}}
							/>
							{!!errors.goTo && <FormErrorMessage>{errors.goTo?.message}</FormErrorMessage>}
						</FormControl>
					</Form>
				</PopoverBody>
				<PopoverFooter
					border="0"
					display="flex"
					alignItems="center"
					justifyContent="flex-end"
					pb={4}
				>
					<ButtonGroup size="sm">
						<Button onClick={onClose}>Cancel</Button>
						<Button colorScheme="brand" type="submit" form="pagination-page-entry-form">
							Go
						</Button>
					</ButtonGroup>
				</PopoverFooter>
			</PopoverContent>
		</Popover>
	);
}

interface PaginationProps {
	position?: 'top' | 'bottom';
	pages: number;
	currentPage: number;
}

export default function Pagination({ position = 'top', pages, currentPage }: PaginationProps) {
	const navigate = useNavigate();
	const location = useLocation();

	const { width: screenWidth } = useWindowSize();

	const numbersToShow = useMemo(() => {
		if (screenWidth < 768) {
			return 5;
		}

		if (screenWidth < 992) {
			return 7;
		}

		return 10;
	}, [screenWidth]);

	const { pageRange } = usePagination({ totalPages: pages, currentPage, numbersToShow });

	function handleEllipsisNavigate(page: number) {
		navigate(`${location.pathname}?page=${page}`);
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
						);
					}

					return (
						<PaginationEllipsis
							key={`${i}-pagination-ellipsis`}
							pages={pages}
							onNavigate={handleEllipsisNavigate}
							position={position}
						/>
					);
				})}
			</HStack>

			<PaginationArrow
				kind="next"
				href={`${location.pathname}?page=${currentPage + 1}`}
				isDisabled={currentPage >= pages}
			/>
		</HStack>
	);
}
