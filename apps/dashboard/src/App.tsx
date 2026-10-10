import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "@arca/ui";
import { EnclosuresView } from "@/views/EnclosuresView";
import { TicketHistoryView } from "@/views/TicketHistoryView";
import { TicketUsersView } from "@/views/TicketUsersView";
import { DemoBanner } from "./components/DemoBanner";
import { Icon, type IconName } from "./components/Icon";
import { DashboardView } from "./views/DashboardView";
import { EventsView } from "./views/EventsView";
import { LoginView } from "./views/LoginView";
import { NewsView } from "./views/NewsView";
import { TicketReportView } from "./views/TicketReportView";
import { TicketSaleView } from "./views/TicketSaleView";
import { useDashboardDemo } from "./viewmodels/useDashboardDemo";
import type {
  DashboardSection,
  DemoProfile,
} from "./viewmodels/dashboard-demo";

const navigation: Record<
  DemoProfile,
  { id: DashboardSection; label: string; icon: IconName }[]
> = {
  administration: [
    { id: "dashboard", label: "Panel principal", icon: "dashboard" },
    { id: "news", label: "Noticias", icon: "news" },
    { id: "events", label: "Eventos", icon: "calendar" },
    { id: "reports", label: "Reporte de boletos", icon: "trend" },
    { id: "enclosures", label: "Modificación de recintos", icon: "building" },
    { id: "ticket-users", label: "Usuarios de taquilla", icon: "users" },
  ],
  ticket: [
    { id: "tickets", label: "Venta de boletos", icon: "ticket" },
    { id: "ticket-history", label: "Historial de boletos", icon: "trend" },
  ],
};

const sectionTitles: Record<DashboardSection, string> = {
  dashboard: "Panel principal",
  news: "Noticias",
  events: "Eventos",
  tickets: "Venta de boletos",
  reports: "Reporte de boletos",
  enclosures: "Modificación de recintos",
  "ticket-users": "Usuarios de taquilla",
  "ticket-history": "Historial de boletos",
};

function App() {
  const demo = useDashboardDemo();
  const [search, setSearch] = useState("");
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const { state } = demo;

  useEffect(() => {
    if (state.mobileMenuOpen) {
      sidebarRef.current
        ?.querySelector<HTMLButtonElement>(".sidebar-link")
        ?.focus();
    }
  }, [state.mobileMenuOpen]);

  useEffect(() => {
    if (!state.activeProfile) return;
    window.requestAnimationFrame(() => {
      const heading = contentRef.current?.querySelector("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    });
  }, [state.activeProfile]);

  if (!state.activeProfile) {
    return (
      <LoginView
        selectedProfile={state.selectedProfile}
        error={state.notice}
        onSelectProfile={demo.selectProfile}
        onLoginAdministration={demo.loginAdministration}
        onLoginTicket={demo.loginTicket}
      />
    );
  }

  const activeNavigation = navigation[state.activeProfile];
  const navigate = (section: DashboardSection) => {
    demo.navigate(section);
    window.requestAnimationFrame(() => {
      const heading = contentRef.current?.querySelector("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    });
  };

  const showNotice = (message: string) => demo.showNotice(message);
  const closeMobileMenu = () => {
    if (!state.mobileMenuOpen) return;
    demo.toggleMenu();
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  return (
    <div className="dashboard-app">
      {state.mobileMenuOpen && (
        <button
          className="mobile-nav-backdrop"
          type="button"
          aria-label="Cerrar menú"
          onClick={closeMobileMenu}
        />
      )}
      <aside
        ref={sidebarRef}
        id="dashboardNavigation"
        className={`sidebar ${state.mobileMenuOpen ? "sidebar--open" : ""}`}
        aria-label="Navegación del panel"
        onKeyDown={(event) => {
          if (event.key === "Escape") closeMobileMenu();
        }}
      >
        <div className="sidebar-brand">
          <span className="brand-mark brand-mark--small" aria-hidden="true">
            <Icon name="animals" />
          </span>
          <span className="sidebar-brand__text">
            <strong>Zoo Tulancingo</strong>
            <small>
              {state.activeProfile === "ticket" ? "Perfil de taquilla" : "Panel administrativo"}
            </small>
          </span>
          <Button
            className="sidebar-mobile-close"
            variant="ghost"
            aria-label="Cerrar menú"
            onClick={closeMobileMenu}
          >
            <Icon name="close" />
          </Button>
        </div>

        <p className="sidebar-label">Menú</p>
        <nav className="sidebar-nav">
          {activeNavigation.map((item) => (
            <button
              className={`sidebar-link ${state.activeSection === item.id ? "sidebar-link--active" : ""}`}
              type="button"
              key={item.id}
              aria-current={state.activeSection === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-account">
          <span className="account-avatar" aria-hidden="true">ZT</span>
          <span><strong>Zoo Tulancingo</strong><small>Sesión de muestra</small></span>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <div className="topbar__mobile">
            <Button
              ref={menuButtonRef}
              variant="secondary"
              aria-label="Abrir menú de navegación"
              aria-controls="dashboardNavigation"
              aria-expanded={state.mobileMenuOpen}
              onClick={demo.toggleMenu}
            >
              <Icon name="menu" />
            </Button>
            <strong>{sectionTitles[state.activeSection]}</strong>
          </div>
          <label className="search-box">
            <Icon name="search" />
            <span className="visually-hidden">Buscar en el panel</span>
            <input
              aria-label="Buscar en el panel (demostración)"
              placeholder="Buscar..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="topbar__actions">
            <Button
              variant="secondary"
              className="notification-button"
              aria-label="Notificaciones de demostración"
              onClick={() => showNotice("No hay notificaciones reales en esta demostración.")}
            >
              <Icon name="bell" />
              <span aria-hidden="true" />
            </Button>
            <div className="user-profile">
                <span className="user-profile__avatar" aria-hidden="true">
                  {state.activeProfile === "ticket" ? "TQ" : "AD"}
                </span>
                <span>
                  <strong>{state.activeProfile === "ticket" ? state.activeTicketUser : "Administración"}</strong>
                  <small>{state.activeProfile === "ticket" ? "Personal de taquilla demo" : "Perfil administrativo demo"}</small>
                </span>
            </div>
            <Button className="sign-out-button" variant="ghost" onClick={demo.signOut}>
              Salir
            </Button>
          </div>
        </header>

        <main className="dashboard-content" ref={contentRef}>
          <DemoBanner />
          {state.notice && (
            <Alert className="global-feedback" role="status" aria-live="polite">
              {state.notice}
              <Button
                className="feedback-close"
                variant="ghost"
                aria-label="Cerrar aviso"
                onClick={() => showNotice("")}
              >
                <Icon name="close" />
              </Button>
            </Alert>
          )}
          {state.activeSection === "dashboard" && <DashboardView onNavigate={navigate} />}
          {state.activeSection === "news" && <NewsView onNotice={showNotice} />}
          {state.activeSection === "events" && <EventsView onNotice={showNotice} />}
          {state.activeSection === "tickets" && (
            <TicketSaleView
              saleStep={state.saleStep}
              onOpen={demo.openSale}
              onCancel={demo.cancelSale}
              onConfirm={demo.beginSale}
              onReset={demo.resetSale}
            />
          )}
          {state.activeSection === "reports" && <TicketReportView />}
          {state.activeSection === "enclosures" && (
            <EnclosuresView
              enclosures={state.enclosures}
              onUpdate={demo.updateEnclosure}
            />
          )}
          {state.activeSection === "ticket-users" && (
            <TicketUsersView
              users={state.ticketUsers}
              onAdd={demo.addTicketUser}
            />
          )}
          {state.activeSection === "ticket-history" && <TicketHistoryView />}
        </main>
      </div>
    </div>
  );
}

export default App;
