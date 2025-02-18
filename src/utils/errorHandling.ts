export enum InviteErrorCode {
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_ROLE = 'INVALID_ROLE',
  DUPLICATE_INVITE = 'DUPLICATE_INVITE',
  INVITE_NOT_FOUND = 'INVITE_NOT_FOUND',
  EXPIRED_INVITE = 'EXPIRED_INVITE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EMAIL_ERROR = 'EMAIL_ERROR',
  AUTH_ERROR = 'AUTH_ERROR'
}

export class InviteError extends Error {
  code: InviteErrorCode;

  constructor(message: string, code: InviteErrorCode) {
    super(message);
    this.name = 'InviteError';
    this.code = code;
  }
}

export function validateEmail(email: string): void {
  console.log('Validating email:', email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('Invalid email format:', email);
    throw new InviteError('Invalid email format', InviteErrorCode.INVALID_EMAIL);
  }
}

export function validateRole(role: string): void {
  console.log('Validating role:', role);
  const validRoles = ['admin', 'manager', 'employee'];
  if (!validRoles.includes(role)) {
    console.error('Invalid role:', role);
    throw new InviteError('Invalid role', InviteErrorCode.INVALID_ROLE);
  }
}

export function handleDatabaseError(error: any): never {
  console.error('Database error:', error);
  
  // Log detailed error information
  if (error.code) console.error('Error code:', error.code);
  if (error.message) console.error('Error message:', error.message);
  if (error.details) console.error('Error details:', error.details);
  if (error.hint) console.error('Error hint:', error.hint);

  // Handle specific database errors
  if (error.code === '23505') { // Unique violation
    throw new InviteError(
      'A record with this information already exists',
      InviteErrorCode.DUPLICATE_INVITE
    );
  }

  throw new InviteError(
    'A database error occurred',
    InviteErrorCode.DATABASE_ERROR
  );
}

export function logError(error: unknown, context: Record<string, any> = {}): void {
  console.error('Error occurred:', {
    error,
    context,
    timestamp: new Date().toISOString(),
    ...(error instanceof Error && {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }),
  });
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof InviteError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}