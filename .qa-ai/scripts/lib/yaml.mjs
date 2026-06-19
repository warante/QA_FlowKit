/**
 * Strict, dependency-free YAML parser with located errors.
 * Zero runtime dependencies. Node 20/22 compatible.
 */

function throwYAMLError(message, line, column, filename) {
  const err = new Error(`${filename}:${line}:${column}: ${message}`);
  err.name = 'YAMLError';
  err.line = line;
  err.column = column;
  err.file = filename;
  throw err;
}

function getColonIndex(text) {
  let inQuote = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === ':') {
      if (i === text.length - 1 || /\s/.test(text[i + 1])) {
        return i;
      }
    }
  }
  return -1;
}

function getNextLineInfo(rawLines, startIndex) {
  for (let i = startIndex; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const trimmed = raw.trim();
    if (trimmed !== '' && !trimmed.startsWith('#')) {
      const indentMatch = raw.match(/^[ \t]*/);
      const indent = indentMatch ? indentMatch[0].length : 0;
      return {
        text: trimmed,
        indent,
        index: i
      };
    }
  }
  return null;
}

export function stripInlineComment(text) {
  if (!text) return text;
  const q = text[0];
  if (q === '"' || q === "'") {
    let close = -1;
    if (q === '"') {
      let escaped = false;
      for (let i = 1; i < text.length; i++) {
        if (escaped) {
          escaped = false;
        } else if (text[i] === '\\') {
          escaped = true;
        } else if (text[i] === '"') {
          close = i;
          break;
        }
      }
    } else {
      for (let i = 1; i < text.length; i++) {
        if (text[i] === "'") {
          if (text[i + 1] === "'") {
            i++;
          } else {
            close = i;
            break;
          }
        }
      }
    }
    if (close > 0) return text.slice(0, close + 1);
    return text;
  }
  const hashIdx = text.indexOf(' #');
  return hashIdx > -1 ? text.slice(0, hashIdx).trim() : text;
}

function parseScalar(text, lineNum, filename) {
  const stripped = stripInlineComment(text.trim());
  const trimmed = stripped.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null' || trimmed === '~') return null;

  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    const quote = trimmed[0];
    const inner = trimmed.slice(1, -1);
    if (quote === '"') {
      return inner.replace(/\\([bfnrtv"\\/]|u[0-9a-fA-F]{4})/g, (match, p1) => {
        if (p1.startsWith('u')) {
          return String.fromCharCode(parseInt(p1.slice(1), 16));
        }
        switch (p1) {
          case 'b':
            return '\b';
          case 'f':
            return '\f';
          case 'n':
            return '\n';
          case 'r':
            return '\r';
          case 't':
            return '\t';
          case 'v':
            return '\v';
          default:
            return p1;
        }
      });
    } else {
      return inner.replace(/''/g, "'");
    }
  }

  if (trimmed.startsWith('&')) {
    throwYAMLError(`YAML anchors are unsupported: "${trimmed}"`, lineNum, 1, filename);
  }
  if (trimmed.startsWith('*')) {
    throwYAMLError(`YAML aliases are unsupported: "${trimmed}"`, lineNum, 1, filename);
  }
  if (trimmed.startsWith('!')) {
    throwYAMLError(`YAML tags are unsupported: "${trimmed}"`, lineNum, 1, filename);
  }
  if (trimmed.startsWith('{')) {
    throwYAMLError(`Flow style mappings are unsupported: "${trimmed}"`, lineNum, 1, filename);
  }
  if (trimmed.startsWith('[')) {
    return parseInlineList(trimmed, lineNum, filename);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
}

function parseInlineList(text, lineNum, filename) {
  const inner = text.slice(1, -1).trim();
  if (!inner) return [];
  const items = [];
  let current = '';
  let inQuote = null;
  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      }
      current += char;
    } else if (char === '"' || char === "'") {
      inQuote = char;
      current += char;
    } else if (char === ',') {
      items.push(parseScalar(current.trim(), lineNum, filename));
      current = '';
    } else if (char === '{' || char === '[') {
      throwYAMLError(
        `Flow style beyond simple inline lists is unsupported: ${char}`,
        lineNum,
        inner.indexOf(char) + 2,
        filename
      );
    } else {
      current += char;
    }
  }
  if (inQuote) {
    throwYAMLError('Unterminated quote in inline list', lineNum, 1, filename);
  }
  items.push(parseScalar(current.trim(), lineNum, filename));
  return items;
}

function validateKey(key, lineNum, colNum, filename) {
  const trimmed = key.trim();
  if (
    trimmed.startsWith('&') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('!') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[')
  ) {
    throwYAMLError(`Invalid or unsupported key: "${trimmed}"`, lineNum, colNum, filename);
  }
}

function collectBlockScalar(rawLines, startIndex, parentIndent, operator, lineNum, filename) {
  const contentLines = [];
  let i = startIndex;
  let commonIndent = -1;

  while (i < rawLines.length) {
    const nextLine = rawLines[i];
    const trimmed = nextLine.trim();

    if (trimmed === '') {
      contentLines.push('');
      i++;
      continue;
    }

    const indentMatch = nextLine.match(/^[ \t]*/);
    const indentStr = indentMatch ? indentMatch[0] : '';
    if (indentStr.includes('\t')) {
      throwYAMLError('Tabs are not allowed for indentation in YAML', i + 1, nextLine.indexOf('\t') + 1, filename);
    }
    const indent = indentStr.length;

    if (indent <= parentIndent) {
      break;
    }

    if (commonIndent === -1) {
      commonIndent = indent;
    }

    let lineText;
    if (nextLine.startsWith(' '.repeat(commonIndent))) {
      lineText = nextLine.slice(commonIndent);
    } else {
      lineText = nextLine.trimStart();
    }

    contentLines.push(lineText);
    i++;
  }

  while (contentLines.length > 0 && contentLines[contentLines.length - 1] === '') {
    contentLines.pop();
  }

  if (contentLines.length === 0) {
    return {
      content: '',
      nextIndex: i
    };
  }

  let content;
  if (operator === '|') {
    content = `${contentLines.join('\n')}\n`;
  } else {
    let result = '';
    for (let j = 0; j < contentLines.length; j++) {
      const line = contentLines[j];
      if (line === '') {
        result = `${result.trimEnd()}\n\n`;
      } else {
        const nextLine = contentLines[j + 1];
        if (nextLine === '' || nextLine === undefined) {
          result += `${line}\n`;
        } else {
          result += `${line} `;
        }
      }
    }
    content = result;
  }

  return {
    content,
    nextIndex: i
  };
}

/**
 * Parses YAML text into a JavaScript object.
 * @param {string} content - YAML content string
 * @param {string} [filename] - Optional filename for error reporting
 * @returns {object} Parsed JavaScript object
 */
export function parseYaml(content, filename = 'inline') {
  if (typeof content !== 'string') {
    throw new TypeError('Content must be a string');
  }

  const rawLines = content.split(/\r?\n/);
  const root = {};
  const stack = [{ indent: -1, value: root, type: 'map' }];

  let i = 0;
  while (i < rawLines.length) {
    const rawLine = rawLines[i];
    const trimmed = rawLine.trim();

    if (trimmed === '' || trimmed.startsWith('#') || trimmed === '---' || trimmed === '...') {
      i++;
      continue;
    }

    const indentMatch = rawLine.match(/^[ \t]*/);
    const indentStr = indentMatch ? indentMatch[0] : '';
    if (indentStr.includes('\t')) {
      throwYAMLError('Tabs are not allowed for indentation in YAML', i + 1, rawLine.indexOf('\t') + 1, filename);
    }
    const indent = indentStr.length;

    while (stack.length > 1 && stack.at(-1).indent >= indent) {
      stack.pop();
    }

    const parentEntry = stack.at(-1);
    const parent = parentEntry.value;

    const isSequenceItem = trimmed.startsWith('-') && (trimmed.length === 1 || /\s/.test(trimmed[1]));

    if (isSequenceItem) {
      if (!Array.isArray(parent)) {
        throwYAMLError('Hyphen (-) is only allowed inside a sequence', i + 1, rawLine.indexOf('-') + 1, filename);
      }

      const itemText = trimmed.slice(1).trim();

      if (itemText === '|' || itemText === '>') {
        const blockRes = collectBlockScalar(rawLines, i + 1, indent, itemText, i + 1, filename);
        parent.push(blockRes.content);
        i = blockRes.nextIndex;
        continue;
      }

      const colonIndex = getColonIndex(itemText);
      if (colonIndex > 0) {
        const item = {};
        const key = itemText.slice(0, colonIndex).trim();
        const rest = itemText.slice(colonIndex + 1).trim();

        validateKey(key, i + 1, rawLine.indexOf(key) + 1, filename);

        if (rest) {
          if (rest === '|' || rest === '>') {
            const blockRes = collectBlockScalar(rawLines, i + 1, indent + 2, rest, i + 1, filename);
            item[key] = blockRes.content;
            i = blockRes.nextIndex;
          } else {
            item[key] = parseScalar(rest, i + 1, filename);
            i++;
          }
          parent.push(item);
          stack.push({ indent, value: item, type: 'map' });
        } else {
          const nextLineInfo = getNextLineInfo(rawLines, i + 1);
          if (!nextLineInfo) {
            item[key] = {};
          } else if (nextLineInfo.indent <= indent) {
            item[key] = {};
          } else {
            const child =
              nextLineInfo.text.startsWith('-') && (nextLineInfo.text.length === 1 || /\s/.test(nextLineInfo.text[1]))
                ? []
                : {};
            item[key] = child;
            parent.push(item);
            stack.push({ indent, value: item, type: 'map' });
            stack.push({ indent: indent + 2, value: child, type: Array.isArray(child) ? 'seq' : 'map' });
          }
          i++;
        }
      } else {
        if (itemText) {
          parent.push(parseScalar(itemText, i + 1, filename));
        } else {
          const nextLineInfo = getNextLineInfo(rawLines, i + 1);
          if (nextLineInfo && nextLineInfo.indent > indent) {
            const child =
              nextLineInfo.text.startsWith('-') && (nextLineInfo.text.length === 1 || /\s/.test(nextLineInfo.text[1]))
                ? []
                : {};
            parent.push(child);
            stack.push({ indent, value: child, type: Array.isArray(child) ? 'seq' : 'map' });
          } else {
            parent.push(null);
          }
        }
        i++;
      }
    } else {
      if (Array.isArray(parent)) {
        throwYAMLError('Expected sequence item starts with a hyphen (-)', i + 1, 1, filename);
      }

      const colonIndex = getColonIndex(trimmed);
      if (colonIndex === -1) {
        throwYAMLError(`Invalid YAML line (missing colon): "${trimmed}"`, i + 1, 1, filename);
      }

      const key = trimmed.slice(0, colonIndex).trim();
      const rest = trimmed.slice(colonIndex + 1).trim();

      validateKey(key, i + 1, rawLine.indexOf(key) + 1, filename);

      if (rest) {
        if (rest === '|' || rest === '>') {
          const blockRes = collectBlockScalar(rawLines, i + 1, indent, rest, i + 1, filename);
          parent[key] = blockRes.content;
          i = blockRes.nextIndex;
        } else {
          parent[key] = parseScalar(rest, i + 1, filename);
          i++;
        }
      } else {
        const nextLineInfo = getNextLineInfo(rawLines, i + 1);
        if (!nextLineInfo) {
          parent[key] = {};
        } else if (nextLineInfo.indent <= indent) {
          parent[key] = null;
          i++;
        } else {
          const child =
            nextLineInfo.text.startsWith('-') && (nextLineInfo.text.length === 1 || /\s/.test(nextLineInfo.text[1]))
              ? []
              : {};
          parent[key] = child;
          stack.push({ indent, value: child, type: Array.isArray(child) ? 'seq' : 'map' });
          i++;
        }
      }
    }
  }

  return root;
}
