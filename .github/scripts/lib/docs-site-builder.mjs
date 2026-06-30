#!/usr/bin/env node
/**
 * Renders the GitHub Pages landing site from locale JSON content and template.html.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const commandBase = 'https://github.com/warante/QA_FlowKit/blob/main/.qa-ai/adapters/opencode/commands';

export function renderLangOption(option) {
  const className = `lang-option${option.active ? ' is-active' : ''}`;
  if (option.tag === 'a') {
    const attrs = [
      `class="${className}"`,
      `href="${option.href}"`,
      `hreflang="${option.hreflang}"`,
      `lang="${option.lang}"`
    ];
    if (option.data_lang_choice) attrs.push(`data-lang-choice="${option.data_lang_choice}"`);
    return `          <a ${attrs.join(' ')}>${option.label}</a>`;
  }
  const attrs = [`class="${className}"`, `lang="${option.lang}"`];
  if (option.active) attrs.push('aria-current="page"');
  return `          <span ${attrs.join(' ')}>${option.label}</span>`;
}

export function renderLangSwitcher(options) {
  return options.map((option) => renderLangOption(option)).join('\n');
}

export function renderNavLinks(items) {
  return items.map((item) => `          <a href="${item.href}">${item.label}</a>`).join('\n');
}

export function renderHeroActions(actions) {
  return actions
    .map((action) => `            <a class="button ${action.variant}" href="${action.href}">${action.label}</a>`)
    .join('\n');
}

export function renderWhyCards(cards) {
  return cards
    .map(
      (card) => `          <article class="why-card">
            <span class="card-number" aria-hidden="true">${card.number}</span>
            <h3>${card.title}</h3>
            <p>
              ${card.text}
            </p>
          </article>`
    )
    .join('\n');
}

export function renderCompareList(items) {
  return items.map((item) => `              <li>${item}</li>`).join('\n');
}

export function renderWorkflowPipeline(nodes) {
  const parts = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    parts.push(`          <div class="workflow-node">
            <span class="phase">${node.phase}</span>
            <strong>${node.strong}</strong>
            <span>${node.span}</span>
          </div>`);
    if (i < nodes.length - 1) {
      parts.push('          <div class="workflow-connector" aria-hidden="true">→</div>');
    }
  }
  return parts.join('\n');
}

export function renderWorkflowLayers(layers) {
  return layers
    .map(
      (layer) => `          <div class="workflow-layer ${layer.class}">
            <h3>${layer.title}</h3>
            <p>
              ${layer.text}
            </p>
          </div>`
    )
    .join('\n');
}

export function renderTrackPills(tracks) {
  return tracks
    .map(
      (track) => `            <span class="track-pill"
              >${track}</span
            >`
    )
    .join('\n');
}

export function renderFeatureGrid(items) {
  return items
    .map(
      (item) => `          <article>
            <h3>${item.title}</h3>
            <p>${item.text}</p>
          </article>`
    )
    .join('\n');
}

export function renderAgentCommands(commands) {
  return commands
    .map(
      (command) => `              <article class="command-card">
                <a
                  class="command-card-link"
                  href="${commandBase}/${command.slug}.md"
                >
                  <code>${command.code}</code>
                  <p>${command.description}</p>
                </a>
              </article>`
    )
    .join('\n');
}

export function renderTerminalCommands(commands) {
  return commands
    .map(
      (command) => `              <article class="command-card">
                <code>${command.code}</code>
                <p>${command.description}</p>
              </article>`
    )
    .join('\n');
}

export function renderCommandNoteLinks(links) {
  return links
    .map(
      (link, index) =>
        `${index > 0 ? '          ·\n          ' : ''}<a href="${link.href}"
            >${link.label}</a
          >`
    )
    .join('\n');
}

export function renderChips(items) {
  return items.map((item) => `            <span class="chip">${item}</span>`).join('\n');
}

export function renderFooterLinks(links) {
  return links
    .map((link) => {
      if (link.label === 'Comandos de agente') {
        return `        <a href="${link.href}"
          >${link.label}</a
        >`;
      }
      return `        <a href="${link.href}">${link.label}</a>`;
    })
    .join('\n');
}

export function renderSignals(signals) {
  return signals
    .map(
      (signal) => `        <div>
          <strong>${signal.strong}</strong>
          <span>${signal.span}</span>
        </div>`
    )
    .join('\n');
}

export function applyTemplate(template, values) {
  let output = template;
  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }
  const unresolved = output.match(/\{\{[a-z0-9_]+\}\}/gi);
  if (unresolved) {
    throw new Error(`Unresolved template placeholders: ${[...new Set(unresolved)].join(', ')}`);
  }
  return output;
}

export function buildDocsSiteHtml(content, template) {
  return applyTemplate(template, {
    lang: content.lang,
    data_lang_en: content.data_lang_en,
    data_lang_es: content.data_lang_es,
    assets_prefix: content.assets_prefix,
    meta_description: content.meta.description,
    title: content.meta.title,
    canonical: content.meta.canonical,
    hreflang_en: content.meta.hreflang_en,
    hreflang_es: content.meta.hreflang_es,
    aria_topbar: content.aria.topbar,
    aria_brand: content.aria.brand,
    aria_nav: content.aria.nav,
    aria_lang_switcher: content.aria.lang_switcher,
    aria_hero_actions: content.aria.hero_actions,
    aria_hero_terminal: content.aria.hero_terminal,
    aria_signals: content.aria.signals,
    aria_compare: content.aria.compare,
    aria_workflow_pipeline: content.aria.workflow_pipeline,
    aria_track_levels: content.aria.track_levels,
    aria_bands: content.aria.bands,
    aria_scroll_top: content.aria.scroll_top,
    nav_links: renderNavLinks(content.nav),
    lang_switcher: renderLangSwitcher(content.lang_switcher),
    hero_eyebrow: content.hero.eyebrow,
    hero_title: content.hero.title,
    hero_lede: content.hero.lede,
    hero_actions: renderHeroActions(content.hero.actions),
    hero_terminal_code: content.hero.terminal_code,
    signals: renderSignals(content.signals),
    why_eyebrow: content.why.eyebrow,
    why_title: content.why.title,
    why_intro: content.why.intro,
    why_cards: renderWhyCards(content.why.cards),
    why_without_title: content.why.without.title,
    why_without_items: renderCompareList(content.why.without.items),
    why_with_title: content.why.with.title,
    why_with_items: renderCompareList(content.why.with.items),
    workflow_eyebrow: content.workflow.eyebrow,
    workflow_title: content.workflow.title,
    workflow_intro: content.workflow.intro,
    workflow_pipeline: renderWorkflowPipeline(content.workflow.nodes),
    workflow_layers: renderWorkflowLayers(content.workflow.layers),
    workflow_notes: content.workflow.notes,
    workflow_track_intro: content.workflow.track_intro,
    workflow_track_pills: renderTrackPills(content.workflow.tracks),
    features_eyebrow: content.features.eyebrow,
    features_title: content.features.title,
    features_intro: content.features.intro,
    features_grid: renderFeatureGrid(content.features.items),
    commands_eyebrow: content.commands.eyebrow,
    commands_title: content.commands.title,
    commands_intro: content.commands.intro,
    commands_agent_group_title: content.commands.agent_group_title,
    commands_agent_group_note: content.commands.agent_group_note,
    commands_terminal_group_title: content.commands.terminal_group_title,
    agent_commands: renderAgentCommands(content.commands.agent_commands),
    terminal_commands: renderTerminalCommands(content.commands.terminal_commands),
    commands_note_prefix: content.commands.note_prefix,
    commands_note_links: renderCommandNoteLinks(content.commands.note_links),
    bands_presets_title: content.bands.presets_title,
    bands_presets: renderChips(content.bands.presets),
    bands_adapters_title: content.bands.adapters_title,
    bands_adapters: renderChips(content.bands.adapters),
    install_eyebrow: content.install.eyebrow,
    install_title: content.install.title,
    install_intro: content.install.intro,
    install_terminal_code: content.install.terminal_code,
    footer_tagline: content.footer.tagline,
    footer_links: renderFooterLinks(content.footer.links)
  });
}

export async function loadDocsSiteTemplate(siteRoot) {
  return fs.readFile(path.join(siteRoot, 'template.html'), 'utf8');
}

export async function loadDocsSiteContent(siteRoot, locale) {
  const fileName = locale === 'es' ? 'content.es.json' : 'content.en.json';
  return JSON.parse(await fs.readFile(path.join(siteRoot, fileName), 'utf8'));
}

export async function renderDocsSiteLocale(siteRoot, locale) {
  const template = await loadDocsSiteTemplate(siteRoot);
  const content = await loadDocsSiteContent(siteRoot, locale);
  return buildDocsSiteHtml(content, template);
}

export const docsSiteOutputs = [
  { locale: 'en', relativePath: 'docs/index.html' },
  { locale: 'es', relativePath: 'docs/es/index.html' }
];

export function normalizeDocsHtml(content) {
  return `${content.replace(/\r\n/g, '\n').trimEnd()}\n`;
}

export async function verifyDocsSiteOutputs(repoRoot, generatedByLocale) {
  const errors = [];
  for (const { locale, relativePath } of docsSiteOutputs) {
    const expectedPath = path.join(repoRoot, relativePath);
    const expected = normalizeDocsHtml(await fs.readFile(expectedPath, 'utf8'));
    const generated = normalizeDocsHtml(generatedByLocale.get(locale));
    if (expected !== generated) {
      errors.push(`generated docs site drift: ${relativePath} (run npm run docs:build)`);
    }
  }
  return errors;
}

const modulePath = fileURLToPath(import.meta.url);
export const isDocsSiteBuilderMain = process.argv[1] === modulePath;
