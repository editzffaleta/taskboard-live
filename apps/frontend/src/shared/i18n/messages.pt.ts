export const errorMessagesPt = {
  DEFAULT_API_ERROR: 'Ocorreu um erro inesperado na comunicação com o servidor.',
  INVALID_ARRAY: 'O valor deve ser uma lista.',
  INVALID_ITEM: 'Item inválido.',
  INVALID_OBJECT: 'O valor deve ser um objeto.',
  INVALID_VALUE: 'Valor inválido.',
  MAX_ITEMS: 'Máximo de {{max}} itens.',
  MIN_ITEMS: 'Mínimo de {{min}} itens.',
  REQUIRED_FIELD: 'Campo de preenchimento obrigatório.',
  SHELL_CONTEXT_PROVIDER_REQUIRED: 'useShellContext deve ser usado dentro de <ShellProvider>.',
  THEME_CONTEXT_PROVIDER_REQUIRED: 'useTheme deve ser usado dentro de <ThemeProvider>.',
  UNKNOWN_ERROR_CODE: 'Erro desconhecido: {{code}}',
  INTERNAL_SERVER_ERROR: 'Ocorreu um erro inesperado no servidor. Tente novamente mais tarde.',
  'user.name.required': 'Informe o seu nome.',
  'user.name.min.length': 'O nome deve ter pelo menos 3 caracteres.',
  'user.name.max.length': 'O nome deve ter no máximo 80 caracteres.',
  'user.name.person.name': 'Informe um nome completo válido.',
  'user.email.required': 'Informe o seu e-mail.',
  'user.email.invalid.email': 'Informe um e-mail válido.',
  'user.password.bcrypt.hash': 'Não foi possível processar a senha informada.',
  'user.email.already.registered': 'Este e-mail já está cadastrado.',
  'registerUser.password.required': 'Informe uma senha.',
  'registerUser.password.strong.password':
    'A senha deve ter ao menos 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.',
  'registerUser.password.no.common.password': 'Escolha uma senha menos óbvia.',
  'user.credentials.invalid': 'E-mail ou senha inválidos.',
} as const;

export type ErrorMessageKey = keyof typeof errorMessagesPt;
export type ErrorMessages = Record<ErrorMessageKey, string>;
