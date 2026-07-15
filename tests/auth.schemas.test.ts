import { describe, expect, it } from 'vitest';
import { loginSchema, passwordSchema, signupSchema } from '../src/auth/auth.schemas';

describe('passwordSchema', () => {
  it('accepts a compliant password', () => {
    expect(passwordSchema.safeParse('Str0ng!Pass').success).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(passwordSchema.safeParse('Sh0rt!').success).toBe(false);
  });

  it('rejects passwords longer than 16 characters', () => {
    expect(passwordSchema.safeParse('Str0ngPassword!Too!Long').success).toBe(false);
  });

  it('rejects passwords without an uppercase letter', () => {
    expect(passwordSchema.safeParse('str0ng!pass').success).toBe(false);
  });

  it('rejects passwords without a number', () => {
    expect(passwordSchema.safeParse('Strong!Pass').success).toBe(false);
  });

  it('rejects passwords without a special character', () => {
    expect(passwordSchema.safeParse('Str0ngPass1').success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('requires a valid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'x' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid email and non-empty password', () => {
    const result = loginSchema.safeParse({ email: 'chabe@example.com', password: 'anything' });
    expect(result.success).toBe(true);
  });
});

describe('signupSchema', () => {
  it('rejects when passwords do not match', () => {
    const result = signupSchema.safeParse({
      email: 'chabe@example.com',
      password: 'Str0ng!Pass',
      confirmPassword: 'Different1!',
    });
    expect(result.success).toBe(false);
  });

  it('accepts when both passwords match and are compliant', () => {
    const result = signupSchema.safeParse({
      email: 'chabe@example.com',
      password: 'Str0ng!Pass',
      confirmPassword: 'Str0ng!Pass',
    });
    expect(result.success).toBe(true);
  });
});
