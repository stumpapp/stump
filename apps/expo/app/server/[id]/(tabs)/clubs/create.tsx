import { Host, Image } from '@expo/ui/swift-ui'
import { useGraphQLMutation } from '@stump/client'
import { graphql } from '@stump/graphql'
import { useNavigation, useRouter } from 'expo-router'
import { Check } from 'lucide-react-native'
import { useCallback, useLayoutEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { toast } from 'sonner-native'

import { useActiveServer } from '~/components/activeServer'
import { Icon, Input, Switch, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

const createMutation = graphql(`
	mutation CreateBookClubMobile($input: CreateBookClubInput!) {
		createBookClub(input: $input) {
			id
			slug
		}
	}
`)

export default function Screen() {
	const { t } = useTranslate()
	const router = useRouter()
	const {
		activeServer: { id: serverID },
	} = useActiveServer()

	const { mutateAsync: createClub, isPending } = useGraphQLMutation(createMutation)

	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [isPrivate, setIsPrivate] = useState(false)

	const canSubmit = name.trim().length > 0

	const handleCreate = useCallback(async () => {
		if (!canSubmit) return

		try {
			const result = await createClub({
				input: {
					name: name.trim(),
					description: description.trim() || null,
					isPrivate,
					creatorHideProgress: false,
				},
			})

			if (result.createBookClub?.id) {
				router.replace(`/server/${serverID}/clubs/${result.createBookClub.id}`)
			}
		} catch (error) {
			toast.error(t('bookClub.createFailed'), {
				description: error instanceof Error ? error.message : t('errors.unknown'),
			})
		}
	}, [canSubmit, createClub, description, isPrivate, name, router, serverID, t])

	const navigation = useNavigation()
	useLayoutEffect(() => {
		navigation.setOptions({
			headerRight: () => (
				<Pressable onPress={handleCreate} disabled={!canSubmit || isPending}>
					{CheckIcon}
				</Pressable>
			),
		})
	}, [navigation, handleCreate, canSubmit, isPending])

	return (
		<SafeAreaView className="flex-1 bg-background">
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				className="flex-1"
			>
				<ScrollView
					className="flex-1"
					contentContainerStyle={{ padding: 16 }}
					keyboardShouldPersistTaps="handled"
					contentInsetAdjustmentBehavior="automatic"
				>
					<View className="gap-6">
						<Input
							label={t('bookClub.name')}
							placeholder={t('bookClub.namePlaceholder')}
							value={name}
							onChange={(e) => setName(e.nativeEvent.text)}
							autoCapitalize="words"
							autoCorrect={false}
						/>

						<Input
							label={t('bookClub.description')}
							placeholder={t('bookClub.descriptionPlaceholder')}
							value={description}
							onChange={(e) => setDescription(e.nativeEvent.text)}
							multiline
							numberOfLines={3}
							style={{ minHeight: 80, textAlignVertical: 'top' }}
						/>

						{/* FIXME: No idea why I need mt here, something weird with switches */}
						<View className="mt-12 flex-row items-center justify-between">
							<Text>{t('bookClub.private')}</Text>
							<Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
						</View>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}

const CheckIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="checkmark" size={16} />
		</Host>
	),
	android: <Icon as={Check} className="shadow" />,
})
