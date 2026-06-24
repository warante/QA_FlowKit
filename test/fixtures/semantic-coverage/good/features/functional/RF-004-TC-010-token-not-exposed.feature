@rf:RF-004 @id:TC-010 @priority:high @type:security @manual:false
Feature: Payment token not exposed

Acceptance Criteria:
- Payment gateway tokens must never appear in application logs or plain-text notifications.

Scenario: RF-004 TC-010 refund flow does not expose payment token
  Given an eligible booking processed through the refund flow
  When logs and notification content are captured
  Then no full payment token appears in application logs
  And no full payment token appears in plain-text notifications
