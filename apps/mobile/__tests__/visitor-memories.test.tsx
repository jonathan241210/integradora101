import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import type { ApiError, VisitorMemoryDto } from '@arca/api-client';
import { AppTabBar } from '../src/components/AppTabBar';
import { Text } from 'react-native';
import {
  CHANGE_IMAGE,
  CHANGE_OPINION,
  CONFIRM_CORRECTION,
  IMAGE_NOTE,
  IMAGE_RULE,
  memoryComposerAccess,
  OFFLINE_TEXT,
  OPINION_NOTE,
  OPINION_RULE,
  OPEN_TEXT,
  SUCCESS_TEXT,
  toMemoryCard,
  toMemoryDetail,
  weeklyText,
} from '../src/memories/memoryCopy';
import { peekMemories, rememberMemories, replaceMemory, resetMemoriesForTests } from '../src/memories/memoryStore';
import type { MemoryFile } from '../src/memories/pickMemoryImage';
import { DENIED_TEXT } from '../src/memories/memoryCopy';
import type { MemoryRepository } from '../src/repositories/memoryRepository';
import { createMemoryRepository, isMemoryApiError } from '../src/repositories/memoryRepository';
import { MemoriesScreen } from '../src/screens/MemoriesScreen';
import { MemoryDetailScreen } from '../src/screens/MemoryDetailScreen';
import { MemoryUnavailableScreen } from '../src/screens/MemoryUnavailableScreen';
import { MemoryFormScreen } from '../src/screens/MemoryFormScreen';
import { ProfileScreen } from '../src/screens/ProfileScreen';
import { useMemoryComposer, useMemoryForm } from '../src/viewmodels/useMemoryForm';
import { findMemory, useVisitorMemories } from '../src/viewmodels/useVisitorMemories';
import { createMemoryTokenStorage } from '../src/services/tokenStorage';
import type { User } from '../src/models';

jest.mock('expo-file-system', () => ({
  File: function MockFile(uri: string) {
    return { uri };
  },
}));

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    body: { cancel: async () => undefined },
  } as unknown as Response;
}

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}));

const jpeg = (size = 1200): MemoryFile => ({
  uri: 'file:///foto.jpg',
  name: 'foto.jpg',
  mimeType: 'image/jpeg',
  size,
});

function memory(partial: Partial<VisitorMemoryDto> & Pick<VisitorMemoryDto, 'id' | 'status'>): VisitorMemoryDto {
  return {
    opinion: null,
    created_at: '2026-11-14T18:00:00Z',
    reviewed_at: null,
    resubmitted_count: 0,
    ...partial,
  };
}

function apiError(status: number, body: Record<string, unknown> = {}): ApiError {
  const error = new Error(typeof body.message === 'string' ? body.message : 'error') as ApiError;
  error.name = 'ApiError';
  error.status = status;
  if (typeof body.code === 'string') error.code = body.code;
  if (body.errors && typeof body.errors === 'object') error.errors = body.errors as ApiError['errors'];
  if (body.data !== undefined) error.data = body.data;
  return error;
}

function repository(overrides: Partial<MemoryRepository> = {}): MemoryRepository {
  return {
    list: jest.fn(async () => ({ data: [], meta: { can_submit: true, next_submission_at: null, open_request_id: null } })),
    submit: jest.fn(async () => memory({ id: 1, status: 'submitted' })),
    resubmit: jest.fn(async () => memory({ id: 1, status: 'submitted' })),
    ...overrides,
  };
}

function allowPhoto(file: MemoryFile = jpeg()) {
  jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({ granted: true } as never);
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: file.uri, fileName: file.name, mimeType: file.mimeType, fileSize: file.size ?? undefined }],
  } as never);
}

function FormProbe({
  repo,
  existing = null,
}: {
  repo: MemoryRepository;
  existing?: VisitorMemoryDto | null;
}) {
  const form = useMemoryForm(repo, existing);
  return (
    <MemoryFormScreen
      title={existing ? 'Corregir y reenviar' : 'Enviar un momento'}
      opinion={form.opinion}
      consent={form.consent}
      fileName={form.fileName}
      imageError={form.imageError}
      opinionError={form.opinionError}
      consentError={form.consentError}
      banner={form.banner}
      success={form.success}
      busy={form.busy}
      permissionDenied={form.permissionDenied}
      canSend={form.canSend}
      requiresConfirmation={existing?.status === 'rejected'}
      reason={existing?.status === 'rejected' ? existing.rejection_reason ?? null : null}
      rejectedFields={existing?.rejected_fields ?? []}
      onOpinionChange={form.changeOpinion}
      onToggleConsent={() => form.setConsent(true)}
      onChooseImage={() => { void form.chooseImage(); }}
      onSubmit={() => { void form.submit(); }}
      onBack={() => undefined}
    />
  );
}

const visitor: User = {
  id: '1',
  name: 'Ana',
  avatar: '',
  level: 1,
  rank: 'Explorador',
  points: 10,
  discoveredCount: 1,
  totalAnimals: 5,
};

async function confirmCorrection(view: ReturnType<typeof render>) {
  await fireEvent.press(view.getByRole('button', { name: 'Enviar petición' }));
  expect(view.getByText(CONFIRM_CORRECTION)).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Sí, enviar' }));
}

async function chooseAndConsent(view: ReturnType<typeof render>) {
  allowPhoto();
  await fireEvent.press(view.getByRole('button', { name: 'Elegir foto' }));
  await waitFor(() => expect(view.getByText('foto.jpg')).toBeTruthy());
  await fireEvent.press(view.getByRole('checkbox'));
  await waitFor(() => expect(view.getByRole('checkbox').props.accessibilityState?.checked).toBe(true));
}

describe('Momentos del visitante', () => {
  beforeEach(() => {
    resetMemoriesForTests();
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockClear();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockClear();
  });

  it('CA-01 Perfil muestra Mis memorias, no hay pestaña nueva y el permiso se pide al elegir la foto', async () => {
    const profile = await render(
      <ProfileScreen
        user={visitor}
        achievements={[]}
        onAchievementPress={() => undefined}
        onSeeAllAchievementsPress={() => undefined}
        onMemoriesPress={() => undefined}
        onSettingsPress={() => undefined}
      />,
    );
    expect(profile.getByRole('button', { name: 'Mis memorias' })).toBeTruthy();
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();

    const bar = await render(
      <AppTabBar
        state={{
          index: 5,
          routes: [
            { key: 'index', name: 'index' },
            { key: 'map', name: 'map' },
            { key: 'scan', name: 'scan' },
            { key: 'collection', name: 'collection' },
            { key: 'profile', name: 'profile' },
            { key: 'memories', name: 'memories' },
          ],
        }}
        navigation={{ navigate: jest.fn() }}
      />,
    );
    expect(bar.getByText('Home')).toBeTruthy();
    expect(bar.getByText('Perfil')).toBeTruthy();
    expect(bar.queryByText('Mis memorias')).toBeNull();

    const view = await render(<FormProbe repo={repository()} />);
    expect(ImagePicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    allowPhoto();
    await fireEvent.press(view.getByRole('button', { name: 'Elegir foto' }));
    await waitFor(() => expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalledTimes(1));
  });

  it('CA-02 el botón espera imagen y consentimiento, y queda activo con la opinión vacía', async () => {
    const view = await render(<FormProbe repo={repository()} />);
    const button = view.getByRole('button', { name: 'Enviar petición' });
    expect(button.props.accessibilityState?.disabled).toBe(true);
    await chooseAndConsent(view);
    expect(view.getByLabelText('0 de 300 caracteres')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Enviar petición' }).props.accessibilityState?.disabled).toBeUndefined();
  });

  it('CA-03 un archivo inválido, uno de más de 5 MB o una opinión larga no llaman al cliente', async () => {
    const repo = repository();
    const view = await render(<FormProbe repo={repo} />);
    allowPhoto({ uri: 'file:///foto.gif', name: 'foto.gif', mimeType: 'image/gif', size: 100 });
    await fireEvent.press(view.getByRole('button', { name: 'Elegir foto' }));
    await waitFor(() => expect(view.getByText(IMAGE_RULE)).toBeTruthy());

    allowPhoto(jpeg(6 * 1024 * 1024));
    await fireEvent.press(view.getByRole('button', { name: 'Elegir foto' }));
    await waitFor(() => expect(view.getAllByText(IMAGE_RULE).length).toBeGreaterThan(0));

    allowPhoto();
    await fireEvent.press(view.getByRole('button', { name: 'Elegir foto' }));
    await fireEvent.changeText(view.getByLabelText('Opinión (opcional)'), 'a'.repeat(301));
    expect(view.getByText(OPINION_RULE)).toBeTruthy();
    await fireEvent.press(view.getByRole('checkbox'));
    await fireEvent.press(view.getByRole('button', { name: 'Enviar petición' }));
    expect(repo.submit).not.toHaveBeenCalled();
  });

  it('CA-04 un 201 muestra Enviada y el texto de revisión', async () => {
    const view = await render(<FormProbe repo={repository()} />);
    await chooseAndConsent(view);
    await fireEvent.press(view.getByRole('button', { name: 'Enviar petición' }));
    await waitFor(() => expect(view.getByText(SUCCESS_TEXT)).toBeTruthy());
    expect(view.getByText('Enviada')).toBeTruthy();
    expect(view.queryByText(/ya está en el portal/)).toBeNull();
  });

  it('CA-05 un segundo toque durante el envío no llama otra vez', async () => {
    let release: (value: VisitorMemoryDto) => void = () => undefined;
    const submit = jest.fn(() => new Promise<VisitorMemoryDto>((resolve) => {
      release = resolve;
    }));
    const view = await render(<FormProbe repo={repository({ submit })} />);
    await chooseAndConsent(view);
    const button = view.getByRole('button', { name: 'Enviar petición' });
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(submit).toHaveBeenCalledTimes(1);
    await act(async () => {
      release(memory({ id: 3, status: 'submitted' }));
    });
  });

  it('CA-06 la lista pinta los cuatro estados y usa GET de momentos', async () => {
    const items = [
      memory({ id: 1, status: 'submitted', opinion: 'Una' }),
      memory({ id: 2, status: 'in_review', opinion: 'Dos' }),
      memory({ id: 3, status: 'accepted', opinion: 'Tres', is_published: true, published_until: '2026-11-21T18:00:00Z' }),
      memory({ id: 4, status: 'rejected', opinion: 'Cuatro', rejection_reason: 'No', rejected_fields: ['image'] }),
    ];
    const list = jest.fn(async () => ({
      data: items,
      meta: { can_submit: true, next_submission_at: null, open_request_id: null },
    }));
    const cards = items.map(toMemoryCard);
    const view = await render(
      <MemoriesScreen
        loading={false}
        error={null}
        items={cards}
        canSubmit
        nextSubmissionAt={null}
        openRequestId={null}
        onCreate={() => undefined}
        onOpen={() => undefined}
        onRetry={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(view.getByText('Enviada')).toBeTruthy();
    expect(view.getByText(SUCCESS_TEXT)).toBeTruthy();
    expect(view.getByText('En proceso')).toBeTruthy();
    expect(view.getByText('Aceptada')).toBeTruthy();
    expect(view.getByText('Rechazada')).toBeTruthy();
    await list();
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('CA-07 una rechazada muestra Motivo y los textos de foto y opinión', async () => {
    const card = toMemoryCard(memory({
      id: 4,
      status: 'rejected',
      rejection_reason: 'La foto está oscura',
      rejected_fields: ['image', 'content'],
    }));
    const view = await render(
      <MemoriesScreen
        loading={false}
        error={null}
        items={[card]}
        canSubmit={false}
        nextSubmissionAt={null}
        openRequestId={4}
        onCreate={() => undefined}
        onOpen={() => undefined}
        onRetry={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(view.getByText('Motivo: La foto está oscura')).toBeTruthy();
    expect(view.getByText(IMAGE_NOTE)).toBeTruthy();
    expect(view.getByText(OPINION_NOTE)).toBeTruthy();
  });

  it('CA-08 aceptada vigente y vencida usan los dos textos de plazo y la lista no muestra la foto', async () => {
    const live = toMemoryCard(memory({
      id: 1,
      status: 'accepted',
      is_published: true,
      published_until: '2026-11-21T18:00:00Z',
    }));
    const done = toMemoryCard(memory({
      id: 2,
      status: 'accepted',
      is_published: false,
      published_until: '2026-11-10T18:00:00Z',
    }));
    const view = await render(
      <MemoriesScreen
        loading={false}
        error={null}
        items={[live, done]}
        canSubmit
        nextSubmissionAt={null}
        openRequestId={null}
        onCreate={() => undefined}
        onOpen={() => undefined}
        onRetry={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(view.getByText(/Publicada en «Momentos para recordar» del portal hasta el /)).toBeTruthy();
    expect(view.getByText(/La publicación terminó el .+ Ya no se muestra en el portal\./)).toBeTruthy();
    expect(view.queryByRole('image')).toBeNull();
  });

  it('CA-09 los errores se muestran en español y no dicen que la petición se guardó', async () => {
    const cases: Array<{ error: ApiError; text: string | RegExp }> = [
      { error: apiError(422, { message: 'Revisa la opinión.', errors: { opinion: ['La opinión puede tener hasta 300 caracteres.'] } }), text: 'La opinión puede tener hasta 300 caracteres.' },
      { error: apiError(401, { message: 'Confirma tu correo para continuar.', code: 'email_not_verified' }), text: 'Confirma tu correo para continuar.' },
      { error: apiError(403, { message: 'Confirma tu correo para continuar.', code: 'email_not_verified' }), text: 'Confirma tu correo para continuar.' },
      { error: apiError(403, { message: 'No tienes permiso para hacer esto.' }), text: 'No tienes permiso para hacer esto.' },
      { error: apiError(404, { message: 'missing' }), text: 'No encontramos esa petición.' },
      { error: apiError(413, { message: 'too big' }), text: IMAGE_RULE },
      { error: apiError(415, { message: 'bad type' }), text: IMAGE_RULE },
    ];

    for (const item of cases) {
      const view = await render(<FormProbe repo={repository({
        submit: jest.fn(async () => {
          throw item.error;
        }),
      })} />);
      await chooseAndConsent(view);
      await fireEvent.press(view.getByRole('button', { name: 'Enviar petición' }));
      await waitFor(() => expect(view.getByText(item.text)).toBeTruthy());
      expect(view.queryByText(/se guardó/)).toBeNull();
      await view.unmount();
    }
  });

  it('CA-10 sin red el envío muestra Sin conexión y no confirma el alta', async () => {
    const submit = jest.fn(async () => { throw apiError(0, { message: 'Sin conexión' }); });
    const view = await render(<FormProbe repo={repository({ submit })} />);
    await chooseAndConsent(view);
    await fireEvent.press(view.getByRole('button', { name: 'Enviar petición' }));
    await waitFor(() => expect(view.getByText(OFFLINE_TEXT)).toBeTruthy());
    expect(view.queryByText(SUCCESS_TEXT)).toBeNull();
    expect(submit).toHaveBeenCalledTimes(1);

    const resubmit = jest.fn(async () => { throw apiError(0, { message: 'Sin conexión' }); });
    const existing = memory({
      id: 4,
      status: 'rejected',
      opinion: 'Antes',
      rejected_fields: ['content'],
      rejection_reason: 'Otra',
    });
    const correction = await render(<FormProbe repo={repository({ resubmit })} existing={existing} />);
    await fireEvent.changeText(correction.getByLabelText('Opinión (opcional)'), 'Después');
    await fireEvent.press(correction.getByRole('checkbox'));
    await confirmCorrection(correction);
    await waitFor(() => expect(correction.getByText(OFFLINE_TEXT)).toBeTruthy());
    expect(correction.queryByText(SUCCESS_TEXT)).toBeNull();
  });

  it('CA-11 las pantallas no importan el cliente HTTP', () => {
    const memories = readFileSync(join(__dirname, '../src/screens/MemoriesScreen.tsx'), 'utf8');
    const form = readFileSync(join(__dirname, '../src/screens/MemoryFormScreen.tsx'), 'utf8');
    for (const source of [memories, form]) {
      expect(source).not.toMatch(/@arca\/api-client/);
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toMatch(/axios/);
    }
  });

  it('CA-12 consentimiento, errores y campos marcados tienen texto, no solo color', async () => {
    const existing = memory({
      id: 9,
      status: 'rejected',
      opinion: 'Antes',
      rejection_reason: 'Cambia el texto',
      rejected_fields: ['content'],
    });
    const view = await render(<FormProbe repo={repository()} existing={existing} />);
    expect(view.getByRole('checkbox').props.accessibilityLabel).toMatch(/permiso de las personas/);
    expect(view.getByText('Motivo')).toBeTruthy();
    expect(view.getByText(CHANGE_OPINION)).toBeTruthy();
    await fireEvent.changeText(view.getByLabelText('Opinión (opcional)'), 'a'.repeat(301));
    expect(view.getByText(OPINION_RULE)).toBeTruthy();
  });

  it('CA-13 los nombres de las pruebas incluyen CA-01 a CA-18', () => {
    const source = readFileSync(join(__dirname, 'visitor-memories.test.tsx'), 'utf8');
    for (let number = 1; number <= 18; number += 1) {
      expect(source).toContain(`CA-${String(number).padStart(2, '0')}`);
    }
  });

  it('CA-14 can_submit falso muestra la fecha y no ofrece el alta; un 429 usa el mismo texto', async () => {
    const when = '2026-11-21T18:00:00Z';
    const sentence = weeklyText(when);
    const list = await render(
      <MemoriesScreen
        loading={false}
        error={null}
        items={[]}
        canSubmit={false}
        nextSubmissionAt={when}
        openRequestId={null}
        onCreate={() => undefined}
        onOpen={() => undefined}
        onRetry={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(list.getByText(sentence)).toBeTruthy();
    expect(list.queryByText('Enviar un momento')).toBeNull();

    const view = await render(<FormProbe repo={repository({
      submit: jest.fn(async () => {
        throw apiError(429, {
          message: 'límite',
          code: 'weekly_limit_reached',
          data: { next_submission_at: when },
        });
      }),
    })} />);
    await chooseAndConsent(view);
    await fireEvent.press(view.getByRole('button', { name: 'Enviar petición' }));
    await waitFor(() => expect(view.getByText(sentence)).toBeTruthy());
  });

  it('CA-15 una petición abierta no muestra el aviso y la ficha solo informa, sin alta nueva', async () => {
    const onOpen = jest.fn();
    const sent = memory({ id: 7, status: 'in_review', opinion: 'El jaguar' });
    const view = await render(
      <MemoriesScreen
        loading={false}
        error={null}
        items={[toMemoryCard(sent)]}
        canSubmit={false}
        nextSubmissionAt={null}
        openRequestId={7}
        onCreate={() => undefined}
        onOpen={onOpen}
        onRetry={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(view.queryByText(OPEN_TEXT)).toBeNull();
    expect(view.queryByText('Ver su estado')).toBeNull();
    expect(view.queryByText('Enviar un momento')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Ver El jaguar' }));
    expect(onOpen).toHaveBeenCalledWith(7);

    const detail = await render(
      <MemoryDetailScreen detail={toMemoryDetail(sent)} onBack={() => undefined} />,
    );
    expect(detail.getByText('En proceso')).toBeTruthy();
    expect(detail.getByText('El jaguar')).toBeTruthy();
    expect(detail.queryByText('Foto enviada')).toBeNull();
    expect(detail.queryByLabelText('Opinión (opcional)')).toBeNull();
    expect(detail.queryByRole('button', { name: 'Enviar petición' })).toBeNull();

    const form = await render(<FormProbe repo={repository({
      submit: jest.fn(async () => {
        throw apiError(422, { code: 'open_request', errors: { open_request: [OPEN_TEXT] } });
      }),
    })} />);
    await chooseAndConsent(form);
    await fireEvent.press(form.getByRole('button', { name: 'Enviar petición' }));
    await waitFor(() => expect(form.getByText(OPEN_TEXT)).toBeTruthy());
    expect(form.queryByText(SUCCESS_TEXT)).toBeNull();
  });

  it('CA-10 el aviso sin petición muestra la pantalla de memoria y no un texto suelto', async () => {
    const onAction = jest.fn();
    const onBack = jest.fn();
    const view = await render(
      <MemoryUnavailableScreen
        title="Tu memoria"
        message="No encontramos esa petición."
        detail="Puede que ya no esté en tu cuenta."
        actionLabel="Ver mis memorias"
        onAction={onAction}
        onBack={onBack}
      />,
    );
    await waitFor(() => expect(view.getByText('Tu memoria')).toBeTruthy());
    expect(view.getByText('No encontramos esa petición.')).toBeTruthy();
    expect(view.getByText('Puede que ya no esté en tu cuenta.')).toBeTruthy();
    await act(async () => {
      fireEvent.press(view.getByRole('button', { name: 'Ver mis memorias' }));
      fireEvent.press(view.getByRole('button', { name: 'Volver a mis memorias' }));
    });
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
    await act(async () => {
      view.unmount();
    });
  });

  it('CA-06 al volver a abrir la lista pide de nuevo el estado aunque ya hubiera una copia', async () => {
    rememberMemories({
      data: [memory({ id: 8, status: 'submitted', opinion: 'Antes' })],
      meta: { can_submit: false, next_submission_at: null, open_request_id: 8 },
    });
    const list = jest.fn(async () => ({
      data: [memory({
        id: 8,
        status: 'rejected',
        opinion: 'Antes',
        rejection_reason: 'Otra foto',
        rejected_fields: ['image'],
      })],
      meta: { can_submit: false, next_submission_at: null, open_request_id: 8 },
    }));
    const repo = repository({ list });
    function Probe() {
      const state = useVisitorMemories(repo);
      return <Text>{state.list?.data[0]?.status ?? 'vacio'}</Text>;
    }
    const view = await render(<Probe />);
    await waitFor(() => expect(view.getByText('rejected')).toBeTruthy());
    expect(list).toHaveBeenCalledTimes(1);
  });

  it('CA-15 una petición enviada deja de ofrecer el alta y una ya enviada no abre el formulario', () => {
    replaceMemory(memory({ id: 4, status: 'submitted' }));
    expect(peekMemories()?.meta.open_request_id).toBe(4);
    expect(peekMemories()?.meta.can_submit).toBe(false);
    expect(memoryComposerAccess({
      requestedId: null,
      status: null,
      openRequestId: 4,
      canSubmit: false,
      nextSubmissionAt: null,
    })).toBe('open');
    expect(memoryComposerAccess({
      requestedId: 4,
      status: 'submitted',
      openRequestId: 4,
      canSubmit: false,
      nextSubmissionAt: null,
    })).toBe('view');
    expect(memoryComposerAccess({
      requestedId: 4,
      status: 'rejected',
      openRequestId: 4,
      canSubmit: false,
      nextSubmissionAt: null,
    })).toBe('correct');
  });

  it('CA-16 corregir precarga la opinión, vuelve a pedir consentimiento y llama a resubmit', async () => {
    const resubmit = jest.fn(async () => memory({ id: 9, status: 'submitted', opinion: 'Después' }));
    const existing = memory({
      id: 9,
      status: 'rejected',
      opinion: 'Antes',
      rejection_reason: 'Otra opinión',
      rejected_fields: ['content'],
    });
    const view = await render(<FormProbe repo={repository({ resubmit })} existing={existing} />);
    expect(view.getByLabelText('Opinión (opcional)').props.value).toBe('Antes');
    expect(view.getByRole('checkbox').props.accessibilityState.checked).toBe(false);
    await fireEvent.changeText(view.getByLabelText('Opinión (opcional)'), 'Después');
    await fireEvent.press(view.getByRole('checkbox'));
    await fireEvent.press(view.getByRole('button', { name: 'Enviar petición' }));
    expect(resubmit).not.toHaveBeenCalled();
    await fireEvent.press(view.getByRole('button', { name: 'Cancelar' }));
    expect(resubmit).not.toHaveBeenCalled();
    await confirmCorrection(view);
    await waitFor(() => expect(resubmit).toHaveBeenCalledWith(9, expect.objectContaining({ opinion: 'Después', consent: true })));
    expect(resubmit).toHaveBeenCalledTimes(1);
    expect(view.getByText(SUCCESS_TEXT)).toBeTruthy();
    expect(view.queryByLabelText('Opinión (opcional)')).toBeNull();
    expect(view.queryByRole('button', { name: 'Enviar petición' })).toBeNull();
  });

  it('CA-17 sin foto nueva o con la misma opinión no se envía, y un 422 queda junto al campo', async () => {
    const submit = jest.fn();
    const resubmit = jest.fn(async () => { throw apiError(422, { errors: { opinion: ['Cambia la opinión antes de reenviarla.'] } }); });
    const imageCase = memory({
      id: 2,
      status: 'rejected',
      rejected_fields: ['image'],
      rejection_reason: 'Otra foto',
    });
    const blocked = await render(<FormProbe repo={repository({ submit, resubmit })} existing={imageCase} />);
    expect(blocked.getByText(CHANGE_IMAGE)).toBeTruthy();
    await fireEvent.press(blocked.getByRole('checkbox'));
    await fireEvent.press(blocked.getByRole('button', { name: 'Enviar petición' }));
    expect(resubmit).not.toHaveBeenCalled();

    const same = memory({
      id: 3,
      status: 'rejected',
      opinion: 'Igual',
      rejected_fields: ['content'],
      rejection_reason: 'Otra',
    });
    const unchanged = await render(<FormProbe repo={repository({ resubmit })} existing={same} />);
    await fireEvent.press(unchanged.getByRole('checkbox'));
    await fireEvent.press(unchanged.getByRole('button', { name: 'Enviar petición' }));
    expect(resubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(unchanged.getByLabelText('Opinión (opcional)'), 'Distinta');
    await confirmCorrection(unchanged);
    await waitFor(() => expect(unchanged.getByText('Cambia la opinión antes de reenviarla.')).toBeTruthy());
  });

  it('CA-18 el motivo y el plazo salen de la lista, y tras el 200 la fila se sustituye sin otra consulta', async () => {
    const list = jest.fn(async () => ({ data: [], meta: { can_submit: true, next_submission_at: null, open_request_id: null } }));
    const resubmit = jest.fn(async () => memory({ id: 5, status: 'submitted', opinion: 'Nueva' }));
    const existing = memory({
      id: 5,
      status: 'rejected',
      opinion: 'Vieja',
      rejection_reason: 'Motivo de la lista',
      rejected_fields: ['content'],
      published_until: '2026-11-20T18:00:00Z',
      is_published: false,
    });
    const card = toMemoryCard({ ...existing, status: 'accepted', is_published: false });
    const listView = await render(
      <MemoriesScreen
        loading={false}
        error={null}
        items={[card]}
        canSubmit
        nextSubmissionAt={null}
        openRequestId={null}
        onCreate={() => undefined}
        onOpen={() => undefined}
        onRetry={() => undefined}
        onBack={() => undefined}
      />,
    );
    expect(listView.getByText(/La publicación terminó el /)).toBeTruthy();
    expect(list).not.toHaveBeenCalled();

    const form = await render(<FormProbe repo={repository({ list, resubmit })} existing={existing} />);
    expect(form.getByText('Motivo de la lista')).toBeTruthy();
    await fireEvent.changeText(form.getByLabelText('Opinión (opcional)'), 'Nueva');
    await fireEvent.press(form.getByRole('checkbox'));
    await confirmCorrection(form);
    await waitFor(() => expect(form.getByText(SUCCESS_TEXT)).toBeTruthy());
    expect(list).not.toHaveBeenCalled();
  });

  it('CA-01 el permiso denegado no devuelve archivo', async () => {
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue({ granted: false } as never);
    const view = await render(<FormProbe repo={repository()} />);
    await fireEvent.press(view.getByRole('button', { name: 'Elegir foto' }));
    await waitFor(() => expect(view.getByText(DENIED_TEXT)).toBeTruthy());
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('sin repositorio no pide la lista y un fallo de lectura se muestra', async () => {
    function Quiet() {
      const state = useVisitorMemories(null);
      return <Text>{state.available ? 'si' : state.error ?? 'no'}</Text>;
    }
    const quiet = await render(<Quiet />);
    expect(quiet.getByText('no')).toBeTruthy();
    resetMemoriesForTests();
    expect(findMemory(4)).toBeNull();
    expect(findMemory(4, null)).toBeNull();
    expect(findMemory(4, { data: [], meta: { can_submit: true, next_submission_at: null, open_request_id: null } })).toBeNull();
    function DefaultList() {
      const state = useVisitorMemories();
      return <Text>{state.available ? 'si' : 'defecto'}</Text>;
    }
    const defaults = await render(<DefaultList />);
    expect(defaults.getByText('defecto')).toBeTruthy();

    const repo = {
      list: async () => { throw new Error('red'); },
      submit: async () => { throw new Error('red'); },
      resubmit: async () => { throw new Error('red'); },
    };
    function Broken() {
      const state = useVisitorMemories(repo);
      return <Text>{state.error ?? 'vacio'}</Text>;
    }
    const broken = await render(<Broken />);
    expect(await broken.findByText(OFFLINE_TEXT)).toBeTruthy();
  });

  it('el formulario sin cliente avisa y puede preparar otra corrección', async () => {
    const existing = memory({
      id: 3,
      status: 'rejected',
      opinion: 'Antes',
      rejected_fields: ['content'],
    });
    function Probe() {
      const form = useMemoryComposer(existing);
      return (
        <>
          <Text>{`disponible ${form.available ? 'si' : 'no'} consentimiento ${form.consent ? 'si' : 'no'} aviso ${form.banner ?? 'ninguno'}`}</Text>
          <Text onPress={() => { form.changeOpinion('Después'); form.toggleConsent(); }}>edit</Text>
          <Text onPress={() => { void form.submit(); }}>send</Text>
          <Text onPress={() => form.prepare(null)}>prepare</Text>
        </>
      );
    }
    const view = await render(<Probe />);
    expect(view.getByText('disponible no consentimiento no aviso ninguno')).toBeTruthy();
    await fireEvent.press(view.getByText('edit'));
    expect(view.getByText('disponible no consentimiento si aviso ninguno')).toBeTruthy();
    await fireEvent.press(view.getByText('send'));
    expect(await view.findByText(`disponible no consentimiento si aviso ${OFFLINE_TEXT}`)).toBeTruthy();
    await fireEvent.press(view.getByText('prepare'));
    expect(view.getByText('disponible no consentimiento no aviso ninguno')).toBeTruthy();
  });

  it('el repositorio de momentos envía la foto y cierra la sesión vencida', async () => {
    const tokens = createMemoryTokenStorage();
    await tokens.write({ accessToken: 'viejo', refreshToken: 'refresco' });
    const memory = {
      id: 1,
      status: 'submitted',
      opinion: null,
      rejection_reason: null,
      rejected_fields: [],
      image_url: null,
      created_at: '2026-11-16T00:00:00Z',
    };
    const queue = [
      () => jsonResponse(200, { data: [], meta: { can_submit: true, next_submission_at: null, open_request_id: null } }),
      () => jsonResponse(200, { data: memory }),
      () => jsonResponse(200, { data: memory }),
      () => jsonResponse(401, { message: 'Unauthenticated.' }),
      () => jsonResponse(401, { message: 'vencida' }),
    ];
    const repo = createMemoryRepository({
      baseUrl: 'https://api.pruebas.invalid',
      storage: tokens,
      fetchImpl: (async () => {
        const next = queue.shift();
        if (!next) throw new Error('sin respuesta');
        return next();
      }) as typeof fetch,
    });
    await repo.list();
    await repo.submit({ image: null, opinion: '  ', consent: true });
    await repo.resubmit(1, {
      image: { uri: 'file:///foto.jpg', name: 'foto.jpg', mimeType: 'image/jpeg', size: 10 },
      opinion: 'Hola',
      consent: true,
    });
    await expect(repo.list()).rejects.toThrow();
    expect(await tokens.read()).toBeNull();
    const apiError = new Error('no') as Error & { status: number };
    apiError.name = 'ApiError';
    apiError.status = 422;
    expect(isMemoryApiError(apiError)).toBe(true);
    expect(isMemoryApiError(new Error('no'))).toBe(false);
  });

  it('renueva el acceso y, sin token, cierra la sesión', async () => {
    const bare = createMemoryRepository({
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: (async () => jsonResponse(401, { message: 'no' })) as typeof fetch,
    });
    await expect(bare.list()).rejects.toThrow();

    const tokens = createMemoryTokenStorage();
    await tokens.write({ accessToken: 'viejo', refreshToken: 'refresco' });
    const queue = [
      () => jsonResponse(401, { message: 'Unauthenticated.' }),
      () => jsonResponse(200, { data: { token_type: 'Bearer', expires_in: 900, access_token: 'nuevo', refresh_token: 'otro' } }),
      () => jsonResponse(200, { data: [], meta: { can_submit: true, next_submission_at: null, open_request_id: null } }),
      () => jsonResponse(401, { message: 'Unauthenticated.' }),
      () => jsonResponse(200, { data: { token_type: 'Bearer', expires_in: 900, access_token: 'nuevo-2' } }),
      () => jsonResponse(200, { data: [], meta: { can_submit: true, next_submission_at: null, open_request_id: null } }),
    ];
    const repo = createMemoryRepository({
      baseUrl: 'https://api.pruebas.invalid',
      storage: tokens,
      fetchImpl: (async () => {
        const next = queue.shift();
        if (!next) throw new Error('sin respuesta');
        return next();
      }) as typeof fetch,
    });
    await repo.list();
    expect(await tokens.read()).toEqual({ accessToken: 'nuevo', refreshToken: 'otro' });
    await repo.list();
    expect(await tokens.read()).toEqual({ accessToken: 'nuevo-2', refreshToken: 'otro' });
  });
});
