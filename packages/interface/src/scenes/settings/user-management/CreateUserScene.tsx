import { useCreateUser } from '@stump/client'
import { Breadcrumbs, Heading, Text } from '@stump/components'
import { User } from '@stump/types'
import React from 'react'
import { Helmet } from 'react-helmet'
import z from 'zod'

import SceneContainer from '../../../components/SceneContainer'
import { useLocaleContext } from '../../../i18n'
import paths from '../../../paths'
import { SettingsContent } from '../SettingsLayout'
import { useUserManagementContext } from './context'
import CreateUserForm from './CreateUserForm'

const buildSchema = (t: (key: string) => string, existingUsers: User[]) =>
	z.object({
		password: z.string().min(1, { message: t('authScene.form.validation.missingPassword') }),
		username: z
			.string()
			.min(1, { message: t('authScene.form.validation.missingUsername') })
			.refine(
				(value) => existingUsers.every((user) => user.username !== value),
				(value) => ({ message: `${value} is already taken` }),
			),
	})
type Schema = z.infer<ReturnType<typeof buildSchema>>

export default function CreateUserScene() {
	const { t } = useLocaleContext()

	const { users } = useUserManagementContext()
	const { createAsync, isLoading: isCreatingUser, error } = useCreateUser()

	return (
		<SceneContainer>
			<Helmet>
				<title>Stump | {t('settingsScene.createUsers.helmet')}</title>
			</Helmet>

			<div className="flex flex-col items-center text-center md:items-start md:text-left">
				<Heading size="sm">{t('settingsScene.createUsers.heading')}</Heading>

				<Breadcrumbs
					segments={[
						{
							label: t('settingsScene.users.heading'),
							to: paths.settings('users'),
						},
						{
							label: t('settingsScene.createUsers.heading'),
							noShrink: true,
						},
					]}
				/>

				<Text size="sm" variant="muted" className="mt-2">
					{t('settingsScene.createUsers.subtitle')}
				</Text>
			</div>

			<SettingsContent>
				<CreateUserForm />
			</SettingsContent>
		</SceneContainer>
	)
}
