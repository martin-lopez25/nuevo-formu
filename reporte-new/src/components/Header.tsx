
const LOGO_URL = 'https://imssbienestar.gob.mx/assets/img/imb_b.svg';

export function Header({
  onLogoClick,
  eyebrow,
  title,
  subtitle,
}: {
  onLogoClick?: () => void;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}) {

  const resolvedEyebrow = eyebrow ?? 'Panel Principal';
  const resolvedTitle = title ?? 'Reporte de Infraestructura y Materiales Hospitalarios';
  const resolvedSubtitle = subtitle ?? 'Consulta, visualiza y exporta la base cruda y sus agregados por CLUES y por Estado.';

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="IMSS Bienestar"
              onClick={onLogoClick}
              className="h-9 w-auto cursor-pointer brightness-0 saturate-100 [filter:invert(10%)_sepia(79%)_saturate(665%)_hue-rotate(120deg)_brightness(41%)_contrast(104%)]" style={{ userSelect: 'none' }}
            />
            <div className="leading-none">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Gobierno de Mexico</p>
              <p className="text-sm font-bold tracking-tight text-imss-green">IMSS Bienestar</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
          </div>
        </div>
      </nav>

      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">{resolvedEyebrow}</p>
          <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-imss-green sm:text-4xl lg:text-5xl">
            {resolvedTitle}
          </h1>
          <p className="mt-2 max-w-xl text-base text-gray-500">
            {resolvedSubtitle}
          </p>
        </div>
      </div>
    </>
  );
}
