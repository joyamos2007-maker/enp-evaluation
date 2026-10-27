import { InfoCard } from '@/components/InfoCard';

interface AvenirProps {
  titre: string;
  description?: string;
}

export function Avenir({ titre, description }: AvenirProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-enp-ink tracking-tight">{titre}</h1>
      <InfoCard titre="À venir">
        <p>
          {description ??
            'Cette section est en cours de développement. Le contenu sera disponible prochainement.'}
        </p>
      </InfoCard>
    </div>
  );
}
