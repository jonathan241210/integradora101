import {
  AnimalRepositoryImpl,
  MapRepositoryImpl,
  UserRepositoryImpl,
  ZooRepositoryImpl,
  createAnimalRepository,
  createMapRepository,
  createZooRepository,
} from '../src/repositories';
import { UserRepositoryImpl as ReexportedUserRepository } from '../src/repositories/userRepository';
import {
  createMockAuthRepository,
} from '../src/repositories/mockAuthRepository';
import { MemoryKeyValueStorage } from '../src/repositories/storage';
import {
  clearSharedProgress,
  peekSharedProgress,
  publishSharedProgress,
  readSharedProgress,
  sharedProgressGeneration,
  subscribeSharedProgress,
} from '../src/repositories/sharedProgress';
import type { ProgressRepository, ProgressSnapshot } from '../src/repositories/progressRepository';
import { MOCK_ANIMALS, MOCK_EVENTS, MOCK_MAP_PLACES, MOCK_MAP_SECTIONS, MOCK_USER } from '../src/mocks/zoo';

const snapshot: ProgressSnapshot = {
  progress: {
    points: 50,
    level: 1,
    rank: 'Explorador',
    nextThreshold: 100,
    discoveredSpecies: 1,
    totalSpecies: 5,
  },
  collection: [],
  achievements: [],
  missions: [],
};

describe('mobile-011 CA-05: repositorios locales y factory', () => {
  it('expone los métodos CRUD de los repositorios mock', async () => {
    const animals = new AnimalRepositoryImpl();
    expect(await animals.getAllAnimals()).toEqual(MOCK_ANIMALS);
    expect(await animals.getAnimalById(MOCK_ANIMALS[0].id)).toEqual(MOCK_ANIMALS[0]);
    expect(await animals.getAnimalById('missing')).toBeNull();
    expect(await animals.getFeaturedAnimals()).toEqual(MOCK_ANIMALS.slice(0, 3));

    const users = new UserRepositoryImpl();
    expect(await users.getUser()).toEqual(MOCK_USER);
    expect(await users.getMissions()).toBeDefined();
    expect(await users.getAchievements()).toBeDefined();
    expect(await users.getMilestones()).toBeDefined();
    expect(await new ReexportedUserRepository().getUser()).toEqual(await users.getUser());

    const zoo = new ZooRepositoryImpl();
    expect(await zoo.getEvents()).toBeDefined();
    expect(await zoo.getEventById('missing')).toBeNull();
    expect(await zoo.getEventById(MOCK_EVENTS[0].id)).toEqual(MOCK_EVENTS[0]);
    expect(await zoo.getNews()).toBeDefined();

    const map = new MapRepositoryImpl();
    expect(await map.getPlaces()).toEqual(MOCK_MAP_PLACES);
    expect(await map.getSections()).toEqual(MOCK_MAP_SECTIONS);
  });

  it('selecciona mocks o repositorios API según la configuración', () => {
    const oldMocks = process.env.EXPO_PUBLIC_USE_MOCKS;
    const oldUseApi = process.env.EXPO_PUBLIC_USE_API;
    const oldNodeEnv = process.env.NODE_ENV;
    try {
      process.env.EXPO_PUBLIC_USE_MOCKS = 'true';
      expect(createAnimalRepository()).toBeInstanceOf(AnimalRepositoryImpl);
      expect(createZooRepository()).toBeInstanceOf(ZooRepositoryImpl);
      expect(createMapRepository()).toBeInstanceOf(MapRepositoryImpl);

      process.env.EXPO_PUBLIC_USE_MOCKS = 'false';
      process.env.NODE_ENV = 'test';
      delete process.env.EXPO_PUBLIC_USE_API;
      expect(createAnimalRepository()).toBeInstanceOf(AnimalRepositoryImpl);
      expect(createZooRepository()).toBeInstanceOf(ZooRepositoryImpl);
      expect(createMapRepository()).toBeInstanceOf(MapRepositoryImpl);

      process.env.NODE_ENV = 'production';
      expect(createAnimalRepository()).toHaveProperty('getAllAnimals');
      expect(createZooRepository()).toHaveProperty('getEvents');
      expect(createMapRepository()).toHaveProperty('getPlaces');
    } finally {
      if (oldMocks === undefined) delete process.env.EXPO_PUBLIC_USE_MOCKS;
      else process.env.EXPO_PUBLIC_USE_MOCKS = oldMocks;
      if (oldUseApi === undefined) delete process.env.EXPO_PUBLIC_USE_API;
      else process.env.EXPO_PUBLIC_USE_API = oldUseApi;
      if (oldNodeEnv === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
      else process.env.NODE_ENV = oldNodeEnv;
    }
  });
});

describe('mobile-011 CA-05: repositorio de autenticación mock', () => {
  it('cubre validaciones, registro, verificación, recuperación y límites', async () => {
    const repo = createMockAuthRepository();
    expect(await repo.getPrivacyNotice()).toMatchObject({ version: '2026-10' });
    expect(repo.issuedCode('desconocido@ejemplo.com')).toBeNull();

    repo.offline = true;
    expect(await repo.login('correo@ejemplo.com', 'secreta')).toMatchObject({ ok: false, status: 0 });
    expect(await repo.register({
      email: 'nuevo@ejemplo.com', firstName: 'N', nickname: 'N', password: 'clave',
      avatarCode: 'jaguar', isAdult: true, privacyNoticeVersion: '2026-10',
    })).toMatchObject({ ok: false, status: 0 });
    repo.offline = false;

    repo.limitLogin = true;
    expect(await repo.login('correo@ejemplo.com', 'secreta')).toMatchObject({ ok: false, status: 429 });
    repo.limitLogin = false;
    expect(await repo.login('no@ejemplo.com', 'secreta')).toMatchObject({ ok: false, status: 422 });
    expect(await repo.login('correo@ejemplo.com', 'incorrecta')).toMatchObject({ ok: false, status: 422 });
    expect(await repo.login('sin-verificar@ejemplo.com', 'secreta')).toMatchObject({
      ok: false, status: 403, code: 'email_not_verified',
    });

    expect(await repo.register({
      email: 'nuevo@ejemplo.com', firstName: 'N', nickname: 'N', password: 'clave',
      avatarCode: 'jaguar', isAdult: false, privacyNoticeVersion: '2026-10',
    })).toMatchObject({ ok: false });
    expect(await repo.register({
      email: 'nuevo@ejemplo.com', firstName: 'N', nickname: 'N', password: 'clave',
      avatarCode: 'jaguar', isAdult: true, privacyNoticeVersion: '',
    })).toMatchObject({ ok: false });
    expect(await repo.register({
      email: 'nuevo@ejemplo.com', firstName: 'N', nickname: 'N', password: 'clave',
      avatarCode: 'unknown', isAdult: true, privacyNoticeVersion: '2026-10',
    })).toMatchObject({ ok: false });

    const registration = {
      email: ' nuevo@ejemplo.com ', firstName: ' Nuevo ', nickname: ' Visitante ',
      password: 'clave', avatarCode: 'jaguar', isAdult: true, privacyNoticeVersion: '2026-10',
    };
    expect(await repo.register(registration)).toMatchObject({ ok: true, status: 201 });
    const code = repo.issuedCode('nuevo@ejemplo.com');
    expect(code).toMatch(/^\d{6}$/);
    expect(await repo.verifyEmail('nuevo@ejemplo.com', '000000')).toMatchObject({ ok: false, status: 422 });
    expect(await repo.verifyEmail('otro@ejemplo.com', '123456')).toMatchObject({ ok: false, status: 422 });
    expect(await repo.verifyEmail('nuevo@ejemplo.com', code!)).toMatchObject({ ok: true, status: 200 });
    expect(await repo.getProfile()).toMatchObject({ email: 'nuevo@ejemplo.com', firstName: 'Nuevo' });

    expect(await repo.register({ ...registration, email: 'nuevo@ejemplo.com' })).toMatchObject({ ok: true });
    const duplicateCode = repo.issuedCode('nuevo@ejemplo.com');
    expect(await repo.verifyEmail('nuevo@ejemplo.com', duplicateCode!)).toMatchObject({
      ok: true, code: 'email_already_registered',
    });

    repo.limitResend = true;
    expect(await repo.resendVerification('nuevo@ejemplo.com')).toMatchObject({ ok: false, status: 429 });
    repo.limitResend = false;
    expect(await repo.resendVerification('no@ejemplo.com')).toMatchObject({ ok: true, status: 202 });
    expect(await repo.resendVerification('nuevo@ejemplo.com')).toMatchObject({ ok: true, status: 202 });
    repo.offline = true;
    expect(await repo.resendVerification('nuevo@ejemplo.com')).toMatchObject({ ok: false, status: 0 });
    expect(await repo.forgotPassword('nuevo@ejemplo.com')).toMatchObject({ ok: false, status: 0 });
    repo.offline = false;

    expect(await repo.forgotPassword('no@ejemplo.com')).toMatchObject({ ok: true, status: 202 });
    expect(await repo.forgotPassword('nuevo@ejemplo.com')).toMatchObject({ ok: true, status: 202 });
    const recoveryCode = repo.issuedCode('nuevo@ejemplo.com', 'recovery');
    expect(await repo.resetPassword('nuevo@ejemplo.com', 'invalid', 'nueva')).toMatchObject({ ok: false });
    expect(await repo.resetPassword('nuevo@ejemplo.com', recoveryCode!, 'nueva')).toMatchObject({ ok: true });
    expect(await repo.login('nuevo@ejemplo.com', 'nueva')).toMatchObject({ ok: true });

    expect(await repo.updateProfile({
      firstName: 'Nuevo', nickname: 'Nuevo', avatarCode: 'missing',
    })).toMatchObject({ ok: false, status: 422 });
    expect(await repo.updateProfile({
      firstName: ' N ', nickname: ' Apodo ', avatarCode: 'wolf',
    })).toMatchObject({ ok: true, profile: { firstName: 'N', nickname: 'Apodo' } });
    expect(await repo.changePassword('wrong', 'nueva2')).toMatchObject({ ok: false, status: 422 });
    expect(await repo.changePassword('nueva', 'nueva2')).toMatchObject({ ok: true });
    expect(await repo.deleteAccount('wrong')).toMatchObject({ ok: false, status: 422 });
    expect(await repo.deleteAccount('nueva2')).toMatchObject({ ok: true, status: 204 });
    expect(await repo.getProfile()).toBeNull();
    expect(await repo.updateProfile({ firstName: '', nickname: '', avatarCode: 'jaguar' }))
      .toMatchObject({ ok: false, status: 401 });
    expect(await repo.changePassword('x', 'y')).toMatchObject({ ok: false, status: 401 });
    expect(await repo.deleteAccount('x')).toMatchObject({ ok: false, status: 401 });

    repo.reset();
    expect(repo.refreshAttempts).toBe(0);
    expect(repo.offline).toBe(false);
    expect(await repo.login('correo@ejemplo.com', 'secreta')).toMatchObject({ ok: true });
  });

  it('deduplica refresh simultáneo y traduce errores offline y sesión vencida', async () => {
    const repo = createMockAuthRepository();
    const [first, second] = await Promise.all([repo.refresh(), repo.refresh()]);
    expect(first).toEqual(second);
    expect(repo.refreshAttempts).toBe(1);

    repo.offline = true;
    expect(await repo.refresh()).toMatchObject({ ok: false, status: 0 });
    repo.offline = false;
    repo.failRefresh = true;
    expect(await repo.refresh()).toMatchObject({ ok: false, status: 401 });
    expect(repo.failRefresh).toBe(false);
  });
});

describe('mobile-011 CA-05: almacenamiento y caché compartida de progreso', () => {
  it('lee, escribe, elimina y limpia valores en memoria', async () => {
    const storage = new MemoryKeyValueStorage();
    expect(await storage.getItem('missing')).toBeNull();
    await storage.setItem('key', 'value');
    expect(await storage.getItem('key')).toBe('value');
    await storage.removeItem('key');
    expect(await storage.getItem('key')).toBeNull();
    await storage.setItem('another', 'value');
    await storage.clear();
    expect(await storage.getItem('another')).toBeNull();
  });

  it('publica snapshots, comparte lecturas, notifica y permite forzar recarga', async () => {
    clearSharedProgress();
    const listener = jest.fn();
    const unsubscribe = subscribeSharedProgress(listener);
    const load = jest.fn().mockResolvedValue(snapshot);
    const repository: ProgressRepository = {
      load,
      discover: async () => { throw new Error('unused'); },
    };

    publishSharedProgress(repository, snapshot);
    expect(peekSharedProgress(repository)).toBe(snapshot);
    expect(peekSharedProgress({ load, discover: repository.discover })).toBeNull();
    expect(await readSharedProgress(repository)).toBe(snapshot);
    expect(load).not.toHaveBeenCalled();

    const refreshed = { ...snapshot, progress: { ...snapshot.progress, points: 100 } };
    load.mockResolvedValueOnce(refreshed);
    expect(await readSharedProgress(repository, true)).toBe(refreshed);
    expect(peekSharedProgress(repository)).toBe(refreshed);
    expect(listener).toHaveBeenCalled();

    const generation = sharedProgressGeneration();
    clearSharedProgress();
    expect(sharedProgressGeneration()).toBe(generation + 1);
    expect(peekSharedProgress(repository)).toBeNull();
    unsubscribe();
  });

  it('deduplica una lectura pendiente y conserva el snapshot previo al fallar una recarga', async () => {
    clearSharedProgress();
    let resolveLoad: (value: ProgressSnapshot) => void = () => undefined;
    let rejectLoad: (error: Error) => void = () => undefined;
    const load = jest.fn()
      .mockImplementationOnce(() => new Promise<ProgressSnapshot>((resolve) => { resolveLoad = resolve; }))
      .mockImplementationOnce(() => new Promise<ProgressSnapshot>((_resolve, reject) => { rejectLoad = reject; }));
    const repository: ProgressRepository = {
      load,
      discover: async () => { throw new Error('unused'); },
    };

    const first = readSharedProgress(repository);
    const joined = readSharedProgress(repository);
    expect(joined).toBe(first);
    resolveLoad(snapshot);
    await expect(first).resolves.toBe(snapshot);

    const failedRefresh = readSharedProgress(repository, true);
    rejectLoad(new Error('offline'));
    await expect(failedRefresh).rejects.toThrow('offline');
    expect(peekSharedProgress(repository)).toBe(snapshot);
  });
});
