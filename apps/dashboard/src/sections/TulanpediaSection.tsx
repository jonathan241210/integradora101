import { SectionHeading } from "@/components/SectionHeading";
import { TulanpediaTabs } from "@/components/TulanpediaTabs";
import type { TulanpediaTab } from "@/viewmodels/tulanpedia-tab";
import { useTulanpediaTab } from "@/viewmodels/useTulanpediaTab";
import { PublishedSpeciesSection } from "./PublishedSpeciesSection";
import { SpeciesRequestsSection } from "./SpeciesRequestsSection";

/**
 * TulanPedia (dashboard-010 CA-63): pestañas «Solicitudes» y «Publicadas».
 * «Solicitudes» abre con el filtro «Pendiente»; el aviso de «Publicadas»
 * cambia a ella (CA-64). El detalle no tiene URL propia (CA-65). Un solo encabezado fijo
 * con las pestañas debajo, como «Reportes» (CA-66).
 */
export function TulanpediaSection({ focus = null }: { focus?: { tab: TulanpediaTab | null; nonce: number } | null }) {
  const { tab, select } = useTulanpediaTab(focus?.tab ?? null, focus?.nonce ?? 0);

  return (
    <>
      <SectionHeading
        eyebrow="Administración"
        title="TulanPedia"
        description="Revisa las solicitudes de especies y gestiona las especies publicadas."
      />
      <TulanpediaTabs active={tab} onSelect={select}>
        {tab === "requests" ? (
          <SpeciesRequestsSection />
        ) : (
          <PublishedSpeciesSection onOpenRequests={() => select("requests")} />
        )}
      </TulanpediaTabs>
    </>
  );
}
