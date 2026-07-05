import type { ErrorMessages } from './messages.pt';

export const errorMessagesEn: ErrorMessages = {
  DEFAULT_API_ERROR: 'An unexpected error occurred while contacting the server.',
  INVALID_ARRAY: 'The value must be an array.',
  INVALID_ITEM: 'Invalid item.',
  INVALID_OBJECT: 'The value must be an object.',
  INVALID_VALUE: 'Invalid value.',
  MAX_ITEMS: 'Maximum of {{max}} items.',
  MIN_ITEMS: 'Minimum of {{min}} items.',
  REQUIRED_FIELD: 'This field is required.',
  SHELL_CONTEXT_PROVIDER_REQUIRED: 'useShellContext must be used within <ShellProvider>.',
  THEME_CONTEXT_PROVIDER_REQUIRED: 'useTheme must be used within <ThemeProvider>.',
  UNKNOWN_ERROR_CODE: 'Unknown error: {{code}}',
  INTERNAL_SERVER_ERROR: 'An unexpected server error occurred. Please try again later.',
  'user.name.required': 'Please enter your name.',
  'user.name.min.length': 'Name must be at least 3 characters long.',
  'user.name.max.length': 'Name must be at most 80 characters long.',
  'user.name.person.name': 'Please enter a valid full name.',
  'user.email.required': 'Please enter your email.',
  'user.email.invalid.email': 'Please enter a valid email address.',
  'user.password.bcrypt.hash': 'The provided password could not be processed.',
  'user.email.already.registered': 'This email is already registered.',
  'registerUser.password.required': 'Please enter a password.',
  'registerUser.password.strong.password':
    'Password must have at least 8 characters, including uppercase, lowercase, a number and a special character.',
  'registerUser.password.no.common.password': 'Please choose a less common password.',
  'user.credentials.invalid': 'Invalid email or password.',
};
