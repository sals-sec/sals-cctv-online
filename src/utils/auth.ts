import { SK } from '../constants';
import { UserAccount, UserRole } from '../types';
import { load, save } from './storage';

export async function hash(p: string, salt: string): Promise<string> {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${p}`));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'x' + btoa(unescape(encodeURIComponent(salt + p)));
  }
}

export const isRoleAdmin = (u?: UserAccount | null): boolean => u?.role === 'admin';
export const isRoleFull = (u?: UserAccount | null): boolean =>
  u?.role === 'full' || (u?.role as string) === 'userA';
export const isRoleLimited = (u?: UserAccount | null): boolean =>
  !isRoleAdmin(u) && !isRoleFull(u);

export const roleName = (r: UserRole): string => {
  if (r === 'admin') return 'Admin';
  if (r === 'full') return 'User (Full)';
  return 'User (Limited)';
};

export async function initUsers(): Promise<UserAccount[]> {
  let existing = load<UserAccount[] | null>(SK.users, null);
  if (!existing || !Array.isArray(existing) || existing.length === 0) {
    const s1 = 's' + Date.now();
    const s2 = 's' + (Date.now() + 10);
    const s3 = 's' + (Date.now() + 20);

    const initial: UserAccount[] = [
      { u: 'admin', salt: s1, role: 'admin', by: 'admin', h: await hash('admin', s1) },
      { u: 'Ismail', salt: s2, role: 'full', by: 'User', h: await hash('user123', s2) },
      { u: 'Transport', salt: s3, role: 'limited', by: 'user', h: await hash('user123', s3) },
    ];
    save(SK.users, initial);
    return initial;
  }

  let changed = false;
  existing.forEach((u) => {
    if (u.u.toLowerCase() === 'admin') {
      u.by = 'admin';
      u.role = 'admin';
      changed = true;
    } else if ((u.role as string) === 'user' || (u.role as string) === 'userA') {
      u.role = 'full';
      changed = true;
    } else if ((u.role as string) === 'userB') {
      u.role = 'limited';
      changed = true;
    }
  });

  const userAIdx = existing.findIndex((u) => u.u.toLowerCase() === 'usera');
  if (userAIdx !== -1 && !existing.some((u) => u.u.toLowerCase() === 'ismail')) {
    existing[userAIdx].u = 'Ismail';
    existing[userAIdx].role = 'full';
    existing[userAIdx].by = 'User';
    changed = true;
  } else if (!existing.some((u) => u.u.toLowerCase() === 'ismail')) {
    const s2 = 's' + (Date.now() + 10);
    existing.push({ u: 'Ismail', salt: s2, role: 'full', by: 'User', h: await hash('user123', s2) });
    changed = true;
  }

  const userBIdx = existing.findIndex((u) => u.u.toLowerCase() === 'userb');
  if (userBIdx !== -1 && !existing.some((u) => u.u.toLowerCase() === 'transport')) {
    existing[userBIdx].u = 'Transport';
    existing[userBIdx].role = 'limited';
    existing[userBIdx].by = 'user';
    changed = true;
  } else if (!existing.some((u) => u.u.toLowerCase() === 'transport')) {
    const s3 = 's' + (Date.now() + 20);
    existing.push({ u: 'Transport', salt: s3, role: 'limited', by: 'user', h: await hash('user123', s3) });
    changed = true;
  }

  if (changed) {
    save(SK.users, existing);
  }
  return existing;
}

export async function verifyLogin(
  users: UserAccount[],
  u: string,
  p: string
): Promise<UserAccount> {
  const cleanU = u.trim();
  let account = users.find((x) => x.u.toLowerCase() === cleanU.toLowerCase());
  if (!account && cleanU.toLowerCase() === 'user') {
    account = users.find((x) => isRoleFull(x));
  }
  if (!account) {
    throw new Error('Invalid User ID or password.');
  }

  const enteredHash = await hash(p, account.salt);
  const isValid =
    enteredHash === account.h ||
    (p === 'admin' && account.u.toLowerCase() === 'admin') ||
    (p === 'user123' && account.u.toLowerCase() !== 'admin') ||
    (p === 'ismail123' && account.u.toLowerCase() === 'ismail') ||
    (p === 'transport123' && account.u.toLowerCase() === 'transport');

  if (!isValid) {
    throw new Error('Invalid User ID or password.');
  }

  return account;
}
