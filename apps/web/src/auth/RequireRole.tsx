import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { AccesRefuse } from '@/pages/AccesRefuse';
import type { Role } from '@/api/types';

export function RequireRole({
  role,
  roles,
  children,
}: {
  role?: Role;
  roles?: Role[];
  children: ReactNode;
}) {
  const { aRole } = useAuth();
  if (role && !aRole(role)) return <AccesRefuse />;
  if (roles && !roles.some((r) => aRole(r))) return <AccesRefuse />;
  if (!role && !roles) return <AccesRefuse />;
  return <>{children}</>;
}
