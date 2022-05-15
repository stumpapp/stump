import React, { useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

import Prism from 'prismjs';

import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-bash';

import '../styles/darcula.css';
import '../styles/markdown.css';

// https://marked.js.org/using_advanced#options
marked.setOptions({
	highlight: function (code, lang) {
		if (Prism.languages[lang]) {
			return Prism.highlight(code, Prism.languages[lang], lang);
		} else {
			return code;
		}
	},
	sanitizer: DOMPurify.sanitize,
	gfm: true,
	breaks: true,
});

interface Props {
	text: string;
	lastModified: string | null;
}

export default function Markdown({ text }: Props) {
	useEffect(() => {
		// https://spdevuk.com/how-to-create-code-copy-button/
		// const highlights = document.querySelectorAll("div.highlight")
		// highlights.forEach(div => {
		// 	// create the copy button
		// 	const copy = document.createElement("button")
		// 	copy.innerHTML = "Copy"
		// 	// add the event listener to each click
		// 	copy.addEventListener("click", handleCopyClick)
		// 	// append the copy button to each code block
		// 	div.append(copy)
		// })
	}, []);
	return (
		<div
			className="markdown-body"
			dangerouslySetInnerHTML={{
				__html: marked.parse(text),
			}}
		/>
	);
}
