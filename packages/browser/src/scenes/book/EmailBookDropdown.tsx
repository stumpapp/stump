import { useEmailDevicesQuery, useSendAttachmentEmail } from '@stump/client'
import { Badge, Button, ComboBox, Dialog, IconButton, Input } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Send } from 'lucide-react'
import React, { Suspense, useCallback, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { useAppContext } from '@/context'

type ContainerProps = {
	mediaId: string
}
export default function EmailBookDropdownContainer({ mediaId }: ContainerProps) {
	const { checkPermission } = useAppContext()

	const canSendEmail = useMemo(() => checkPermission('email:send'), [checkPermission])
	const canArbitrarySendEmail = useMemo(
		() => checkPermission('email:arbitrary_send'),
		[checkPermission],
	)

	if (!canSendEmail && !canArbitrarySendEmail) {
		return null
	}

	return (
		<Suspense fallback={null}>
			<EmailBookDropdown mediaId={mediaId} canArbitrarySendEmail={canArbitrarySendEmail} />
		</Suspense>
	)
}

type Props = {
	canArbitrarySendEmail: boolean
} & ContainerProps

function EmailBookDropdown({ mediaId, canArbitrarySendEmail }: Props) {
	const { t } = useLocaleContext()
	const { devices } = useEmailDevicesQuery()
	const { sendAsync: sendEmail, isSending } = useSendAttachmentEmail()

	const [isOpen, setIsOpen] = useState(false)
	const [deviceIds, setDeviceIds] = useState<number[]>([])
	const [emails, setEmails] = useState<string[]>([])

	const [currentEmail, setCurrentEmail] = useState('')

	const handleSend = useCallback(async () => {
		if (deviceIds.length === 0 && emails.length === 0) {
			return
		}

		const payload = {
			media_ids: [mediaId],
			send_to: [
				...deviceIds.map((id) => ({ device_id: id })),
				...(canArbitrarySendEmail ? emails.map((email) => ({ email })) : []),
			],
		}

		try {
			const { errors } = await sendEmail(payload)
			setIsOpen(errors.length > 0)
			if (errors.length > 0) {
				console.warn(errors)
				toast.error('Some errors occurred while sending email(s). Check the logs for more detail')
			}
		} catch (error) {
			console.error(error)
			toast.error('Failed to send email')
		}
	}, [sendEmail, deviceIds, emails, canArbitrarySendEmail, mediaId])

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
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Trigger asChild>
				<IconButton size="sm" variant="ghost">
					<Send size="1.25rem" />
				</IconButton>
			</Dialog.Trigger>
			<Dialog.Content size="md">
				<Dialog.Header>
					<Dialog.Title>{t(getKey('heading'))}</Dialog.Title>
					<Dialog.Description>{t(getKey('description'))}</Dialog.Description>
					<Dialog.Close onClick={() => setIsOpen(false)} disabled={isSending} />
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
					<Button onClick={() => setIsOpen(false)} disabled={isSending}>
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
