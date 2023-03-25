import { zodResolver } from '@hookform/resolvers/zod'
import { isUrl } from '@stump/api'
import { useUser } from '@stump/client'
import { Button, Form, Input, Text } from '@stump/components'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useLocaleContext } from '../../../i18n/context'
import AvatarPicker from './AvatarPicker'

// TODO: move schema into component so translations can be used
const schema = z.object({
	avatarUrl: z
		.string()
		.optional()
		.nullable()
		.refine(
			(url) => !url || isUrl(url),
			(url) => ({ message: `Invalid URL: ${url}` }),
		),
	name: z.string().optional(),
	password: z.string().optional(),
	username: z.string().min(1, { message: 'Username is required' }),
})
type Schema = z.infer<typeof schema>

export default function ProfileForm() {
	const { t } = useLocaleContext()
	const user = useUser()

	const form = useForm<Schema>({
		defaultValues: {
			avatarUrl: user!.avatar_url,
			username: user!.username,
		},
		mode: 'onSubmit',
		resolver: zodResolver(schema),
	})

	const [avatarUrl] = form.watch(['avatarUrl'])

	const handleImageChange = (url?: string) => {
		form.setValue('avatarUrl', url, { shouldValidate: true })
	}

	const handleSubmit = async (values: Schema) => {
		const { username } = values
	}

	// FIXME: wrong logic, just compare the form values to the user values
	const hasUnsavedChanges = form.formState.isDirty

	return (
		<Form form={form} onSubmit={handleSubmit}>
			<div className="flex w-full flex-col-reverse space-y-8 space-y-reverse md:max-w-2xl md:flex-row md:justify-between md:space-y-0">
				<div className="flex flex-grow flex-col gap-6">
					<Input
						variant="primary"
						className="w-full"
						containerClassName="max-w-full md:max-w-sm"
						label={t('settingsScene.general.profileForm.labels.username')}
						autoComplete="username"
						{...form.register('username')}
					/>
					<Input
						variant="primary"
						className="w-full"
						containerClassName="max-w-full md:max-w-sm"
						label={t('settingsScene.general.profileForm.labels.password')}
						type="password"
						autoComplete="new-password"
						{...form.register('password')}
					/>

					<div className="flex w-full flex-col items-center gap-4 md:flex-row">
						<Button variant="primary" type="submit" className="w-full md:w-[unset]">
							{t('settingsScene.general.profileForm.buttons.confirm')}
						</Button>

						{hasUnsavedChanges && (
							<Text variant="muted" size="xs">
								{t('settingsScene.general.profileForm.labels.activeChangesPrompt')}
							</Text>
						)}
					</div>
				</div>

				<input className="hidden" {...form.register('avatarUrl')} />
				<AvatarPicker
					imageUrl={avatarUrl}
					fallback={user?.username}
					onImageChange={handleImageChange}
				/>
			</div>
		</Form>
	)
}
