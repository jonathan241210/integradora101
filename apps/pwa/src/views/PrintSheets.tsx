import {
  chemicalRestraintRows,
  institution,
  intenseSystems,
  intenseVitals,
  physicalRestraints,
  quickGroups,
  sampleTypes,
  sexOptions,
} from '@/viewmodels/diagnosisForms';

export type SheetValues = Record<string, string>;

const LOGO_SRC = '/logo-zoologico.jpeg';

function formatDate(value: string | undefined): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function sexLabel(value: string | undefined): string {
  return sexOptions.find((option) => option.value === value)?.label ?? value ?? '';
}

function Box({ checked }: { checked: boolean }) {
  return <span className={`sheet-box${checked ? ' is-checked' : ''}`}>{checked ? '✓' : ''}</span>;
}

function Line({ label, value, className }: { label: string; value?: string; className?: string }) {
  return (
    <span className={`sheet-line${className ? ` ${className}` : ''}`}>
      <b>{label}</b>
      <span className="sheet-fill">{value}</span>
    </span>
  );
}

function SheetHeader() {
  return (
    <header className="sheet-letterhead">
      <img
        alt=""
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
        src={LOGO_SRC}
      />
      <div>
        <p>{institution.name}</p>
        <p>{institution.department}</p>
        <p>{institution.title}</p>
      </div>
    </header>
  );
}

export function QuickPrintSheet({ values }: { values: SheetValues }) {
  const get = (key: string) => values[key] ?? '';

  return (
    <div className="print-sheet quick-sheet">
      <div className="sheet-title">Formato de historia clínica</div>
      <div className="sheet-row sheet-split">
        <div className="sheet-cell sheet-label">Motivo de la valoración clínica</div>
        <div className="sheet-cell sheet-grow">{get('quick-reason')}</div>
        <div className="sheet-cell sheet-label sheet-center">Fecha</div>
        <div className="sheet-cell sheet-date">{formatDate(get('quick-date'))}</div>
      </div>

      <div className="sheet-band">Información del ejemplar</div>
      {[
        ['Especie:', get('quick-species')],
        ['Edad:', get('quick-age') && `${get('quick-age')} años`],
        ['Sexo:', sexLabel(get('quick-sex'))],
        ['Peso:', get('quick-weight') && `${get('quick-weight')} kg`],
      ].map(([label, value]) => (
        <div className="sheet-row sheet-info" key={label}>
          <span>{label}</span>
          <span className="sheet-grow">{value}</span>
        </div>
      ))}

      <div className="sheet-band">Examen físico general</div>
      <div className="sheet-row sheet-triple">
        <div className="sheet-cell">
          <b>Frecuencia cardiaca</b> {get('quick-heart-rate')}
        </div>
        <div className="sheet-cell">
          <b>Frecuencia respiratoria</b> {get('quick-respiratory-rate')}
        </div>
        <div className="sheet-cell">
          <b>Temperatura</b> {get('quick-temperature')}
        </div>
      </div>

      {quickGroups.map((group) => (
        <div className="sheet-row sheet-group" key={group.name}>
          <div className="sheet-cell sheet-label sheet-center">{group.label}</div>
          <div className="sheet-options">
            {group.options.map((option) => (
              <span className="sheet-option" key={option}>
                {option}
                <Box checked={`quick-${group.name}-${option}` in values} />
              </span>
            ))}
            {group.name === 'body-condition' && (
              <span className="sheet-option">
                Puntaje (1-5):
                <span className="sheet-score">{get('quick-body-score')}</span>
              </span>
            )}
          </div>
        </div>
      ))}

      <div className="sheet-row sheet-conclusion">
        <div className="sheet-cell sheet-label sheet-center sheet-gray">Diagnóstico</div>
        <div className="sheet-cell sheet-text">{get('quick-diagnosis')}</div>
        <div className="sheet-cell sheet-label sheet-center sheet-gray">Recomendaciones</div>
        <div className="sheet-cell sheet-text">
          {get('quick-recommendations')}
          <div className="sheet-release">
            ¿El ejemplar se encuentra en condiciones óptimas para su liberación a vida silvestre?
            <span>
              Sí <Box checked={get('quick-release') === 'si'} /> No{' '}
              <Box checked={get('quick-release') === 'no'} />
            </span>
          </div>
        </div>
      </div>

      <div className="sheet-row sheet-footer-row">
        <div className="sheet-cell">MVZ</div>
        <div className="sheet-cell">Cédula profesional</div>
        <div className="sheet-cell sheet-center">Firma</div>
      </div>
    </div>
  );
}

export function IntensePrintSheet({ values }: { values: SheetValues }) {
  const get = (key: string) => values[key] ?? '';
  const restraintColumns = ['medication', 'dose-mg-kg', 'dose-ml', 'time', 'notes'] as const;
  const restraintHeaders = ['Medicamento', 'Dosis mg/kg', 'Dosis en ml', 'Hora de aplicación', 'Observaciones'];

  return (
    <div className="print-sheet intense-sheet">
      <section className="sheet-page">
        <SheetHeader />
        <h2 className="sheet-heading">HISTORIA CLINICA DEL EJEMPLAR</h2>
        <p className="sheet-inline">
          <Line label="MVZ:" value={get('intense-mvz')} />
          <Line label="Fecha:" value={formatDate(get('intense-date'))} className="sheet-short" />
        </p>

        <h3>Datos del paciente:</h3>
        <div className="sheet-box-frame">
          <p className="sheet-inline">
            <Line label="Nombre:" value={get('intense-name')} />
            <Line label="Especie:" value={get('intense-species')} />
            <Line label="Identificación:" value={get('intense-identification')} />
          </p>
          <p className="sheet-inline">
            <Line label="Edad:" value={get('intense-age') && `${get('intense-age')} años`} />
            <Line label="Sexo:" value={sexLabel(get('intense-sex'))} />
            <Line label="Peso:" value={get('intense-weight') && `${get('intense-weight')} kg`} />
          </p>
        </div>

        <h3>Anamnesis:</h3>
        <p className="sheet-inline">
          <b>Tipo de movilización:</b>
          <Line label="Física:" value={get('intense-mobilization-physical')} />
          <Line label="Química:" value={get('intense-mobilization-chemical')} />
        </p>

        <p className="sheet-italic">*Contención Química:</p>
        <table className="sheet-table">
          <thead>
            <tr>
              {restraintHeaders.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: chemicalRestraintRows }, (_, row) => (
              <tr key={row}>
                {restraintColumns.map((column) => (
                  <td key={column}>{get(`intense-restraint-${row + 1}-${column}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="sheet-italic">*Contención física:</p>
        <p className="sheet-inline sheet-wrap">
          {physicalRestraints.map((item) => (
            <Line key={item.name} label={`${item.label}:`} value={get(`intense-physical-${item.name}`)} />
          ))}
        </p>
        <p className="sheet-bullet">
          <b>Observaciones generales:</b> {get('intense-general-notes')}
        </p>
      </section>

      <section className="sheet-page sheet-page-break">
        <SheetHeader />
        <h3 className="sheet-heading-left">Evaluación clínica.</h3>
        {intenseSystems.map((item) => (
          <Line key={item.name} label={`${item.label}:`} value={get(`intense-eval-${item.name}`)} className="sheet-full" />
        ))}
        <p className="sheet-inline">
          {intenseVitals.map((item) => (
            <Line
              key={item.name}
              label={`${item.label.replace(/\s*\(.*\)/, '')}.`}
              value={get(`intense-vital-${item.name}`)}
            />
          ))}
        </p>

        <h3 className="sheet-heading-left">Sinología:</h3>
        <p className="sheet-inline">
          <Line label="No. de animales afectados:" value={get('intense-affected')} className="sheet-short" />
        </p>
        <p className="sheet-inline">
          <b>Toma de muestra:</b>
          <span>
            <b>SI</b> <Box checked={get('intense-sample') === 'si'} />
          </span>
          <span>
            <b>NO</b> <Box checked={get('intense-sample') === 'no'} />
          </span>
        </p>
        <p className="sheet-italic">*Tipo de muestra:</p>
        <p className="sheet-inline sheet-wrap">
          {sampleTypes.map((item) => (
            <span key={item.name}>
              <b>{item.label}:</b> <Box checked={`intense-sample-${item.name}` in values} />
            </span>
          ))}
        </p>
        <p className="sheet-inline">
          <Line label="Biopsia:" value={get('intense-biopsy')} />
          <Line label="Rayos X:" value={get('intense-xray')} />
        </p>
        <Line label="Muestra de Laboratorio:" value={get('intense-lab')} className="sheet-full" />
        <Line label="Diagnóstico presuntivo:" value={get('intense-presumptive')} className="sheet-full" />
        <Line label="Diagnóstico definitivo:" value={get('intense-definitive')} className="sheet-full" />
      </section>

      <footer className="sheet-address">{institution.address}</footer>
    </div>
  );
}
