import {
	ButtonGroup,
	FormErrorMessage,
	FormLabel,
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
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useMemo, useRef } from 'react';
import { FieldValues, useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from '../ui/Button';
import Form, { FormControl } from '../ui/Form';
import Input from '../ui/Input';

interface PagePopoverFormProps {
	pos: number;
	totalPages: number;
	onPageChange: (page: number) => void;
	trigger: React.ReactElement;
}

export default function PagePopoverForm({
	totalPages,
	onPageChange,
	pos,
	trigger,
}: PagePopoverFormProps) {
	const inputRef = useRef<any>(null);

	const { isOpen, onOpen, onClose } = useDisclosure();

	const schema = z.object({
		goTo: z.string().refine(
			(val) => {
				const num = parseInt(val, 10);

				return num > 0 && num <= totalPages;
			},
			() => ({
				message: `Please enter a number from 1 to ${totalPages}.`,
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
				onPageChange(values.goTo);
			}, 50);
		}
	}

	return (
		<Popover
			isOpen={isOpen}
			onOpen={onOpen}
			onClose={onClose}
			placement="top"
			closeOnBlur={true}
			initialFocusRef={inputRef}
		>
			<PopoverTrigger>{trigger}</PopoverTrigger>
			<PopoverContent borderColor={useColorModeValue('gray.200', 'gray.650')}>
				<PopoverHeader pt={4} fontWeight="bold" border="0">
					Go to page
				</PopoverHeader>
				<PopoverArrow />
				<PopoverBody>
					<Form id={`pagination-page-entry-form-${pos}`} form={form} onSubmit={handleSubmit}>
						<FormControl isInvalid={!!errors.goTo}>
							<FormLabel htmlFor="goTo">Enter page</FormLabel>
							{/* TODO: auto focus not working */}
							<Input
								type="number"
								autoFocus
								max={totalPages}
								{...register}
								ref={(ref) => {
									if (ref) {
										register.ref(ref);
										inputRef.current = ref;
									}
								}}
							/>
							{/* FIXME: Updates seem to have broken types here, need to look into this... */}
							{!!errors.goTo && <FormErrorMessage>{errors.goTo?.message as any}</FormErrorMessage>}
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
						<Button colorScheme="brand" type="submit" form={`pagination-page-entry-form-${pos}`}>
							Go
						</Button>
					</ButtonGroup>
				</PopoverFooter>
			</PopoverContent>
		</Popover>
	);
}
