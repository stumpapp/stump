import { zodResolver } from '@hookform/resolvers/zod'
import { Form, Input, Popover, useBoolean } from '@stump/components'
import { useMemo, useRef } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { z } from 'zod'

interface PagePopoverFormProps {
	pos: number
	currentPage: number
	totalPages: number
	onPageChange: (page: number) => void
	trigger: React.ReactElement
}

// FIXME: Warning: validateDOMNesting(...): <button> cannot appear as a descendant of <button>.
export default function PagePopoverForm({
	totalPages,
	currentPage,
	onPageChange,
	pos,
	trigger,
}: PagePopoverFormProps) {
	const inputRef = useRef<HTMLInputElement | null>(null)

	const [isOpen, { on, off }] = useBoolean()

	const schema = z.object({
		goTo: z.string().refine(
			(val) => {
				const num = parseInt(val, 10)

				return num > 0 && num <= totalPages
			},
			() => ({
				message: `Please enter a number from 1 to ${totalPages}.`,
			}),
		),
	})

	const form = useForm({
		resolver: zodResolver(schema),
	})

	const register = form.register('goTo')

	const errors = useMemo(() => {
		return form.formState.errors
	}, [form.formState.errors])

	function handleSubmit(values: FieldValues) {
		if (values.goTo) {
			off()
			setTimeout(() => {
				form.reset()
				onPageChange(values.goTo)
			}, 50)
		}
	}

	const handleOpenChange = (nowOpen: boolean) => {
		if (nowOpen) {
			on()
		} else {
			off()
		}
	}

	return (
		<Popover open={isOpen} onOpenChange={handleOpenChange}>
			<Popover.Trigger asChild={typeof trigger !== 'string'}>{trigger}</Popover.Trigger>
			<Popover.Content size="md">
				<div className="flex flex-col gap-2">
					<Form id={`pagination-page-entry-form-${pos}`} form={form} onSubmit={handleSubmit}>
						<Input
							label="Jump to another page"
							variant="primary"
							type="number"
							autoFocus
							max={totalPages}
							defaultValue={currentPage}
							errorMessage={errors.goTo?.message as string}
							description={`Enter a number from 1 to ${totalPages}.`}
							{...register}
							ref={(ref) => {
								if (ref) {
									register.ref(ref)
									inputRef.current = ref
								}
							}}
						/>
					</Form>
				</div>
			</Popover.Content>
		</Popover>
	)
}
