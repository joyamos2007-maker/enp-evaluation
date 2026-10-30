import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'gold' | 'outline' | 'institutional' | 'default';
  size?: 'sm' | 'md';
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const base = 'inline-flex items-center font-medium border select-none tracking-tight';

  const variants = {
    neutral: 'bg-[#ECEFF1] text-enp-black border-transparent',
    default: 'bg-[#ECEFF1] text-enp-black border-transparent',
    primary: 'bg-enp-blue-light text-enp-blue-deep border-enp-blue-primary/20',
    institutional: 'bg-enp-blue-ice text-enp-blue-deep border-enp-blue-primary/30',
    success: 'bg-enp-green-light text-enp-green-valid border-enp-green-valid/20',
    warning: 'bg-[#FEF3C7] text-[#92400E] border-[#F59E0B]/30',
    danger: 'bg-enp-red-light text-enp-red-error border-enp-red-error/20',
    gold: 'bg-enp-gold-light text-[#8A6A1E] border-enp-gold/30',
    outline: 'bg-white text-enp-gray-dark border-enp-border',
  };

  const sizes = {
    sm: 'text-[11px] px-1.5 py-0.5 min-h-[20px] gap-1',
    md: 'text-xs px-2 py-1 min-h-[24px] gap-1.5',
  };

  return (
    <span className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  let variant: BadgeProps['variant'] = 'neutral';
  let defaultLabel = status;

  switch (status) {
    case 'ouverte':
    case 'tenue':
    case 'vise':
    case 'present':
    case 'active':
    case 'restituee':
    case 'publie':
      variant = 'success';
      defaultLabel = 'Validé / Ouvert';
      break;
    case 'en_attente':
    case 'planifiee':
    case 'a_faire':
    case 'retard':
      variant = 'warning';
      defaultLabel = 'En attente';
      break;
    case 'conteste':
    case 'absent':
    case 'annulee':
    case 'enseignant_absent':
    case 'rejetee':
    case 'bloque':
      variant = 'danger';
      defaultLabel = 'Contesté / Absent';
      break;
    case 'close':
    case 'cloturee':
    case 'terminee':
    case 'archivee':
      variant = 'primary';
      defaultLabel = 'Clos / Terminé';
      break;
    case 'brouillon':
      variant = 'neutral';
      defaultLabel = 'Brouillon';
      break;
    default:
      variant = 'neutral';
      defaultLabel = status;
  }

  return <Badge variant={variant}>{label ?? defaultLabel}</Badge>;
}

export const ROLE_LABELS: Record<string, string> = {
  etudiant: 'Étudiant',
  delegue: 'Délégué de promotion',
  enseignant: 'Enseignant-Chercheur',
  chef_departement: 'Chef de Département',
  scolarite: 'Scolarité Centrale',
  direction_etudes: 'Direction des Études',
  admin: 'Administrateur Système',
};

export function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABELS[role] ?? role;
  let variant: BadgeProps['variant'] = 'neutral';
  if (role === 'admin') variant = 'danger';
  else if (role === 'direction_etudes') variant = 'gold';
  else if (role === 'scolarite') variant = 'primary';
  else if (role === 'chef_departement') variant = 'primary';
  else if (role === 'enseignant') variant = 'success';
  else if (role === 'delegue') variant = 'warning';
  else if (role === 'etudiant') variant = 'outline';

  return <Badge variant={variant}>{label}</Badge>;
}
