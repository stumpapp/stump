export function useUserPreferences() {
	// const { mutateAsync } = useMutation(
	// 	['updateUserPreferences', user?.id],
	// 	(preferences: UserPreferences) => updateUserPreferences(user!.id, preferences),
	// 	{
	// 		onSuccess(res) {
	// 			// setUserPreferences(res.data);
	// 		},
	// 	},
	// );
	// function updatePreferences(preferences: UserPreferences, showToast = false) {
	// 	if (user?.id && preferences) {
	// 		if (showToast) {
	// 			toast.promise(mutateAsync(preferences), {
	// 				loading: 'Updating...',
	// 				success: 'Preferences updated!',
	// 				error: 'Failed to update preferences.',
	// 			});
	// 		} else {
	// 			mutateAsync(preferences).catch((err) => {
	// 				console.error(err);
	// 			});
	// 		}
	// 	}
	// }
	// TODO: handle on 401?
	// return { user, preferences: user?.userPreferences, updatePreferences };
}
