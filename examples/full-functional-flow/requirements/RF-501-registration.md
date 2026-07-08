# RF-501: User Registration

## Priority

High

## Description

Allow new users to create an account by providing email, password and accepting terms. The system must validate inputs, prevent duplicate registrations, and send a confirmation email.

## Acceptance Criteria

- CA-1: User can register with valid email and password (min 8 chars, 1 uppercase, 1 digit).
- CA-2: System rejects duplicate email registration with clear error message.
- CA-3: Password must be at least 8 characters with 1 uppercase letter and 1 digit.
- CA-4: User must accept terms of service before registration.
- CA-5: System sends confirmation email after successful registration.
- CA-6: Registration form shows validation errors inline before submission.

## Non-functional

- The page must load within 3 seconds on desktop.
- Registration must complete within 5 seconds.
- Email delivery SLA: within 60 seconds.
- Passwords stored with bcrypt.
