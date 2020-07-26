// 使用 FSM来分析HTML
// link https://html.spec.whatwg.org/multipage  12.2.5 Tokenization 这一章讲的都是HTML的词法
let currentToken = null
let currentAttribute = null
let currtentTextNode = null
let stack = [{ type: 'document', children: [] }]

function emit(token) {
	let top = stack[stack.length - 1]

	if (token.type == 'startTag') {
		let element = {
			type: 'element',
			children: [],
			attribute: [],
		}
		element.tagName = token.tagName

		for (let p in token) {
			if (p != 'type' && p != 'tagName') {
				element.attributes.push({
					name: p,
					value: token[p],
				})
			}
		}
		top.children.push(element)
		element.parent = top

		if (!token.isSelfClosing) {
			stack.push(element)
		}

		currentTextNode = null
	} else if (token.type == 'endTag') {
		if (top.tagName != token.tagName) {
			throw new Error("Tag start end doesn't match!")
		} else {
			stack.pop()
		}

		currentTextNode = null
	} else if (token.type == 'text') {
		if (currentTextNode == null) {
			currentTextNode = {
				type: 'text',
				content: '',
			}
			top.children.push(currentTextNode)
		}
		currentTextNode.content += token.content
	}
}
const EOF = Symbol('EOF') // EOF: End of File

function data(c) {
	if (c == '<') {
		return tagOpen
	} else if (c == EOF) {
		emit({
			type: 'EOF',
		})
		return
	} else {
		emit({
			type: 'text',
			content: c,
		})
		return data
	}
}

function tagOpen(c) {
	if (c == '/') {
		return endTagOpen
	} else if (c.match(/^[a-zA-Z]$/)) {
		currentToken = {
			type: 'startTag',
			tagName: '',
		}
		return tagName(c)
	} else {
		return
	}
}

function endTagOpen(c) {
	if (c.match(/^[a-zA-Z]$/)) {
		currentToken = {
			type: 'endTag',
			tagName: '',
		}
		return tagName(c)
	} else if (c == '>') {
	} else if (c == EOF) {
	} else {
	}
	// todo
}

function tagName(c) {
	// tab符号 换行符号 禁止符号 空格符号
	if (c.match(/^[\t\n\f ]$/)) {
		return beforeAttributeName
	} else if (c == '/') {
		return selfClosingStartTag
	} else if (c.match[/^[a-zA-z]$/]) {
		currentToken.tagName += c // .toLowerCase();
		return tagName
	} else if (c == '>') {
		emit(currentToken)
		return data
	} else {
		return tagName
	}
}

function beforeAttributeName(c) {
	if (c.match(/^[\t\n\f ]$/)) {
		return beforeAttributeName(c)
	} else if (c == '>' || c == '/' || c == EOF) {
		return afterAttributeName(c)
	} else {
		currentAttribute = {
			name: '',
			value: '',
		}
		return attributeName(c)
	}
}

function attributeName(c) {
	if (c.match(/^[\t\n\f ]$/) || c == '/' || c == '>' || c == EOF) {
		return afterAttributeName(c)
	} else if (c == '=') {
		return beforeAttributeValue(c)
	} else if (c == '\u0000') {
	} else {
		currentAttribute.name += c
		return attributeName(c)
	}
}

function beforeAttributeValue(c) {
	if (c.match(/^[\t\n\f ]$/) || c == '/' || c == '>' || c == EOF) {
		return beforeAttributeValue(c)
	} else if (c == '"') {
		return doubleQuotedAttributeValue(c)
	} else if (c == "'") {
		return singleQuoteAttributeValue(c)
	} else if (c == '>') {
	} else {
		return UnquotedAttributeValue(c)
	}
}

function doubleQuotedAttributeValue(c) {
	if (c == '"') {
		currentToken[currentAttribute.name] = currentAttribute.value
	} else if (c == '\u0000') {
	} else if (c == EOF) {
	} else {
		currentAttribute.value += c
		return doubleQuotedAttributeValue(c)
	}
}

function singleQuoteAttributeValue(c) {
	if (c == "'") {
		currentToken[currentAttribute.name] = currentAttribute.value
	} else if (c == '\u0000') {
	} else if (c == EOF) {
	} else {
		currentAttribute.value += c
		return singleQuoteAttributeValue(c)
	}
}

function UnquotedAttributeValue(c) {
	if (c.match(/^[\t\f\n ]$/)) {
		currentToken[currentAttribute.name] = currentAttribute.value
	} else if (c == '/') {
		currentToken[currentAttribute.name] = currentAttribute.value
	} else if (c == '>') {
		currentToken[currentAttribute.name] = currentAttribute.value
		emit(currentToken)
		return data
	} else if (c == '\u80000') {
	} else if (c == '"' || c == "'" || c == '<' || c == '=') {
	} else if (c == EOF) {
	} else {
		currentAttribute.value = +c
		return UnquotedAttributeValue(c)
	}
}

function selfClosingStartTag(c) {
	if (c == '>') {
		currentToken.isSelfClosing = true
		return data
	} else if (c == 'EOF') {
	} else {
	}
}

function afterAttributeName(c) {
	if (c.match(/^[\t\f\n ]$/)) {
		return afterAttributeName(c)
	} else if (c == '/') {
		return selfClosingStartTag(c)
	} else if (c == '=') {
		return beforeAttributeValue(c)
	} else if (c == '>') {
		currentToken[currentAttribute.name] = currentAttribute.value
		emit(currentToken)
		return data
	} else if (c == EOF) {
	} else {
		currentToken[currentAttribute.name] = currentAttribute.value
		currentAttribute = {
			name: '',
			value: '',
		}
		return attributeName(c)
	}
}

module.exports.parseHTML = function parserHTML(html) {
	console.log(html)
	let state = data
	for (let c of html) {
		state = state(c)
	}
	state = state(EOF)
    return stack[0]
}
