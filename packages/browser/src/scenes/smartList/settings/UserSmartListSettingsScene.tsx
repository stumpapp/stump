import { Button, Form, Heading, Input, Text, TextArea } from '@stump/components'
import { useForm, useFormState } from 'react-hook-form'
import toast from 'react-hot-toast'

import { useSmartListContext } from '../context'
import { SmartListFormSchema } from '../../../components/smartList/createOrUpdate/schema'
import AccessSettings from './AccessSettings'
import DangerSection from './DangerSection'
import FilterConfiguration from './FilterConfiguration'

type BasicDetailsForm = Pick<SmartListFormSchema, 'name' | 'description'>

// TODO: split into components
// TODO: make werk
export default function UserSmartListSettingsScene() {
	const {
		list: { name, description },
		patchSmartList,
	} = useSmartListContext()

	// TODO: disable until changed...
	const form = useForm<BasicDetailsForm>({
		defaultValues: {
			description: description || undefined,
			name,
		},
	})
	const { isSubmitting } = useFormState({ control: form.control })

	const handleSubmit = async (data: BasicDetailsForm) => {
		try {
			await patchSmartList(data)
		} catch (error) {
			console.error('Failed to update smart list', { error })
			toast.error('Failed to update smart list')
		}
	}

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<div className="flex flex-col gap-y-6">
				<div>
					<Heading size="md">Basic details</Heading>
					<Text variant="muted" size="sm">
						Change the name, description, and other basic details for this smart list
					</Text>
				</div>

				<Input label="Name" variant="primary" {...form.register('name')} />
				<TextArea
					label="Description"
					variant="primary"
					className="md:w-3/5"
					{...form.register('description')}
				/>

				<div>
					<Button type="submit" variant="primary" disabled={isSubmitting}>
						Save changes
					</Button>
				</div>
			</div>

			<FilterConfiguration />
			<AccessSettings />
			<DangerSection />
		</Form>
	)
}
