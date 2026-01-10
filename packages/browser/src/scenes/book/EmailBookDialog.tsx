import { useGraphQLMutation, useSDK, useSuspenseGraphQL } from '@stump/client'
import { Badge, Button, ComboBox, Dialog, Input } from '@stump/components'
import { EmailerSendTo, graphql, UserPermission } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Suspense, useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAppContext } from '@/context'

const query = graphql(`
	query EmailBookDropdownDevice {
		emailDevices {
			id
			name
		}
	}
`)

const mutation = graphql(`
	mutation SendEmailAttachment($id: ID!, $sendTo: [EmailerSendTo!]!) {
		sendAttachmentEmail(input: { mediaIds: [$id], sendTo: $sendTo }) {
			sentCount
			errors
		}
	}
`)

type ContainerProps = {
	mediaId: string
	isOpen: boolean
	onClose: () => void
}

export default function EmailBookDialogContainer(props: ContainerProps) {
	const { checkPermission } = useAppContext()

	const canSendEmail = useMemo(() => checkPermission(UserPermission.EmailSend), [checkPermission])
	const canArbitrarySendEmail = useMemo(
		() => checkPermission(UserPermission.EmailArbitrarySend),
		[checkPermission],
	)

	if (!canSendEmail && !canArbitrarySendEmail) {
		return null
	}

	return (
		<Suspense fallback={null}>
			<EmailBookDialog canArbitrarySendEmail={canArbitrarySendEmail} {...props} />
		</Suspense>
	)
}

type Props = {
	canArbitrarySendEmail: boolean
} & ContainerProps

function EmailBookDialog({ mediaId, isOpen, onClose, canArbitrarySendEmail }: Props) {
	const { t } = useLocaleContext()
	const { sdk } = useSDK()
	const {
		data: { emailDevices: devices },
	} = useSuspenseGraphQL(query, sdk.cacheKey('emailDevices'))

	const mutationKey = ['sendEmailAttachment', mediaId]

	const { mutate, status } = useGraphQLMutation(mutation, {
		mutationKey,
		onSettled: (data, error) => {
			if (error) {
				console.error('Error sending email:', error)
			}
			const errors = data?.sendAttachmentEmail?.errors || []
			if (errors.length > 0) {
				onClose()
				console.warn(errors)
				toast.error('Some errors occurred while sending email(s). Check the logs for more detail')
			}
		},
	})
	const isSending = status === 'pending'

	const [deviceIds, setDeviceIds] = useState<number[]>([])
	const [emails, setEmails] = useState<string[]>([])

	const [currentEmail, setCurrentEmail] = useState('')

	const handleSend = useCallback(async () => {
		if (deviceIds.length === 0 && emails.length === 0) {
			return
		}

		const sendTo: EmailerSendTo[] = []
		if (deviceIds.length > 0) {
			sendTo.push(...deviceIds.map((id) => ({ device: { id: id } })))
		}
		if (canArbitrarySendEmail && emails.length > 0) {
			sendTo.push(...emails.map((email) => ({ anonymous: { email: email } })))
		}

		try {
			mutate({ id: mediaId, sendTo })
		} catch (error) {
			console.error(error)
			toast.error('Failed to send email')
		}
	}, [mutate, deviceIds, emails, canArbitrarySendEmail, mediaId])

	const renderArbitraryEmails = () => {
		if (!canArbitrarySendEmail) {
			return null
		} else {
			return (
				<div className="flex flex-col space-y-2">
					<div className="flex flex-wrap items-center gap-x-2">
						{emails.map((email, index) => (
							<Badge
								key={index}
								size="sm"
								variant="default"
								onClick={() => setEmails((curr) => curr.filter((e) => e !== email))}
							>
								{email}
							</Badge>
						))}
					</div>

					<div className="flex w-full items-center space-x-2">
						<Input
							label={t(getFormKey('email.label'))}
							description={t(getFormKey('email.description'))}
							fullWidth
							variant="primary"
							value={currentEmail}
							onChange={(e) => setCurrentEmail(e.target.value)}
						/>
						<Button
							size="sm"
							variant="ghost"
							className="shrink-0"
							disabled={!currentEmail}
							onClick={() => {
								setEmails((curr) => [...curr, currentEmail])
								setCurrentEmail('')
							}}
						>
							{t('common.add')}
						</Button>
					</div>
				</div>
			)
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<Dialog.Content size="md">
				<Dialog.Header>
					<Dialog.Title>{t(getKey('heading'))}</Dialog.Title>
					<Dialog.Description>{t(getKey('description'))}</Dialog.Description>
					<Dialog.Close onClick={onClose} disabled={isSending} />
				</Dialog.Header>

				<div className="flex flex-col space-y-4">
					<ComboBox
						label={t(getFormKey('devices.label'))}
						options={devices.map((device) => ({
							label: device.name,
							value: device.id.toString(),
						}))}
						isMultiSelect
						filterable
						filterEmptyMessage={t(getFormKey('devices.noFilterMatch'))}
						value={deviceIds.map((id) => id.toString())}
						onChange={(selected) => {
							setDeviceIds(selected?.map((id) => parseInt(id)).filter((id) => !isNaN(id)) || [])
						}}
						size="full"
					/>

					{renderArbitraryEmails()}
				</div>

				<Dialog.Footer>
					<Button onClick={onClose} disabled={isSending}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleSend} disabled={isSending} isLoading={isSending}>
						Confirm
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}

const BASE_LOCALE_KEY = 'bookOverviewScene.emailBook'
const getKey = (key: string) => `${BASE_LOCALE_KEY}.${key}`
const getFormKey = (key: string) => `${BASE_LOCALE_KEY}.form.${key}`
