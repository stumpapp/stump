import React from 'react';
import SettingsFormContainer from '../SettingsFormContainer';
import LocaleSelector from './LocaleSelector';

export default function PreferencesForm() {
	return (
		<SettingsFormContainer
			title="Preferences"
			subtitle="Various configurable options according to your preference"
		>
			<LocaleSelector />
		</SettingsFormContainer>
	);
}
