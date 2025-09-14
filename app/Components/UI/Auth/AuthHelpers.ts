export function validatePassword(password: string): string | null {
  // At least 8 chars, one uppercase, one lowercase, one number, one special char
  const pattern =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!pattern.test(password)) {
    return "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.";
  }
  return null;
}

// Components/UI/Auth/AuthHelpers.ts

export function getPasswordStrength(password: string) {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    symbol: /[@$!%*?&]/.test(password),
  };

  const passed = Object.values(requirements).filter(Boolean).length;

  let score = 'weak';
  if (passed >= 3 && password.length >= 8) score = 'medium';
  if (passed === 4 && password.length >= 10) score = 'strong';

  return { score, requirements };
}
