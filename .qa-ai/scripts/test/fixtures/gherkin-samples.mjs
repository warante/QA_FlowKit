/** Shared Gherkin feature snippets for framework tests. */

export const MINIMAL_ENGLISH_FEATURE = `@priority:high @type:functional @manual:true @rf:RF-101 @id:TC-001
Feature: Login
  Acceptance Criteria:
    - User can log in with valid credentials

  Scenario: Successful login
    Given a registered user
    When they log in with valid credentials
    Then they see the dashboard
`;

export const MINIMAL_ENGLISH_FEATURE_HEADER = '@priority:high @type:functional @manual:true @rf:RF-101 @id:TC-001';

export const MINIMAL_FEATURE_NO_ACCEPTANCE = '@priority:high @type:functional @manual:false\nFeature: Login\n';
