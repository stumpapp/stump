import { zodResolver } from '@hookform/resolvers/zod'
import { Form, Input } from '@stump/components'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import AddBookCard from './AddBookCard'

const bookEntityOption = z.object({
	id: z.string(),
})
const externalBookOption = z.object({
	author: z.string(),
	title: z.string(),
	url: z.string().url().optional(),
})
const bookSchema = z.object({
	book: z.union([bookEntityOption, externalBookOption]),
	discussion_duration_days: z.number().optional(),
	end_at: z.string().optional(),
	start_at: z.string().optional(),
})
type BookSchema = z.infer<typeof bookSchema>
const schema = z.object({
	books: z.array(bookSchema).min(1, 'You must define at least one book to schedule'),
	default_interval_days: z.number().optional(),
})
export type Schema = z.infer<typeof schema>

export const defaultBook = {
	book: {},
} as BookSchema

export default function CreateOrAddToScheduleForm() {
	const [booksToAdd, setBooksToAdd] = useState(1)

	const form = useForm<Schema>({
		defaultValues: {
			books: [defaultBook],
		},
		resolver: zodResolver(schema),
	})

	const books = form.watch('books')
	const booksCount = books.length
	useEffect(
		() => {
			// whenever the booksToAdd changes to be greater than the current number of books, add a new book
			if (booksToAdd > booksCount) {
				const currentValue = form.getValues('books')
				form.setValue('books', [...currentValue, defaultBook])
			} else if (booksToAdd < booksCount) {
				// whenever the booksToAdd changes to be less than the current number of books, remove the last book
				const currentValue = form.getValues('books')
				form.setValue('books', currentValue.slice(0, booksToAdd))
			}
		},

		// eslint-disable-next-line react-hooks/exhaustive-deps
		[booksToAdd, booksCount],
	)

	const handleSubmit = (data: Schema) => {
		console.debug(data)
	}

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<Input
				variant="primary"
				label="Books to add"
				type="number"
				value={booksToAdd}
				onChange={(e) => setBooksToAdd(parseInt(e.target.value))}
				min={1}
			/>

			<div className="flex flex-col gap-6">
				{Array.from({ length: booksToAdd }).map((_, index) => (
					<AddBookCard key={index} index={index} />
				))}
			</div>
		</Form>
	)
}
