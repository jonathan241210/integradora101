import { TulanpediaTabs } from "@/components/TulanpediaTabs";
import { useTulanpediaTab } from "@/viewmodels/useTulanpediaTab";
import { PublishedSpeciesSection } from "./PublishedSpeciesSection";
import { SpeciesRequestsSection } from "./SpeciesRequestsSection";

/**
 * TulanPedia (dashboard-010 CA-63): pestañas «Solicitudes» y «Publicadas».
 * «Solicitudes» abre con el filtro «Pendiente»; el aviso de «Publicadas»
 * cambia a ella (CA-64). El detalle no tiene URL propia (CA-65).
 */
export function TulanpediaSection() {
  const { tab, select } = useTulanpediaTab();

  return (
    <TulanpediaTabs active={tab} onSelect={select}>
      {tab === "requests" ? (
        <SpeciesRequestsSection />
      ) : (
        <PublishedSpeciesSection onOpenRequests={() => select("requests")} />
      )}
    </TulanpediaTabs>
  );
}
