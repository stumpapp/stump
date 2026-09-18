import { zodResolver } from '@hookform/resolvers/zod'
import { useGraphQLMutation, useUploadConfig } from '@stump/client'
import { Alert, AlertDescription, AlertTitle, Button, Form, Input, Text } from '@stump/components'
import { graphql, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { AlertCircle } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { useAppContext } from '@/context'
import { useUser } from '@/stores'

import AvatarPicker from './AvatarPicker'

// TODO(testing): extract schema and test components individually

const mutation = graphql(`
	mutation UpdateUserProfileForm($input: UpdateUserInput!) {
		updateViewer(input: $input) {
			id
			username
		}
	}
`)

export default function ProfileForm() {
	const { t } = useLocaleContext()
	const { user, setUser } = useUser()
	const { checkPermission } = useAppContext()
	const { uploadConfig } = useUploadConfig({ enabled: checkPermission(UserPermission.UploadFile) })

	const schema = z.object({
		name: z.string().optional(),
		password: z.string().optional(),
		username: z.string().min(1, {
			message: t('settingsScene.app/account.sections.account.validation.missingUsername'),
		}),
	})
	type Schema = z.infer<typeof schema>

	const form = useForm<Schema>({
		defaultValues: {
			username: user!.username,
		},
		mode: 'onSubmit',
		resolver: zodResolver(schema),
	})

	const [newUsername, newPassword] = useWatch({
		control: form.control,
		name: ['username', 'password'],
		defaultValue: {
			username: user?.username,
		},
	})

	const canChangePassword = checkPermission(UserPermission.ChangePassword)
	const canChangeUsername = checkPermission(UserPermission.ChangeUsername)
	const canChangeAvatar = checkPermission(UserPermission.ChangeAvatar)

	const isChangingPassword = !!newPassword
	const hasChanges = newUsername !== user?.username || isChangingPassword

	const { mutate } = useGraphQLMutation(mutation, {
		onSuccess: ({ updateViewer: updatedUser }) => {
			if (!user) return
			const mergedUser = {
				...user,
				...updatedUser,
			}
			setUser(mergedUser)
			form.reset({
				avatarUrl: user.avatarUrl,
				...mergedUser,
			})
		},
		onError: (error) => {
			console.error(error)
			toast.error(t('settingsScene.app/account.sections.account.errors.updateFailed'))
		},
	})

	const handleSubmit = async (values: Schema) => {
		if (!hasChanges || !user) return

		mutate({
			input: {
				username: values.username,
				password: values.password || undefined, // undefined -> no change, null or "" -> no password :(
				permissions: user.permissions,
				ageRestriction: user.ageRestriction || null,
				maxSessionsAllowed: user.maxSessionsAllowed,
			},
		})
	}

	const isUselessForm = !canChangeUsername && !canChangePassword && !canChangeAvatar

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<div className="space-y-8 md:max-w-2xl md:flex-row md:justify-between md:space-y-0 flex w-full flex-col-reverse space-y-reverse">
				<div className="gap-6 flex grow flex-col">
					{isUselessForm && (
						<Alert variant="warning">
							<AlertCircle />
							<AlertTitle>
								{t('settingsScene.app/account.sections.account.labels.uselessForm.title')}
							</AlertTitle>
							<AlertDescription>
								{t('settingsScene.app/account.sections.account.labels.uselessForm.description')}
							</AlertDescription>
						</Alert>
					)}

					<Input
						title={
							!canChangeUsername
								? t('settingsScene.app/account.sections.account.labels.insufficientPermission')
								: undefined
						}
						className="w-full"
						containerClassName="max-w-full md:max-w-sm"
						label={t('settingsScene.app/account.sections.account.labels.username')}
						autoComplete="username"
						{...form.register('username')}
						disabled={!canChangeUsername}
					/>

					<Input
						title={
							!canChangePassword
								? t('settingsScene.app/account.sections.account.labels.insufficientPermission')
								: undefined
						}
						className="w-full"
						containerClassName="max-w-full md:max-w-sm"
						label={t('settingsScene.app/account.sections.account.labels.password')}
						type="password"
						autoComplete="new-password"
						{...form.register('password')}
						disabled={!canChangePassword}
					/>

					<div className="gap-4 md:flex-row flex w-full flex-col items-center">
						<Button
							type="submit"
							className="md:w-[unset] w-full"
							disabled={!hasChanges || isUselessForm}
						>
							{t('settingsScene.app/account.sections.account.buttons.confirm')}
						</Button>

						{hasChanges && (
							<Text variant="muted" size="xs">
								{t('settingsScene.app/account.sections.account.labels.activeChangesPrompt')}
							</Text>
						)}
					</div>
				</div>

				{uploadConfig?.enabled && canChangeAvatar && <AvatarPicker />}
			</div>
		</Form>
	)
}
