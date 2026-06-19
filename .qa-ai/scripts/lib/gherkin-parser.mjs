/**
 * Structured Gherkin parser (tokenizer + AST generator).
 * Zero dependencies. Runs on Node 20/22.
 */

function getKeywords(language) {
  if (language === 'es') {
    return {
      feature: ['Característica', 'Caracteristica', 'Caso de negocio', 'Habilidad'],
      rule: ['Regla'],
      background: ['Antecedentes'],
      scenario: ['Escenario', 'Ejemplo', 'Esquema del escenario', 'Plantilla del escenario'],
      examples: ['Ejemplos', 'Escenarios'],
      steps: ['Dado', 'Dada', 'Dados', 'Dadas', 'Cuando', 'Entonces', 'Y', 'Pero', '\\*']
    };
  }
  // Default to English
  return {
    feature: ['Feature', 'Business Need', 'Ability'],
    rule: ['Rule'],
    background: ['Background'],
    scenario: ['Scenario', 'Example', 'Scenario Outline', 'Scenario Template'],
    examples: ['Examples', 'Scenarios'],
    steps: ['Given', 'When', 'Then', 'And', 'But', '\\*']
  };
}

function matchKeyword(trimmedLine, keywordList, hasColon = true) {
  for (const kw of keywordList) {
    if (hasColon) {
      const prefix = `${kw.toLowerCase()}:`;
      if (trimmedLine.toLowerCase().startsWith(prefix)) {
        return {
          keyword: kw,
          name: trimmedLine.slice(prefix.length).trim()
        };
      }
    } else {
      if (kw === '\\*' || kw === '*') {
        if (trimmedLine.startsWith('*') && (trimmedLine.length === 1 || /\s/.test(trimmedLine[1]))) {
          return {
            keyword: '*',
            text: trimmedLine.slice(1).trim()
          };
        }
      } else {
        const prefix = kw.toLowerCase();
        if (
          trimmedLine.toLowerCase().startsWith(prefix) &&
          (trimmedLine.length === prefix.length || /\s/.test(trimmedLine[prefix.length]))
        ) {
          return {
            keyword: trimmedLine.slice(0, prefix.length),
            text: trimmedLine.slice(prefix.length).trim()
          };
        }
      }
    }
  }
  return null;
}

function splitTableRow(rowText) {
  const cells = [];
  let currentCell = '';
  const trimmed = rowText.trim();
  const inner = trimmed.slice(1, -1);

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    if (char === '\\' && inner[i + 1] === '|') {
      currentCell += '|';
      i++;
    } else if (char === '|') {
      cells.push(currentCell.trim());
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  cells.push(currentCell.trim());
  return cells;
}

/**
 * Parses Gherkin text into a structured AST.
 * @param {string} text - Gherkin feature file content
 * @param {string} [defaultLanguage] - Language to default to if no # language header is found
 * @returns {object} GherkinDocument AST
 */
export function parse(text, defaultLanguage = 'en') {
  if (typeof text !== 'string') {
    throw new TypeError('Input text must be a string');
  }

  let parsedText = text;
  if (parsedText.startsWith('\uFEFF')) {
    parsedText = parsedText.slice(1);
  }

  const lines = parsedText.split(/\r?\n/);

  // Detect language
  let language = defaultLanguage || 'en';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed) {
      if (trimmed.toLowerCase().startsWith('# language:')) {
        const match = trimmed.match(/#\s*language:\s*([a-zA-Z-]+)/i);
        if (match) {
          language = match[1].toLowerCase();
        }
      }
      if (!trimmed.startsWith('#')) {
        break;
      }
    }
  }

  const keywords = getKeywords(language);

  const doc = {
    type: 'GherkinDocument',
    language,
    feature: null,
    comments: []
  };

  let pendingTags = [];
  let currentFeature = null;
  let currentRule = null;
  let currentBackground = null;
  let currentScenario = null;
  let currentStep = null;
  let currentExamples = null;
  let activeContainer = null;

  let inDocString = false;
  let docStringDelimiter = '';
  let docStringContent = [];
  let docStringStartLine = 0;
  let docStringStartCol = 0;
  let docStringIndentation = 0;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineContent = lines[lineIdx];
    const lineNum = lineIdx + 1;
    const trimmed = lineContent.trim();

    if (inDocString) {
      if (trimmed === docStringDelimiter) {
        inDocString = false;
        if (currentStep) {
          currentStep.docString = {
            type: 'DocString',
            line: docStringStartLine,
            column: docStringStartCol,
            delimiter: docStringDelimiter,
            content: docStringContent.join('\n')
          };
        }
        docStringContent = [];
      } else {
        let contentLine;
        if (lineContent.startsWith(' '.repeat(docStringIndentation))) {
          contentLine = lineContent.slice(docStringIndentation);
        } else if (lineContent.startsWith('\t'.repeat(docStringIndentation))) {
          contentLine = lineContent.slice(docStringIndentation);
        } else {
          const leadingSpaces = lineContent.match(/^\s*/)[0].length;
          const toStrip = Math.min(leadingSpaces, docStringIndentation);
          contentLine = lineContent.slice(toStrip);
        }
        docStringContent.push(contentLine);
      }
      continue;
    }

    if (trimmed === '') {
      if (activeContainer && activeContainer.description !== undefined) {
        if (activeContainer.description) {
          activeContainer.description += '\n';
        }
      }
      continue;
    }

    if (trimmed.startsWith('#')) {
      const col = lineContent.indexOf('#') + 1;
      doc.comments.push({
        type: 'Comment',
        text: trimmed,
        line: lineNum,
        column: col
      });
      continue;
    }

    if (trimmed.startsWith('@')) {
      const commentIdx = lineContent.indexOf('#');
      const tagContent = commentIdx >= 0 ? lineContent.slice(0, commentIdx) : lineContent;
      const parts = tagContent.trim().split(/\s+/).filter(Boolean);
      for (const part of parts) {
        if (part.startsWith('@')) {
          const col = lineContent.indexOf(part) + 1;
          pendingTags.push({
            type: 'Tag',
            name: part,
            line: lineNum,
            column: col
          });
        }
      }
      if (commentIdx >= 0) {
        const commentText = lineContent.slice(commentIdx).trim();
        doc.comments.push({
          type: 'Comment',
          text: commentText,
          line: lineNum,
          column: commentIdx + 1
        });
      }
      continue;
    }

    // Docstring Start
    if (trimmed.startsWith('"""') || trimmed.startsWith('```')) {
      const delimiter = trimmed.slice(0, 3);
      const mediaType = trimmed.slice(3).trim();
      inDocString = true;
      docStringDelimiter = delimiter;
      docStringContent = [];
      docStringStartLine = lineNum;
      docStringStartCol = lineContent.indexOf(delimiter) + 1;
      docStringIndentation = lineContent.indexOf(delimiter);
      if (currentStep) {
        currentStep.docString = {
          type: 'DocString',
          line: docStringStartLine,
          column: docStringStartCol,
          delimiter: docStringDelimiter,
          mediaType: mediaType || null,
          content: ''
        };
      }
      continue;
    }

    // Table Row
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length >= 2) {
      const cells = splitTableRow(trimmed);
      const row = {
        line: lineNum,
        cells
      };
      if (currentExamples) {
        if (!currentExamples.header) {
          currentExamples.header = row;
        } else {
          currentExamples.rows.push(row);
        }
      } else if (currentStep) {
        if (!currentStep.dataTable) {
          currentStep.dataTable = [];
        }
        currentStep.dataTable.push(row);
      }
      continue;
    }

    // Feature
    const featureMatch = matchKeyword(trimmed, keywords.feature, true);
    if (featureMatch) {
      const col = lineContent.indexOf(featureMatch.keyword) + 1;
      const feature = {
        type: 'Feature',
        keyword: featureMatch.keyword,
        name: featureMatch.name,
        line: lineNum,
        column: col,
        description: '',
        tags: [...pendingTags],
        children: []
      };
      pendingTags = [];
      doc.feature = feature;
      currentFeature = feature;
      currentRule = null;
      currentBackground = null;
      currentScenario = null;
      currentStep = null;
      currentExamples = null;
      activeContainer = feature;
      continue;
    }

    // Rule
    const ruleMatch = matchKeyword(trimmed, keywords.rule, true);
    if (ruleMatch) {
      const col = lineContent.indexOf(ruleMatch.keyword) + 1;
      const rule = {
        type: 'Rule',
        keyword: ruleMatch.keyword,
        name: ruleMatch.name,
        line: lineNum,
        column: col,
        description: '',
        tags: [...pendingTags],
        children: []
      };
      pendingTags = [];
      if (currentFeature) {
        currentFeature.children.push(rule);
      }
      currentRule = rule;
      currentBackground = null;
      currentScenario = null;
      currentStep = null;
      currentExamples = null;
      activeContainer = rule;
      continue;
    }

    // Background
    const backgroundMatch = matchKeyword(trimmed, keywords.background, true);
    if (backgroundMatch) {
      const col = lineContent.indexOf(backgroundMatch.keyword) + 1;
      const background = {
        type: 'Background',
        keyword: backgroundMatch.keyword,
        name: backgroundMatch.name,
        line: lineNum,
        column: col,
        description: '',
        steps: []
      };
      const parent = currentRule || currentFeature;
      if (parent) {
        parent.children.push(background);
      }
      currentBackground = background;
      currentScenario = null;
      currentStep = null;
      currentExamples = null;
      activeContainer = background;
      continue;
    }

    // Scenario / Scenario Outline
    const scenarioMatch = matchKeyword(trimmed, keywords.scenario, true);
    if (scenarioMatch) {
      const col = lineContent.indexOf(scenarioMatch.keyword) + 1;
      const scenario = {
        type: 'Scenario',
        keyword: scenarioMatch.keyword,
        name: scenarioMatch.name,
        line: lineNum,
        column: col,
        description: '',
        tags: [...pendingTags],
        steps: [],
        examples: []
      };
      pendingTags = [];
      const parent = currentRule || currentFeature;
      if (parent) {
        parent.children.push(scenario);
      }
      currentScenario = scenario;
      currentBackground = null;
      currentStep = null;
      currentExamples = null;
      activeContainer = scenario;
      continue;
    }

    // Examples
    const examplesMatch = matchKeyword(trimmed, keywords.examples, true);
    if (examplesMatch) {
      const col = lineContent.indexOf(examplesMatch.keyword) + 1;
      const examples = {
        type: 'Examples',
        keyword: examplesMatch.keyword,
        name: examplesMatch.name,
        line: lineNum,
        column: col,
        description: '',
        tags: [...pendingTags],
        header: null,
        rows: []
      };
      pendingTags = [];
      if (currentScenario) {
        currentScenario.examples.push(examples);
      }
      currentExamples = examples;
      currentStep = null;
      activeContainer = examples;
      continue;
    }

    // Step
    const stepMatch = matchKeyword(trimmed, keywords.steps, false);
    if (stepMatch) {
      const col = lineContent.indexOf(stepMatch.keyword) + 1;
      const step = {
        type: 'Step',
        keyword: `${stepMatch.keyword} `,
        text: stepMatch.text,
        line: lineNum,
        column: col,
        docString: null,
        dataTable: null
      };
      const parent = currentScenario || currentBackground;
      if (parent) {
        parent.steps.push(step);
      }
      currentStep = step;
      currentExamples = null;
      activeContainer = null;
      continue;
    }

    // Text Description
    if (activeContainer && activeContainer.description !== undefined) {
      if (activeContainer.description) {
        activeContainer.description = `${activeContainer.description.replace(/\n$/, '')}\n${trimmed}`;
      } else {
        activeContainer.description = trimmed;
      }
    }
  }

  // Clean trailing newlines in descriptions
  if (doc.feature && doc.feature.description) {
    doc.feature.description = doc.feature.description.trim();
  }
  const cleanDescription = (node) => {
    if (node.description) {
      node.description = node.description.trim();
    }
    if (node.children) {
      node.children.forEach(cleanDescription);
    }
  };
  if (doc.feature) {
    cleanDescription(doc.feature);
  }

  return doc;
}
