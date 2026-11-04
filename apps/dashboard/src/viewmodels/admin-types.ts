/**
 * Tipos del contrato de administración que usan las vistas. Se reexportan
 * desde el ViewModel para que `views/`, `components/` y `sections/` no
 * importen `@arca/api-client` directamente (dashboard-003 CA-14).
 */
export type {
  AdminApi,
  DailySalesDto,
  DashboardSummaryDto,
  EnclosureDto,
  EventDto,
  EventInput,
  NewsDto,
  NewsInput,
  PageMeta,
  ReportExportFormat,
  ReportPeriodType,
  SalesTotalsDto,
  StaffAccountDto,
  StaffCreateInput,
  StaffOptionsDto,
  StaffUpdateInput,
  TicketReportDto,
  TicketReportQuery,
  TicketRowDto,
} from "@arca/api-client";
