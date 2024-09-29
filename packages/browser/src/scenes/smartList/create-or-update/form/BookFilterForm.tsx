import { zodResolver } from '@hookform/resolvers/zod'
import { Form, Input } from '@stump/components'
import React, { useCallback } from 'react'
import { useForm } from 'react-hook-form'

import { mediaBaseFilter, MediaBaseFilterSchema } from './schema'

export const BOOK_FILTER_FORM_ID = 'book-filter-form'

export default function BookFilterForm() {
	const form = useForm<MediaBaseFilterSchema>({
		resolver: zodResolver(mediaBaseFilter),
	})

	const handleSubmit = useCallback(() => {}, [])

	return (
		<Form form={form} onSubmit={handleSubmit} id={BOOK_FILTER_FORM_ID}>
			<Input label="Name" {...form.register('name')} />
		</Form>
	)
}
