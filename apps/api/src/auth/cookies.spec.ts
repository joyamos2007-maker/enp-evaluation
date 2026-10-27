import { lireCookie } from './cookies';

describe('lireCookie', () => {
  it('lit un cookie parmi plusieurs', () => {
    expect(lireCookie('a=1; refresh_token=abc; b=2', 'refresh_token')).toBe('abc');
  });

  it('retourne null quand le cookie est absent', () => {
    expect(lireCookie('a=1; b=2', 'refresh_token')).toBeNull();
  });

  it('retourne null quand l entete est absent', () => {
    expect(lireCookie(undefined, 'refresh_token')).toBeNull();
  });

  it('decode la valeur', () => {
    expect(lireCookie('refresh_token=a%2Bb', 'refresh_token')).toBe('a+b');
  });

  it('retourne null pour une valeur mal encodee', () => {
    expect(lireCookie('refresh_token=%E0%A4%A', 'refresh_token')).toBeNull();
  });
});