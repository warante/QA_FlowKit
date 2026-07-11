export function printHelp() {
  console.log(`Usage: node .qa-ai/scripts/init.mjs [options]

Options:
  --preset <name>          Base template from .qa-ai/presets (default: playwright-full)
  --project-name <name>    Project name for .qa-ai/qa-ai.config.yaml (default: package.json name or folder name)
  --test-management-project <name> Test management project name (default: project name when enabled)
  --interface-language <en|es> User-facing workflow language (default: en)
  --gherkin-language <en|es>   Gherkin feature language (default: en)
  --requirements-source <name> Primary requirement source, for example markdown, jira, confluence
  --test-management-tool <name> Test management tool, for example none, testrail, zephyr, xray
  --issue-tracker <name>   Issue tracker, for example none, jira, github
  --qa-track <name>        QA workflow depth: quick, standard, enterprise (default from preset)
  --qa-context <path>      Repo-local folder with QA working-practice docs for agent-assisted init
  --ui-framework <name>    UI/E2E framework, or none/undecided
  --api-framework <name>   API/integration framework, or none/undecided
  --mobile-framework <name> Mobile framework, or none/undecided
  --ui-specs-path <path>   UI/E2E specs directory
  --ui-page-objects-path <path> UI page objects directory
  --api-specs-path <path>  API/integration specs directory
  --mobile-flows-path <path> Mobile automation flows directory
  --specialist-mode <auto|off|required> Specialist agent activation mode (default from base template)
  --set <key=value>        Repeatable scalar config override, for example automation.ui.framework=cypress
  --adapters <list>        Comma-separated adapters to generate, or "all" (default: detected hosts plus generic)
  --adapter <name>         Repeatable single adapter name
  --no-adapters            Skip adapter generation
  --no-interactive         Do not show interactive setup prompts
  --scenario-layout <mode> one-per-file or multiple-per-file (default depends on TestRail)
  --no-feature-folders     Skip canonical feature subfolder and .gitkeep creation
  --with-doc-templates     Generate starter QA docs under .qa-ai/output/
  --with-test-management-mapping Generate the configured test management mapping file
  --with-karate-config         Create configured Karate support files when Karate is used
  --force                  Overwrite generated files when they already exist
  --help                   Show this help
`);
}
