import SettingsFormContainer from './SettingsFormContainer';
import LocaleSelector from '../LocaleSelector';

// TODO: locale for title/subtitle
// TODO: more preferences here...
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
