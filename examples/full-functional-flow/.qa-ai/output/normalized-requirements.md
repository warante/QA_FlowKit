# Normalized Requirements

## Normalized Summary

- Source RFs: 1
- Ready RFs: 1
- Criterion IDs assigned: 6

## Normalized Requirements

### RF-501: User Registration

| Criterion ID | Acceptance Criterion                                                           | Priority | Status | Notes                              |
| ------------ | ------------------------------------------------------------------------------ | -------- | ------ | ---------------------------------- |
| RF-501-CA-1  | Valid registration with email and password (min 8 chars, 1 uppercase, 1 digit) | high     | ready  |                                    |
| RF-501-CA-2  | Duplicate email rejection with clear error                                     | high     | ready  |                                    |
| RF-501-CA-3  | Password minimum 8 chars, 1 uppercase, 1 digit                                 | high     | ready  |                                    |
| RF-501-CA-4  | Terms of service acceptance required                                           | high     | ready  |                                    |
| RF-501-CA-5  | Confirmation email sent after registration                                     | medium   | ready  | External dependency: email service |
| RF-501-CA-6  | Inline validation errors before submission                                     | medium   | ready  |                                    |
