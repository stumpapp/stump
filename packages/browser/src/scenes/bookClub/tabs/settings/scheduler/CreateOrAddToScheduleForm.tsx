import { zodResolver } from '@hookform/resolvers/zod'
import { Form, Input } from '@stump/components'
import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import AddBookCard from './AddBookCard'

const bookEntityOption = z.object({
	id: z.string(),
})
const externalBookOption = z.object({
	author: z.string(),
	image_url: z.string().url().optional(),
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
	const form = useForm<Schema>({
		defaultValues: {
			books: [defaultBook],
		},
		resolver: zodResolver(schema),
	})

	const books = form.watch('books')

	const handleSubmit = (data: Schema) => {
		// eslint-disable-next-line no-console
		console.debug(data)
	}

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = parseInt(e.target.value)
			if (isNaN(value) || value < 1) {
				return
			}

			const currentValue = form.getValues('books')
			const booksCount = currentValue.length

			if (value > booksCount) {
				form.setValue('books', [...currentValue, defaultBook])
			} else if (value < booksCount) {
				const currentValue = form.getValues('books')
				form.setValue('books', currentValue.slice(0, value))
			}
		},
		[form],
	)

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<Input
				variant="primary"
				label="Books to add"
				type="number"
				value={books.length}
				onChange={handleChange}
				min={1}
			/>

			<div className="flex flex-col gap-6">
				{Array.from({ length: books.length }).map((_, index) => (
					<AddBookCard key={index} index={index} />
				))}
			</div>
		</Form>
	)
}
