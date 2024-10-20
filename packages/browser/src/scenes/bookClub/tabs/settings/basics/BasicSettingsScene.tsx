import { zodResolver } from '@hookform/resolvers/zod'
import { useBookClubsQuery } from '@stump/client'
import { Button, Form } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'

import {
	buildSchema,
	CreateOrUpdateBookClubSchema,
	formDefaults,
} from '@/components/bookClub/createOrUpdateForm'
import { BasicBookClubInformation } from '@/components/bookClub/createOrUpdateForm'

import { useBookClubManagement } from '../context'

export default function BasicSettingsScene() {
	const { club, patch } = useBookClubManagement()
	const { t } = useLocaleContext()

	const { bookClubs } = useBookClubsQuery({ params: { all: true }, suspense: true })
	const existingClubNames = useMemo(
		() => (bookClubs?.filter((c) => c.id !== club.id) ?? []).map(({ name }) => name),
		[bookClubs, club],
	)

	const schema = useMemo(() => buildSchema(t, existingClubNames, false), [t, existingClubNames])
	const form = useForm<CreateOrUpdateBookClubSchema>({
		defaultValues: formDefaults(club),
		reValidateMode: 'onChange',
		resolver: zodResolver(schema),
	})

	const handleSubmit = useCallback(
		({ name, description, is_private }: CreateOrUpdateBookClubSchema) => {
			patch({
				description,
				is_private,
				name,
			})
		},
		[patch],
	)

	return (
		<Form form={form} onSubmit={handleSubmit} fieldsetClassName="flex flex-col gap-12">
			<BasicBookClubInformation />

			<div>
				<Button type="submit">Update club</Button>
			</div>
		</Form>
	)
}
