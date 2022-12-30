import SettingsSection from '../SettingsSection';
import LocaleSelector from '../LocaleSelector';

// TODO: locale for title/subtitle
// TODO: more preferences here...
export default function PreferencesForm() {
	// TODO: multiple forms...
	return (
		<SettingsSection
			title="Preferences"
			subtitle="Various configurable options according to your preference"
		>
			<LocaleSelector />
		</SettingsSection>
	);
}

// TODO: I will eventually add a decent amount of configurable user preferences here.
// So far, what I have in mind is:
// - Progress display (progress bar, percentage, fraction, etc)
// - Library list order by + direction
// - Global font size (for accessibility)
// 		- Note that this will be sort of a scaling factor, with options like "small", "medium", "large", etc. Selecting one
// 		  will scale certain categories of fonts (e.g. body text, headings, etc) by a certain factor.
// - Various default settings for animation options
// 		- e.g. animated reader as default, etc
// - Default reader mode (vertical, horizontal, etc)
// 		- Note that this will really only apply to certain media kinds
