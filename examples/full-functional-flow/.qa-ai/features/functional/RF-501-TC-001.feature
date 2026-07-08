Feature: User Registration

  As a new user
  I want to create an account with email and password
  So that I can access the application

  @priority:high @type:functional @manual:false @rf:RF-501 @id:RF-501-TC-001
  Scenario: RF-501-TC-001 Successful registration with valid credentials
    Given the registration page is displayed
    When I enter a valid email "newuser@example.com"
    And I enter a strong password "SecurePass1"
    And I accept the terms of service
    And I submit the registration form
    Then I see a success message "Registration complete"
    And a confirmation email is sent to "newuser@example.com"

  Acceptance Criteria:
    - CA-1: User can register with valid email and password (min 8 chars, 1 uppercase, 1 digit).
    - CA-4: User must accept terms of service before registration.
    - CA-5: System sends confirmation email after successful registration.
