const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function MockBanner() {
  if (!USE_MOCK) return null;
  return (
    <div
      className="w-full bg-enp-violet-light text-enp-violet text-center text-sm py-2 px-4 border-b border-enp-violet/15 font-medium"
      role="status"
    >
      Prototype : données simulées
    </div>
  );
}
