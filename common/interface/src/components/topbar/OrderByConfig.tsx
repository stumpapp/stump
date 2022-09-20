import { SortAscending, SortDescending } from 'phosphor-react';

import {
	ButtonGroup,
	Menu,
	MenuButton,
	MenuItem,
	MenuList,
	useColorModeValue,
} from '@chakra-ui/react';
import Button from '../../ui/Button';
import { DEFAULT_ORDER_BY, useQueryParamStore } from '@stump/client';
import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router';
import { mediaOrderByOptions, seriesOrderByOptions, libraryOrderByOptions } from '@stump/core';

// TODO: is type safety worth it here for `value`
interface OrderByOption {
	label: string;
	value: string;
}

interface OrderByDropdownProps {
	selected: string;
	onChange: (value: string) => void;
	options?: OrderByOption[];
}

function OrderByDropdown({ selected, onChange, options }: OrderByDropdownProps) {
	if (!options || !options.length) {
		return null;
	}

	return (
		<Menu>
			<MenuButton
				as={Button}
				py={0.5}
				px={2.5}
				size="sm"
				bg={useColorModeValue('gray.150', 'whiteAlpha.200')}
			>
				Order by
			</MenuButton>
			<MenuList>
				{options.map((option) => {
					const isActive = selected === option.value;

					return (
						<MenuItem
							// FIXME: This will BREAK when switching between entities. For example, lets say
							// you're on the series overview page and you change the order by to "checksum".
							// When you navigate to the library overview page, the order by will still be
							// "checksum" even though it's not a valid option for the library overview page.
							// This will throw a 400 error when the API tries to send that request.
							// onClick={() => onChange(option.value)}
							bg={isActive ? useColorModeValue('gray.500', 'whiteAlpha.200') : undefined}
							key={option.value}
						>
							{option.label}
						</MenuItem>
					);
				})}
			</MenuList>
		</Menu>
	);
}

export default function OrderByConfig() {
	const { order_by, setOrderBy, direction, setDirection } = useQueryParamStore();

	const location = useLocation();

	function intoOptions(keys: string[]) {
		return keys.map((key) => ({
			// capitalize first letter of each word, adding spaces between words. e.g. "library_id" -> "Library Id"
			label: key
				.replace(/_/g, ' ')
				.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1)),
			value: key,
		}));
	}

	const orderByOptions = useMemo(() => {
		// TODO: remove this from component, to reduce computation... also it is just ugly.
		if (location.pathname.startsWith('/libraries')) {
			return intoOptions(Object.keys(seriesOrderByOptions));
		} else if (location.pathname.startsWith('/series')) {
			return intoOptions(Object.keys(mediaOrderByOptions));
		}
	}, [location.pathname]);

	useEffect(() => {
		setOrderBy(DEFAULT_ORDER_BY);
	}, [orderByOptions]);

	return (
		<ButtonGroup isAttached>
			<OrderByDropdown
				selected={order_by ?? 'name'}
				onChange={setOrderBy}
				options={orderByOptions}
			/>

			<Button
				title={
					direction === 'desc' ? 'Change ordering to ascending' : 'Change ordering to descending'
				}
				onClick={() => setDirection(direction === 'asc' ? 'desc' : 'asc')}
				p={0.5}
				size="sm"
				bg={useColorModeValue('gray.150', 'whiteAlpha.200')}
			>
				{direction === 'desc' ? (
					<SortAscending className="text-lg" weight="regular" />
				) : (
					<SortDescending className="text-lg" weight="regular" />
				)}
			</Button>
		</ButtonGroup>
	);
}
