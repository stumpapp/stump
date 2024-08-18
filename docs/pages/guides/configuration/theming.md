# Theming

## Color palettes

Stump supports code-based theming. This means that you can create your own themes by writing a few lines of code. This is done by creating a new, exported object that defines each required piece of the palette.

For example, the default dark theme for Stump can be found [here](https://github.com/stumpapp/stump/tree/develop/packages/components/themes/dark.ts). For brevity, the entire theme won't be shown here, but let's say we wanted to make a new theme called "midnight" that is based on the dark theme, but with a darker background:

```ts
// themes/midnight.ts
export const midnight: StumpTheme = {
	background: {
		DEFAULT: '#000000',
		// ... other background colors
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

## Fonts

Stump has a limited number of fonts built-in:

- [Inter](https://rsms.me/inter/)
- [OpenDyslexic](https://opendyslexic.org/)

If you would like a new font, it will have to be added to the project manually. This can be done by appropriately defining the font in CSS, such as:

```css
@font-face {
	font-family: 'MyFont';
	src: url('path/to/font.woff2') format('woff2');
}
```

You can see how this is done in the [fonts](https://github.com/stumpapp/stump/tree/main/packages/components/src/font) directory of the `components` package.

Once the font is defined, it can be added to the `fontFamily` object in the `tailwind.js` file:

```js
// tailwind.js
module.exports = {
	// ... stuff here ...
	theme: {
		fontFamily: {
			// ... other fonts
			'font-my-font': ['MyFont', 'sans'], // <- the `font-` prefix is important!
		},
	},
	// ... other configurations
}
```

Then, the font can be used in the `FontSelect` component:

```tsx
// scenes/settings/app/appearance/FontSelect.tsx
<NativeSelect
	value={app_font || 'inter'}
	options={[
		{ label: 'Inter', value: 'inter' },
		{ label: 'OpenDyslexic', value: 'opendyslexic' },
		{ label: 'MyFont', value: 'my-font' }, // <- our new font
	]}
	onChange={(e) => changeFont(e.target.value)}
/>
```

This will allow users to select the new font from the settings page. In the future, it is planned to allow for the mapping of local fonts so that users can use their own fonts without needing to modify the source code. See the [Future plans](#future-plans) section for more information.

### Restrictions

There are some restrictions for which fonts can be added:

- The font must be free to use and distribute (e.g. under the [SIL Open Font License](https://opensource.org/licenses/OFL-1.1))\*
- The font must be in a format that can be used on the web (e.g. WOFF2)
- The font must not add a significant amount of weight to the app (e.g. 1MB+)

\* This is to ensure that the project remains in compliance with open-source standards and guidelines, and free to use for everyone. Stump is licensed under [MIT](https://opensource.org/licenses/MIT), so the font must be compatible with this license

## Future plans

In the future, it is planned to support arbitrary, local CSS files for overriding Stump's default theme(s). This will allow for the same level of customization but without the need for a full release cycle or the need to share your coveted theme with the world.

You can track the progress of this feature [here](https://github.com/stumpapp/stump/issues/383).
