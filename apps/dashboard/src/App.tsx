import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card } from "@arca/ui";
import { DemoBanner } from "@/components/DemoBanner";
import { Icon } from "@/components/Icon";
import { EnclosuresView } from "@/views/EnclosuresView";
import { EventsView } from "@/views/EventsView";
import { LoginView } from "@/views/LoginView";
import { NewsView } from "@/views/NewsView";
import { PwaRedirectView } from "@/views/PwaRedirectView";
import { TicketHistoryView } from "@/views/TicketHistoryView";
import { TicketReportView } from "@/views/TicketReportView";
import { TicketSaleView } from "@/views/TicketSaleView";
import { TicketUsersView } from "@/views/TicketUsersView";
import { TwoFactorChallengeView } from "@/views/TwoFactorChallengeView";
import { TwoFactorSetupView } from "@/views/TwoFactorSetupView";
import {
  getNavigationForProfile,
  getPresentationProfile,
} from "@/viewmodels/navigation";
import { useAuthSession } from "@/viewmodels/useAuthSession";
import { useDashboardDemo } from "@/viewmodels/useDashboardDemo";
import type { DashboardSection } from "@/viewmodels/dashboard-demo";
import { DashboardView } from "./views/DashboardView";

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
  const redirectToPwa = useCallback((url: string) => {
    window.requestAnimationFrame(() => window.location.assign(url));
  }, []);
  const session = useAuthSession(redirectToPwa);
  const demo = useDashboardDemo();
  const [search, setSearch] = useState("");
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const profile = session.state.profile;
  const presentationProfile = profile
    ? getPresentationProfile(profile.home)
    : null;
  const navigation = profile ? getNavigationForProfile(profile) : [];

  useEffect(() => {
    if (session.state.status === "authenticated" && presentationProfile) {
      if (demo.state.activeProfile !== presentationProfile) {
        demo.startSession(presentationProfile);
      }
    } else if (demo.state.activeProfile !== null) {
      demo.signOut();
    }
  }, [session.state.status, presentationProfile, demo.state.activeProfile]);

  useEffect(() => {
    if (demo.state.mobileMenuOpen) {
      sidebarRef.current
        ?.querySelector<HTMLButtonElement>(".sidebar-link")
        ?.focus();
    }
  }, [demo.state.mobileMenuOpen]);

  useEffect(() => {
    if (session.state.status !== "authenticated") return;

    window.requestAnimationFrame(() => {
      const heading = contentRef.current?.querySelector("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    });
  }, [session.state.status, demo.state.activeSection]);

  if (session.state.status === "checking") {
    return (
      <main className="auth-page">
        <Card className="auth-card">
          <p className="auth-loading" role="status" aria-live="polite">
            Comprobando tu sesión…
          </p>
        </Card>
      </main>
    );
  }

  if (session.state.status === "anonymous") {
    return (
      <LoginView
        error={session.state.error}
        submitting={session.state.submitting}
        sessionExpired={session.state.sessionExpired}
        onSubmit={session.login}
      />
    );
  }

  if (session.state.status === "two-factor-challenge") {
    return (
      <TwoFactorChallengeView
        error={session.state.error}
        submitting={session.state.submitting}
        onSubmit={session.challenge}
        onCancel={session.cancelTwoFactor}
      />
    );
  }

  if (session.state.status === "two-factor-setup") {
    return (
      <TwoFactorSetupView
        qrSvg={session.state.qrSvg}
        recoveryCodes={session.state.recoveryCodes}
        error={session.state.error}
        submitting={session.state.submitting}
        onConfirm={session.confirmSetup}
        onAcknowledge={session.acknowledgeCodes}
        onRetry={session.retryTwoFactorSetup}
      />
    );
  }

  if (session.state.status === "redirecting-pwa") {
    return <PwaRedirectView pwaUrl={profile?.pwa_url ?? null} />;
  }

  if (!profile || !presentationProfile) {
    return (
      <LoginView
        error={session.state.error || "Tu cuenta no tiene un rol asignado. Contacta al administrador."}
        submitting={false}
        sessionExpired={false}
        onSubmit={session.login}
      />
    );
  }

  const activeSection = navigation.some(
    (item) => item.id === demo.state.activeSection,
  )
    ? demo.state.activeSection
    : navigation[0]?.id ?? null;

  const navigate = (section: DashboardSection) => {
    if (!navigation.some((item) => item.id === section)) return;
    demo.navigate(section);
    window.requestAnimationFrame(() => {
      const heading = contentRef.current?.querySelector("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    });
  };

  const showNotice = (message: string) => demo.showNotice(message);
  const closeMobileMenu = () => {
    if (!demo.state.mobileMenuOpen) return;
    demo.toggleMenu();
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };
  const initials = profile.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join("");
  const permissions = new Set(profile.permissions);

  return (
    <div className="dashboard-app">
      {demo.state.mobileMenuOpen && (
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
        className={`sidebar ${demo.state.mobileMenuOpen ? "sidebar--open" : ""}`}
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
              {presentationProfile === "ticket"
                ? "Perfil de taquilla"
                : presentationProfile === "executive"
                  ? "Panel ejecutivo"
                  : "Panel administrativo"}
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
          {navigation.map((item) => (
            <button
              className={`sidebar-link ${activeSection === item.id ? "sidebar-link--active" : ""}`}
              type="button"
              key={item.id}
              aria-current={activeSection === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-account">
          <span className="account-avatar" aria-hidden="true">
            {initials || "AR"}
          </span>
          <span>
            <strong>{profile.full_name}</strong>
            <small>Sesión institucional</small>
          </span>
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
              aria-expanded={demo.state.mobileMenuOpen}
              onClick={demo.toggleMenu}
            >
              <Icon name="menu" />
            </Button>
            <strong>{activeSection ? sectionTitles[activeSection] : "Panel principal"}</strong>
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
                {initials || "AR"}
              </span>
              <span>
                <strong>{profile.full_name}</strong>
                <small>{profile.email}</small>
              </span>
            </div>
            <Button
              className="sign-out-button"
              variant="ghost"
              disabled={session.state.submitting}
              onClick={() => void session.logout()}
            >
              Salir
            </Button>
          </div>
        </header>

        <main className="dashboard-content" ref={contentRef}>
          <DemoBanner />
          {demo.state.notice && (
            <Alert className="global-feedback" role="status" aria-live="polite">
              {demo.state.notice}
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
          {navigation.length === 0 && (
            <Alert role="alert">
              Tu cuenta no tiene permisos para mostrar secciones del panel.
            </Alert>
          )}
          {activeSection === "dashboard" && (
            <DashboardView
              onNavigate={navigate}
              canViewNews={permissions.has("news.manage")}
              canViewEvents={permissions.has("events.manage")}
            />
          )}
          {activeSection === "news" && <NewsView onNotice={showNotice} />}
          {activeSection === "events" && <EventsView onNotice={showNotice} />}
          {activeSection === "tickets" && (
            <TicketSaleView
              saleStep={demo.state.saleStep}
              onOpen={demo.openSale}
              onCancel={demo.cancelSale}
              onConfirm={demo.beginSale}
              onReset={demo.resetSale}
            />
          )}
          {activeSection === "reports" && <TicketReportView />}
          {activeSection === "enclosures" && (
            <EnclosuresView
              enclosures={demo.state.enclosures}
              onUpdate={demo.updateEnclosure}
            />
          )}
          {activeSection === "ticket-users" && (
            <TicketUsersView
              users={demo.state.ticketUsers}
              onAdd={demo.addTicketUser}
            />
          )}
          {activeSection === "ticket-history" && <TicketHistoryView />}
        </main>
      </div>
    </div>
  );
}

export default App;
