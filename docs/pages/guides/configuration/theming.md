# Theming

Stump supports code-based theming. This means that you can create your own themes by writing a few lines of code. This is done by creating a new, exported object that defines each required piece of the palette.

For example, the default dark theme for Stump can be found [here](https://github.com/stumpapp/stump/tree/develop/packages/components/themes/dark.ts). For brevity, the entire theme won't be shown here, but let's say we wanted to make a new theme called "midnight" that is based on the dark theme, but with a darker background:

```ts
// themes/midnight.ts
export const midnight: ThemeDefinition = {
	background: {
		100: '#000000',
		200: '#111111',
		300: '#222222',
		400: '#333333',
		500: '#444444',
		DEFAULT: '#000000',
		danger: '#491B1C',
		warning: '#412E19',
	},
	// ... other theme definitions
}
```

Then we just need to include it in the exported `themes` object:

```ts
// themes/index.ts
export const themes = {
	dark,
	light,
	// ... other themes
	midnight, // <- our new theme
}
```

Then we should add it to the main [`ThemeSelect` component](https://github.com/stumpapp/stump/tree/develop/packages/browser/src/scenes/settings/app/appearance/ThemeSelect.tsx) so that it can be selected:

```tsx
// scenes/settings/app/appearance/ThemeSelect.tsx
<NativeSelect
	value={theme}
	options={[
		{ label: t(`${localeKey}.options.light`), value: 'light' },
		{ label: t(`${localeKey}.options.dark`), value: 'dark' },
		{ label: t(`${localeKey}.options.bronze`), value: 'bronze' },
		{ label: t(`${localeKey}.options.midnight`), value: 'midnight' }, // <- our new theme
	]}
	onChange={(e) => changeTheme(e.target.value)}
/>
```

Note that the `label` is a translation key, so we should add it to the [`locales/en.json` file](https://github.com/stumpapp/stump/tree/develop/packages/browser/src/i18n/locales/en.json), as well.

## Future theming features

In the future, it is planned to support arbitrary, local CSS files for overriding Stump's default theme(s). This will allow for the same level of customization but without the need for a full release cycle.
