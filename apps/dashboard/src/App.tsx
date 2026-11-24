import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Card } from "@arca/ui";
import { ConsoleNoticesPublisher } from "@/components/ConsoleNoticesPublisher";
import { DashboardNotifications } from "@/components/DashboardNotifications";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Icon } from "@/components/Icon";
import { NoticeBar } from "@/components/NoticeBar";
import { PendingReviewNotices } from "@/components/PendingReviewNotices";
import { SidebarLink } from "@/components/SidebarLink";
import { SearchHitBanner } from "@/components/SearchHitBanner";
import { StepUpProvider } from "@/components/StepUpProvider";
import { DashboardSection } from "@/sections/DashboardSection";
import { EnclosuresSection } from "@/sections/EnclosuresSection";
import { EventsSection } from "@/sections/EventsSection";
import { MemoriesSection } from "@/sections/MemoriesSection";
import { NewsSection } from "@/sections/NewsSection";
import { ReportsSection } from "@/sections/ReportsSection";
import { TulanpediaSection } from "@/sections/TulanpediaSection";
import { TicketHistorySection } from "@/sections/TicketHistorySection";
import { TicketPricesSection } from "@/sections/TicketPricesSection";
import { TicketSaleSection } from "@/sections/TicketSaleSection";
import { UsersSection } from "@/sections/UsersSection";
import { LoginView } from "@/views/LoginView";
import { PwaRedirectView } from "@/views/PwaRedirectView";
import { TwoFactorChallengeView } from "@/views/TwoFactorChallengeView";
import { TwoFactorSetupView } from "@/views/TwoFactorSetupView";
import {
  getNavigationForProfile,
  getPresentationProfile,
} from "@/viewmodels/navigation";
import { resolveSelection, tabForKind, type FocusTarget } from "@/viewmodels/focus-target";
import type { SearchResult, SearchSectionInfo } from "@/viewmodels/global-search";
import { availableReportTabs, canCancelInReports, resolveTicketRoute } from "@/viewmodels/report-tabs";
import { visibleSearchActions } from "@/viewmodels/search-actions";
import type { TulanpediaTab } from "@/viewmodels/tulanpedia-tab";
import { isTulanpediaSearch } from "@/viewmodels/tulanpedia-tab";
import { useGlobalSearch } from "@/viewmodels/useGlobalSearch";
import { useLocateHit } from "@/viewmodels/useLocateHit";
import { twoFactorSetupNotice } from "@/viewmodels/auth-session";
import { useAuthSession } from "@/viewmodels/useAuthSession";
import { useConsoleNotices } from "@/viewmodels/useConsoleNotices";
import { useDashboardShell } from "@/viewmodels/useDashboardShell";
import { usePendingReviewCounts } from "@/viewmodels/usePendingReviewCounts";
import type { DashboardSection as SectionId } from "@/viewmodels/dashboard-shell";

const sectionTitles: Record<SectionId, string> = {
  dashboard: "Panel principal",
  news: "Noticias",
  events: "Eventos",
  tickets: "Venta de boletos",
  "ticket-prices": "Precios de boletos",
  reports: "Reportes",
  enclosures: "Recintos",
  users: "Usuarios",
  memories: "Momentos",
  "ticket-history": "Historial de boletos",
  tulanpedia: "TulanPedia",
};

function App() {
  const redirectToPwa = useCallback((url: string) => {
    window.requestAnimationFrame(() => window.location.assign(url));
  }, []);
  const session = useAuthSession(redirectToPwa);
  const shell = useDashboardShell();
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  // Acción sin elemento: solo pide la pestaña de TulanPedia (CA-36).
  const [tabRequest, setTabRequest] = useState<{ tab: TulanpediaTab; nonce: number } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const focusNonce = useRef(0);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const profile = session.state.profile;
  const presentationProfile = profile
    ? getPresentationProfile(profile.home)
    : null;
  const navigation = profile ? getNavigationForProfile(profile) : [];
  const consoleNotices = useConsoleNotices(
    session.state.status === "authenticated" ? (profile?.id ?? null) : null,
    profile?.permissions ?? [],
  );

  // dashboard-018: consulta al iniciar y al cambiar de sección; sin sondeo.
  const pendingReview = usePendingReviewCounts(
    session.state.status === "authenticated" ? (profile?.id ?? null) : null,
    profile?.permissions ?? [],
    shell.state.activeSection,
  );

  const deepLinkHandled = useRef(false);
  const searchSections = useMemo<SearchSectionInfo[]>(
    () => navigation.map(({ id, label, icon }) => ({ id, label, icon })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile],
  );
  const searchActions = useMemo(
    () => visibleSearchActions(profile?.permissions ?? [], navigation.map((item) => item.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile],
  );
  const locate = useLocateHit(
    focusTarget,
    contentRef,
    focusTarget ? sectionTitles[focusTarget.section] : "",
    () => setReloadKey((value) => value + 1),
  );
  const activeForSearch = navigation.some((item) => item.id === shell.state.activeSection)
    ? shell.state.activeSection
    : navigation[0]?.id ?? null;
  const globalSearch = useGlobalSearch({
    currentSection: activeForSearch,
    sections: searchSections,
    actions: searchActions,
    onSelect: (result: SearchResult, text: string) => {
      const ids = navigation.map((item) => item.id);
      const permissionList = profile?.permissions ?? [];
      // dashboard-020 CA-12: los boletos del historial llevan a la pestaña permitida de «Reportes».
      const route = resolveTicketRoute(result.section, ids, permissionList);
      const tabIds = availableReportTabs(permissionList).map((tab) => tab.id);
      const allowed = route?.tab && !ids.includes(result.section as SectionId) ? [...ids, result.section as SectionId] : ids;
      const plan = resolveSelection(result, {
        text,
        nonce: (focusNonce.current += 1),
        currentSection: activeForSearch,
        allowedSections: allowed,
      });
      const openRoute = (fallback: SectionId) => {
        const destination = route && route.section !== result.section ? route.section : fallback;

        const moving = destination !== activeForSearch;

        if (moving) shell.navigate(destination, ids);
        // Elegir la entrada «Reportes» estando en ella no cambia la pestaña activa.
        if (route?.tab && (moving || !result.isSection)) shell.selectReportsTab(route.tab, tabIds);
      };

      if (plan.type === "ignore") return;
      if (plan.type === "section") {
        setFocusTarget(null);
        setTabRequest(plan.tab ? { tab: plan.tab, nonce: focusNonce.current } : null);
        openRoute(plan.section);

        return;
      }
      setTabRequest(null);
      if (plan.navigate) openRoute(plan.target.section);
      setFocusTarget(plan.target);
    },
  });

  useEffect(() => {
    if (locate.state.missing) shell.showNotice(locate.state.missing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locate.state.missing]);

  useEffect(() => {
    if (session.state.status !== "authenticated") shell.reset();
  }, [session.state.status]);

  // CA-63: `?section=tulanpedia` abre TulanPedia solo si la navegación (permiso) la incluye.
  useEffect(() => {
    if (session.state.status !== "authenticated") {
      deepLinkHandled.current = false;
      return;
    }
    if (deepLinkHandled.current || !profile) return;
    deepLinkHandled.current = true;
    if (!isTulanpediaSearch(window.location.search)) return;
    const ids = getNavigationForProfile(profile).map((item) => item.id);
    if (ids.includes("tulanpedia")) shell.navigate("tulanpedia", ids);
  }, [session.state.status, profile]);

  useEffect(() => {
    if (shell.state.mobileMenuOpen) {
      sidebarRef.current
        ?.querySelector<HTMLButtonElement>(".sidebar-link")
        ?.focus();
    }
  }, [shell.state.mobileMenuOpen]);

  useEffect(() => {
    if (session.state.status !== "authenticated") return;

    window.requestAnimationFrame(() => {
      const heading = contentRef.current?.querySelector("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    });
  }, [session.state.status, shell.state.activeSection]);

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
        retryAfterSeconds={session.state.retryAfterSeconds}
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
        retryAfterSeconds={session.state.retryAfterSeconds}
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
        onSignOut={session.logout}
        notice={twoFactorSetupNotice(profile)}
      />
    );
  }

  if (session.state.status === "redirecting-pwa") {
    return (
      <PwaRedirectView
        pwaUrl={profile?.pwa_url ?? null}
        submitting={session.state.submitting}
        error={session.state.error}
        onSignOut={session.logout}
      />
    );
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

  const activeSection = navigation.some((item) => item.id === shell.state.activeSection)
    ? shell.state.activeSection
    : navigation[0]?.id ?? null;

  const navigate = (section: SectionId) => {
    if (!navigation.some((item) => item.id === section)) return;
    setFocusTarget(null);
    setTabRequest(null);
    shell.navigate(section, navigation.map((item) => item.id));
    window.requestAnimationFrame(() => {
      const heading = contentRef.current?.querySelector("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    });
  };

  const showNotice = (message: string) => shell.showNotice(message);
  const closeMobileMenu = () => {
    if (!shell.state.mobileMenuOpen) return;
    shell.toggleMenu();
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };
  const initials = profile.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join("");
  const permissions = new Set(profile.permissions);
  const reportTabs = availableReportTabs(profile.permissions);
  const focusFor = (section: SectionId) =>
    focusTarget?.section === section
      ? { id: focusTarget.id, nonce: focusTarget.nonce, action: focusTarget.action }
      : null;

  return (
    <DashboardNotifications key={profile.id}>
    <StepUpProvider>
    <ConsoleNoticesPublisher {...consoleNotices} />
    <PendingReviewNotices announcement={pendingReview.announcement} />
    <div
      className={`dashboard-app ${presentationProfile === "ticket" ? "dashboard-app--ticket" : "dashboard-app--admin"} ${shell.state.desktopMenuCollapsed ? "dashboard-app--menu-collapsed" : ""}`}
    >
      {shell.state.mobileMenuOpen && (
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
        className={`sidebar ${shell.state.mobileMenuOpen ? "sidebar--open" : ""}`}
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
                  ? "Consulta directiva"
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
            <SidebarLink
              key={item.id}
              id={item.id}
              label={item.label}
              icon={item.icon}
              active={activeSection === item.id}
              counts={pendingReview.counts}
              onSelect={navigate}
            />
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
          <Button
            className="desktop-menu-toggle"
            variant="secondary"
            aria-label="Fijar menú de navegación abierto"
            aria-controls="dashboardNavigation"
            aria-pressed={!shell.state.desktopMenuCollapsed}
            onClick={shell.toggleDesktopMenu}
          >
            <Icon name="menu" />
          </Button>
          <div className="topbar__mobile">
            <Button
              ref={menuButtonRef}
              variant="secondary"
              aria-label="Abrir menú de navegación"
              aria-controls="dashboardNavigation"
              aria-expanded={shell.state.mobileMenuOpen}
              onClick={shell.toggleMenu}
            >
              <Icon name="menu" />
            </Button>
            <strong>{activeSection ? sectionTitles[activeSection] : "Panel principal"}</strong>
          </div>
          <GlobalSearch {...globalSearch} />
          <div className="topbar__actions">
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
          <NoticeBar message={shell.state.notice} tone="error" onDismiss={() => showNotice("")} />
          {navigation.length === 0 && (
            <Alert role="alert">
              Tu cuenta no tiene permisos para mostrar secciones del panel.
            </Alert>
          )}
          <SearchHitBanner
            banner={locate.state.banner}
            announcement={locate.state.announcement}
            onClear={locate.clear}
          />
          <Fragment key={reloadKey}>
          {activeSection === "dashboard" && (
            <DashboardSection
              onOpenReport={
                permissions.has("reports.view")
                  ? () => navigate("reports")
                  : undefined
              }
            />
          )}
          {activeSection === "news" && <NewsSection focus={focusFor("news")} />}
          {activeSection === "events" && <EventsSection focus={focusFor("events")} />}
          {activeSection === "tickets" && <TicketSaleSection />}
          {activeSection === "reports" && (
            <ReportsSection
              tabs={reportTabs}
              selected={shell.state.reportsTab}
              canCancel={canCancelInReports(profile.permissions)}
              canReviewCancellations={profile.permissions.includes("reports.cancellations.view")}
              counts={pendingReview.counts}
              onSelectTab={(tab) =>
                shell.selectReportsTab(tab, reportTabs.map((item) => item.id))
              }
              historyFocus={
                focusTarget?.section === "ticket-history"
                  ? { folio: String(focusTarget.id), nonce: focusTarget.nonce, action: focusTarget.action }
                  : null
              }
            />
          )}
          {activeSection === "enclosures" && (
            <EnclosuresSection canManage={permissions.has("enclosures.manage")} focus={focusFor("enclosures")} />
          )}
          {activeSection === "users" && <UsersSection focus={focusFor("users")} />}
          {activeSection === "memories" && <MemoriesSection />}
          {activeSection === "ticket-history" && (
            <TicketHistorySection
              focus={
                focusTarget?.section === "ticket-history"
                  ? { folio: String(focusTarget.id), nonce: focusTarget.nonce, action: focusTarget.action }
                  : null
              }
            />
          )}
          {activeSection === "ticket-prices" && <TicketPricesSection />}
          {activeSection === "tulanpedia" && (
            <TulanpediaSection
              focus={
                focusTarget?.section === "tulanpedia"
                  ? { tab: tabForKind(focusTarget.kind), nonce: focusTarget.nonce }
                  : tabRequest
              }
            />
          )}
          </Fragment>
        </main>
      </div>
    </div>
    </StepUpProvider>
    </DashboardNotifications>
  );
}

export default App;
