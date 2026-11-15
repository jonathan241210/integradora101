import { Alert, Badge, Button, Card } from '@arca/ui';
import { Fragment, useState } from 'react';
import { createPortal } from 'react-dom';
import { exportSheetPdf } from '@/viewmodels/pdfExport';
import type { AnimalEvaluation, AnimalProfile } from '@/services/apiClient';
import { institution, usePrintDocument, physicalRestraints } from '@/viewmodels/diagnosisForms';
import { useAnimal } from '@/viewmodels/useApiData';
import { LoadingScreen, Spinner } from '@/views/Spinner';

type Row = [string, string | number | null | undefined];

const sexLabels: Record<string, string> = {
  F: 'Hembra',
  M: 'Macho',
  I: 'No identificado',
};

const evaluationLabels: Record<string, { label: string; tone: 'success' | 'warning' | 'info' }> = {
  Historia_Clinica_Completa: { label: 'Diagnóstico intenso', tone: 'warning' },
  Revision_Rapida: { label: 'Diagnóstico rápido / revisión', tone: 'info' },
};

const systemLabels: Record<string, string> = {
  'general-condition': 'Condición física general',
  skin: 'Piel y faneras',
  digestive: 'Aparato digestivo',
  urogenital: 'Aparato urogenital',
  senses: 'Órganos de los sentidos',
  musculoskeletal: 'Músculo-esquelético',
  'lymph-nodes': 'Nódulos linfáticos',
  cardiovascular: 'Sistema cardiovascular',
  nervous: 'Sistema nervioso',
  respiratory: 'Aparato respiratorio',
  endocrine: 'Endócrino',
  eyes: 'Ojos',
};

const sampleLabels: Record<string, string> = {
  blood: 'Sangre',
  urine: 'Orina',
  feces: 'Heces',
  fluids: 'Fluidos',
  'skin-scraping': 'Raspado cutáneo',
  biopsy: 'Biopsia',
  xray: 'Rayos X',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
}

function ageFromBirthDate(birthDate: string | null | undefined): string {
  if (!birthDate) return '—';
  const birth = new Date(`${birthDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '—';
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return '—';
  if (years === 0) return `${months} mes${months === 1 ? '' : 'es'}`;
  if (months === 0) return `${years} año${years === 1 ? '' : 's'}`;
  return `${years} año${years === 1 ? '' : 's'} ${months} mes${months === 1 ? '' : 'es'}`;
}

function displayAnimalAge(animal: AnimalProfile): string {
  const latestAge = animal.evaluations.find((evaluation) => evaluation.patient_age?.trim())?.patient_age?.trim();
  return latestAge || ageFromBirthDate(animal.birth_date);
}

function DataList({ items }: { items: Row[] }) {
  return (
    <dl className="profile-data">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value === null || value === undefined || value === '' ? '—' : value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const physicalLabels: Record<string, string> = Object.fromEntries(
  physicalRestraints.map((item) => [item.name, item.label]),
);

type Restraint = AnimalEvaluation['restraints'][number];

// El detalle físico viaja en notes como "net: no; tamer: si"; se separa de las observaciones libres.
function splitPhysicalNotes(notes: string | null): { methods: [string, string][]; remarks: string[] } {
  const methods: [string, string][] = [];
  const remarks: string[] = [];

  for (const line of (notes ?? '').split('\n').filter(Boolean)) {
    const parts = line.split('; ');
    const parsed = parts.map((part) => part.match(/^([\w-]+): (.+)$/));

    if (parsed.every((match) => match && match[1] in physicalLabels)) {
      parsed.forEach((match) => methods.push([physicalLabels[match![1]], match![2]]));
    } else {
      remarks.push(line);
    }
  }

  return { methods, remarks };
}

function yesNo(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (['si', 'sí', 'yes', '1', 'true'].includes(normalized)) return 'Sí';
  if (['no', '0', 'false'].includes(normalized)) return 'No';
  return value;
}

function RestraintTables({ restraints }: { restraints: Restraint[] }) {
  const chemical = restraints.filter((item) => item.mobilization_type === 'chemical');
  const physical = restraints.filter((item) => item.mobilization_type !== 'chemical');
  const physicalMethods = physical.flatMap((item) => splitPhysicalNotes(item.notes).methods);
  const physicalRemarks = physical.flatMap((item) => splitPhysicalNotes(item.notes).remarks);

  return (
    <>
      {chemical.length > 0 && (
        <>
          <h4>Contención química</h4>
          <div className="table-scroll">
            <table className="profile-table">
              <thead>
                <tr>
                  <th scope="col">Medicamento</th>
                  <th scope="col">Dosis (mg/kg)</th>
                  <th scope="col">Dosis (ml)</th>
                  <th scope="col">Hora</th>
                  <th scope="col">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {chemical.map((item) => (
                  <tr key={item.id}>
                    <td>{item.drug ?? '—'}</td>
                    <td>{item.dose_mg_per_kg ?? '—'}</td>
                    <td>{item.dose_ml ?? '—'}</td>
                    <td>{item.administered_time ? item.administered_time.slice(0, 5) : '—'}</td>
                    <td>{item.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {physical.length > 0 && (
        <>
          <h4>Contención física</h4>
          {physicalMethods.length > 0 ? (
            <div className="table-scroll">
              <table className="profile-table">
                <thead>
                  <tr>
                    <th scope="col">Método</th>
                    <th scope="col">Aplicado</th>
                  </tr>
                </thead>
                <tbody>
                  {physicalMethods.map(([label, value]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{yesNo(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            physical.some((item) => item.physical_method) && (
              <p>{physical.map((item) => item.physical_method).filter(Boolean).join(', ')}</p>
            )
          )}
          {physicalRemarks.map((remark) => (
            <p className="profile-muted" key={remark}>{remark}</p>
          ))}
        </>
      )}
    </>
  );
}

function EvaluationItem({ evaluation }: { evaluation: AnimalEvaluation }) {
  const kind = evaluationLabels[evaluation.evaluation_type] ?? {
    label: evaluation.evaluation_type.replace(/_/g, ' '),
    tone: 'info' as const,
  };
  const vitals: [string, string | null][] = [
    ['Temperatura', evaluation.temperature_c !== null ? `${evaluation.temperature_c} °C` : null],
    ['Frec. cardiaca', evaluation.heart_rate !== null ? `${evaluation.heart_rate} lat/min` : null],
    ['Frec. respiratoria', evaluation.respiratory_rate !== null ? `${evaluation.respiratory_rate} resp/min` : null],
    ['TLC', evaluation.capillary_refill_time !== null ? `${evaluation.capillary_refill_time} seg` : null],
    ['Peso', evaluation.weight_kg !== null ? `${evaluation.weight_kg} kg` : null],
    ['Condición corporal', evaluation.body_condition_score !== null ? `${evaluation.body_condition_score} / 5` : null],
  ];
  const shownVitals = vitals.filter(([, value]) => value !== null);
  const conclusions = (
    [
      ['Estado de seguimiento', followUpStatusLabel(evaluation.follow_up_status)],
      ['Próxima revisión', evaluation.next_review_date ? formatDate(evaluation.next_review_date) : null],
      ['Motivo / notas', evaluation.assessment_reason],
      ['Diagnóstico presuntivo', evaluation.presumptive_diagnosis],
      ['Diagnóstico definitivo', evaluation.definitive_diagnosis],
      ['Recomendaciones', evaluation.recommendations],
    ] as Row[]
  ).filter(([, value]) => value && value !== '—');

  return (
    <article className="profile-evaluation">
      <header>
        <div>
          <Badge tone={kind.tone}>{kind.label}</Badge>
          {evaluation.veterinarian && (
            <span className="profile-muted"> · MVZ {evaluation.veterinarian}</span>
          )}
        </div>
        <time>{formatDate(evaluation.evaluation_date)}</time>
      </header>

      {shownVitals.length > 0 && (
        <div className="profile-vitals">
          {shownVitals.map(([label, value]) => (
            <Stat key={label} label={label} value={value as string} />
          ))}
        </div>
      )}

      {evaluation.findings.length > 0 && (
        <>
          <h4>Evaluación clínica</h4>
          <DataList
            items={evaluation.findings.map((finding): Row => [
              systemLabels[finding.organ_system] ?? finding.organ_system,
              finding.description ?? finding.status,
            ])}
          />
        </>
      )}

      {evaluation.restraints.length > 0 && <RestraintTables restraints={evaluation.restraints} />}

      {evaluation.lab_samples.length > 0 && (
        <>
          <h4>Muestras</h4>
          <ul className="profile-list">
            {evaluation.lab_samples.map((sample) => (
              <li key={sample.id}>
                <strong>{sampleLabels[sample.sample_type] ?? sample.sample_type}</strong>
                {sample.result_notes && <span className="profile-muted"> — {sample.result_notes}</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {conclusions.length > 0 && (
        <div className="profile-conclusions">
          <DataList items={conclusions} />
        </div>
      )}
    </article>
  );
}

function ProfileHeroStats({ animal }: { animal: AnimalProfile }) {
  const last = animal.evaluations[0];

  return (
    <div className="profile-vitals">
      <Stat label="Identificación" value={animal.tag_number || '—'} />
      <Stat label="Edad" value={displayAnimalAge(animal)} />
      <Stat label="Ingreso" value={formatDate(animal.entry_date)} />
      <Stat label="Última revisión" value={last ? formatDate(last.evaluation_date) : 'Sin registros'} />
    </div>
  );
}

function shortDate(value: string | null | undefined): string {
  if (!value) return '';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

const followUpStatusLabels: Record<string, string> = {
  stable: 'Estable',
  monitoring: 'En observación',
  follow_up: 'Requiere seguimiento',
  'follow-up': 'Requiere seguimiento',
};

function followUpStatusLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return followUpStatusLabels[value] ?? value.replace(/_/g, ' ');
}

function SheetLine({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <span className="sheet-line">
      <b>{label}</b>
      <span className="sheet-fill">{value ?? ''}</span>
    </span>
  );
}

function EvaluationPrintSection({ evaluation }: { evaluation: AnimalEvaluation }) {
  const kind = evaluationLabels[evaluation.evaluation_type]?.label ?? evaluation.evaluation_type.replace(/_/g, ' ');
  const chemical = evaluation.restraints.filter((item) => item.mobilization_type === 'chemical');
  const physical = evaluation.restraints.filter((item) => item.mobilization_type !== 'chemical');
  const methods = physical.flatMap((item) => splitPhysicalNotes(item.notes).methods);
  const remarks = physical.flatMap((item) => splitPhysicalNotes(item.notes).remarks);
  const vitals: [string, string | number | null][] = [
    ['Temp.', evaluation.temperature_c],
    ['FR.', evaluation.respiratory_rate],
    ['FC.', evaluation.heart_rate],
    ['TLC.', evaluation.capillary_refill_time],
    ['C.C.', evaluation.body_condition_score],
    ['Peso.', evaluation.weight_kg],
  ];
  const conclusions: [string, string | null][] = [
    ['Motivo / notas:', evaluation.assessment_reason],
    ['Diagnóstico presuntivo:', evaluation.presumptive_diagnosis],
    ['Diagnóstico definitivo:', evaluation.definitive_diagnosis],
    ['Recomendaciones:', evaluation.recommendations],
  ];

  return (
    <section className="sheet-evaluation">
      <h3 className="sheet-eval-title">
        {kind} — {shortDate(evaluation.evaluation_date)}
        {evaluation.veterinarian ? ` — MVZ ${evaluation.veterinarian}` : ''}
      </h3>
      <p className="sheet-inline sheet-wrap">
        {vitals.map(([label, value]) => (
          <SheetLine key={label} label={label} value={value} />
        ))}
      </p>

      {evaluation.findings.map((finding) => (
        <p className="sheet-inline" key={finding.id}>
          <SheetLine
            label={`${systemLabels[finding.organ_system] ?? finding.organ_system}:`}
            value={finding.description ?? finding.status}
          />
        </p>
      ))}

      {chemical.length > 0 && (
        <>
          <p className="sheet-italic">*Contención Química:</p>
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Dosis mg/kg</th>
                <th>Dosis en ml</th>
                <th>Hora de aplicación</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {chemical.map((item) => (
                <tr key={item.id}>
                  <td>{item.drug}</td>
                  <td>{item.dose_mg_per_kg}</td>
                  <td>{item.dose_ml}</td>
                  <td>{item.administered_time?.slice(0, 5)}</td>
                  <td>{item.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {physical.length > 0 && (
        <>
          <p className="sheet-italic">*Contención física:</p>
          <p className="sheet-inline sheet-wrap">
            {methods.length > 0
              ? methods.map(([label, value]) => <SheetLine key={label} label={`${label}:`} value={yesNo(value)} />)
              : physical.map((item) => item.physical_method).filter(Boolean).join(', ')}
          </p>
          {remarks.map((remark) => (
            <p key={remark}>{remark}</p>
          ))}
        </>
      )}

      {evaluation.lab_samples.length > 0 && (
        <p className="sheet-inline sheet-wrap">
          <b>Muestras:</b>
          {evaluation.lab_samples.map((sample) => (
            <span key={sample.id}>
              {sampleLabels[sample.sample_type] ?? sample.sample_type}
              {sample.result_notes ? ` (${sample.result_notes})` : ''}
            </span>
          ))}
        </p>
      )}

      {conclusions
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <p className="sheet-inline" key={label}>
            <SheetLine label={label} value={value} />
          </p>
        ))}
    </section>
  );
}

function PatientSheetHeader({ animal, title, subtitle }: { animal: AnimalProfile; title: string; subtitle?: string }) {
  return (
    <>
      <header className="sheet-letterhead">
        <img
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
          src="/logo-zoologico.jpeg"
        />
        <div>
          <p>{institution.name}</p>
          <p>{institution.department}</p>
          <p>{institution.title}</p>
        </div>
      </header>
      <h2 className="sheet-heading">{title}</h2>
      {subtitle && (
        <p className="sheet-inline">
          <SheetLine label="Detalle:" value={subtitle} />
        </p>
      )}
      <p className="sheet-inline">
        <SheetLine label="Fecha de emisión:" value={shortDate(new Date().toISOString())} />
      </p>

      <h3>Datos del paciente:</h3>
      <div className="sheet-box-frame">
        <p className="sheet-inline">
          <SheetLine label="Nombre:" value={animal.name} />
          <SheetLine label="Especie:" value={animal.species?.common_name} />
          <SheetLine label="Identificación:" value={animal.tag_number} />
        </p>
        <p className="sheet-inline">
          <SheetLine label="Edad:" value={displayAnimalAge(animal)} />
          <SheetLine label="Sexo:" value={animal.sex ? (sexLabels[animal.sex] ?? animal.sex) : ''} />
          <SheetLine label="Recinto:" value={animal.enclosure} />
        </p>
        <p className="sheet-inline">
          <SheetLine label="Origen:" value={animal.origin} />
          <SheetLine label="Ingreso:" value={shortDate(animal.entry_date)} />
          <SheetLine label="Alimentación:" value={animal.species?.feeding} />
        </p>
      </div>
    </>
  );
}

function ProfilePrintSheet({ animal }: { animal: AnimalProfile }) {
  return (
    <div id="profile-full-sheet" className="print-sheet intense-sheet profile-sheet">
      <PatientSheetHeader animal={animal} title="HISTORIA CLINICA DEL EJEMPLAR" subtitle="Historial clínico completo" />

      {animal.evaluations.length === 0 && <p className="sheet-italic">Sin diagnósticos ni revisiones registrados.</p>}

      {animal.evaluations.map((evaluation) => (
        <EvaluationPrintSection evaluation={evaluation} key={evaluation.id} />
      ))}

      <footer className="sheet-address">{institution.address}</footer>
    </div>
  );
}

function SingleEvaluationPrintSheet({ animal, evaluation }: { animal: AnimalProfile; evaluation: AnimalEvaluation }) {
  const kind = evaluationLabels[evaluation.evaluation_type]?.label ?? evaluation.evaluation_type.replace(/_/g, ' ');
  return (
    <div id="profile-single-sheet" className="print-sheet intense-sheet profile-sheet">
      <PatientSheetHeader
        animal={animal}
        title="HISTORIA CLINICA DEL EJEMPLAR"
        subtitle={`${kind} — ${shortDate(evaluation.evaluation_date)}`}
      />
      <EvaluationPrintSection evaluation={evaluation} />
      <footer className="sheet-address">{institution.address}</footer>
    </div>
  );
}

export function AnimalProfileView({
  animalId,
  onBack,
}: {
  animalId: number | null;
  onBack: () => void;
}) {
  const { animal, loading, error, reload } = useAnimal(animalId);
  const { error: printError } = usePrintDocument();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [openEvaluationId, setOpenEvaluationId] = useState<number | null>(null);
  const [singlePdfEvaluation, setSinglePdfEvaluation] = useState<AnimalEvaluation | null>(null);

  const downloadFullPdf = async () => {
    const sheet = document.getElementById('profile-full-sheet');
    if (!sheet || !animal) return;
    setPdfBusy(true);
    setPdfError('');
    try {
      await exportSheetPdf(sheet, `historial-completo-${animal.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    } catch {
      setPdfError('No se pudo generar el PDF. Inténtalo de nuevo.');
    } finally {
      setPdfBusy(false);
    }
  };

  const downloadSinglePdf = async (evaluation: AnimalEvaluation) => {
    if (!animal) return;
    setSinglePdfEvaluation(evaluation);
    setPdfBusy(true);
    setPdfError('');
    try {
      // esperar a que el portal renderice la hoja del historial seleccionado
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const sheet = document.getElementById('profile-single-sheet');
      if (!sheet) throw new Error('sheet missing');
      const kind = evaluationLabels[evaluation.evaluation_type]?.label ?? 'historial';
      await exportSheetPdf(
        sheet,
        `${kind.toLowerCase().replace(/\s+/g, '-')}-${shortDate(evaluation.evaluation_date).replace(/\//g, '-')}-${animal.name.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      );
    } catch {
      setPdfError('No se pudo generar el PDF del historial seleccionado. Inténtalo de nuevo.');
    } finally {
      setPdfBusy(false);
      setSinglePdfEvaluation(null);
    }
  };

  if (loading) return <LoadingScreen label="Cargando…" />;

  if (error || !animal) {
    return (
      <section className="page-section">
        <Alert role="alert">{error || 'No se encontró el animal.'}</Alert>
        <div className="form-actions">
          <Button onClick={onBack} variant="secondary">Volver a animales</Button>
          <Button onClick={reload}>Reintentar</Button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section printable-document profile-page">
      <div className="profile-toolbar no-print">
        <Button onClick={onBack} variant="ghost">← Volver a animales</Button>
        <Button disabled={pdfBusy} onClick={downloadFullPdf} variant="secondary">
          {pdfBusy ? <Spinner label="Cargando…" /> : 'Descargar historial completo (PDF)'}
        </Button>
      </div>
      {(printError || pdfError) && <Alert className="no-print" role="alert">{printError || pdfError}</Alert>}
      {createPortal(<ProfilePrintSheet animal={animal} />, document.body)}
      {singlePdfEvaluation && createPortal(<SingleEvaluationPrintSheet animal={animal} evaluation={singlePdfEvaluation} />, document.body)}

      <Card className="profile-hero">
        <span className="profile-avatar" aria-hidden="true">{animal.name.slice(0, 1)}</span>
        <div className="profile-hero-text">
          <p className="eyebrow">Perfil del animal</p>
          <h2>{animal.name}</h2>
          <p>
            {animal.species?.common_name ?? 'Sin especie'}
            {animal.species?.scientific_name && <em> · {animal.species.scientific_name}</em>}
          </p>
          <div className="profile-badges">
            {animal.sex && <Badge tone="info">{sexLabels[animal.sex] ?? animal.sex}</Badge>}
            {animal.stay_status && <Badge tone="neutral">{animal.stay_status.replace(/_/g, ' ')}</Badge>}
            {animal.enclosure && <Badge tone="success">{animal.enclosure}</Badge>}
          </div>
        </div>
      </Card>

      <ProfileHeroStats animal={animal} />

      <Card className="form-card profile-section">
        <h3>Datos generales</h3>
        <DataList
          items={[
            ['Fecha de nacimiento', formatDate(animal.birth_date)],
            ['Origen', animal.origin],
            ['Recinto', animal.enclosure],
            ['Características', animal.characteristics],
          ]}
        />
      </Card>

      {animal.species && (
        <Card className="form-card profile-section">
          <h3>Especie</h3>
          <DataList
            items={[
              ['Nombre común', animal.species.common_name],
              ['Nombre científico', animal.species.scientific_name],
              ['Categoría', animal.species.category],
              ['Estado de conservación', animal.species.conservation_status],
              ['Hábitat', animal.species.habitat],
              ['Alimentación', animal.species.feeding],
              ['Longevidad', animal.species.longevity],
              ['Reproducción', animal.species.reproduction],
            ]}
          />
        </Card>
      )}

      <Card className="form-card profile-section">
        <h3>Historial clínico ({animal.evaluations.length})</h3>
        {animal.evaluations.length === 0 ? (
          <p className="profile-muted">Este animal aún no tiene diagnósticos ni revisiones registrados.</p>
        ) : (
          <div className="table-scroll">
            <table className="profile-table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Motivo / diagnóstico</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Próxima revisión</th>
                  <th scope="col">MVZ</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {animal.evaluations.map((evaluation) => {
                  const kind = evaluationLabels[evaluation.evaluation_type] ?? {
                    label: evaluation.evaluation_type.replace(/_/g, ' '),
                    tone: 'info' as const,
                  };
                  const summary =
                    evaluation.definitive_diagnosis ||
                    evaluation.presumptive_diagnosis ||
                    evaluation.assessment_reason ||
                    evaluation.evaluation_reason ||
                    '—';
                  const open = openEvaluationId === evaluation.id;
                  return (
                    <Fragment key={evaluation.id}>
                      <tr>
                        <td>{formatDate(evaluation.evaluation_date)}</td>
                        <td><Badge tone={kind.tone}>{kind.label}</Badge></td>
                        <td>{summary.length > 80 ? `${summary.slice(0, 80)}…` : summary}</td>
                        <td>{followUpStatusLabel(evaluation.follow_up_status)}</td>
                        <td>{evaluation.next_review_date ? shortDate(evaluation.next_review_date) : '—'}</td>
                        <td>{evaluation.veterinarian ?? '—'}</td>
                        <td>
                          <div className="form-actions" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setOpenEvaluationId(open ? null : evaluation.id)}
                            >
                              {open ? 'Ocultar' : 'Ver'}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={pdfBusy}
                              onClick={() => void downloadSinglePdf(evaluation)}
                            >
                              PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={7}>
                            <EvaluationItem evaluation={evaluation} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}
