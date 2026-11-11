import { createVisitorApi } from '@arca/api-client';
import { createHttpAuthRepository } from '../src/repositories/httpAuthRepository';
import { achievementHowTo, createHttpProgressRepository, mapAchievement, mapMission } from '../src/repositories/progressRepository';
import { createMemoryTokenStorage } from '../src/services/tokenStorage';
import type { VisitorCatalogItemDto } from '@arca/api-client';

const mockApi = Object.fromEntries([
  'login','logout','refresh','privacyNotice','register','verifyEmail','resendVerification',
  'forgotPassword','resetPassword','me','updateProfile','changePassword','deleteAccount',
  'progress','collection','achievements','missions','discoveries',
].map(k => [k, jest.fn()]));
jest.mock('@arca/api-client', () => ({
  ...jest.requireActual('@arca/api-client'), createVisitorApi: jest.fn(() => mockApi),
}));
const tokens = { accessToken: 'access', refreshToken: 'refresh' };
const pair = { access_token: 'access', refresh_token: 'refresh' };
const progressDto = { points: 20, level: 1, rank: 'Explorador', next_threshold: null, discovered_species: 1, total_species: 3 };
const catalog: VisitorCatalogItemDto = {
  code: 'first', title: 'Primer logro', description: 'Explora', icon: 'paw', points: 10,
  rule_type: 'species_count', rule_target: 1, rule_param: null, progress: 1, state: 'pending',
  earned_at: null,
};
function error(status: number) {
  return Object.assign(new Error('Respuesta de prueba'), {name:'ApiError', status, code:'email_not_verified', retryAfterSeconds: 60});
}
beforeEach(() => { Object.values(mockApi).forEach(fn => fn.mockReset()); jest.mocked(createVisitorApi).mockClear(); });

describe('mobile-011 CA-05: repositorio HTTP de autenticación', () => {
  function setup() {
    const storage = createMemoryTokenStorage();
    const repo = createHttpAuthRepository({baseUrl:'https://api.example.test', storage});
    return {storage, repo, config: jest.mocked(createVisitorApi).mock.calls[0][0]};
  }
  it('lee credenciales, actualiza tokens y los elimina al vencer la sesión', async () => {
    const { storage, config } = setup();
    expect(await config.getAccessToken?.()).toBeNull();
    expect(await config.getRefreshToken?.()).toBeNull();
    await config.onTokens?.(tokens);
    expect(await config.getAccessToken?.()).toBe('access');
    expect(await config.getRefreshToken?.()).toBe('refresh');
    await config.onSessionExpired?.();
    expect(await storage.read()).toBeNull();
  });
  it.each([0,401,403,422,429,500])('traduce fallos HTTP %s sin ocultar el resultado', async status => {
    const {repo} = setup(); mockApi.login.mockRejectedValue(error(status));
    expect(await repo.login('a@example.test','secret')).toMatchObject({ok:false,status:status===500?422:status});
  });
  it('renueva y verifica tokens y cierra sesión aun si falla el servidor', async () => {
    const {repo,storage} = setup();
    mockApi.refresh.mockResolvedValue(pair);
    expect(await repo.refresh()).toEqual({ok:true,tokens});
    expect(await storage.read()).toEqual(tokens);
    mockApi.verifyEmail.mockResolvedValue(pair);
    expect(await repo.verifyEmail('a@example.test','123456')).toMatchObject({ok:true,status:200,tokens});
    mockApi.logout.mockRejectedValue(new Error('offline'));
    await repo.logout();
    expect(await storage.read()).toBeNull();
    mockApi.logout.mockClear();
    await repo.logout();
    expect(mockApi.logout).not.toHaveBeenCalled();
    mockApi.refresh.mockRejectedValue(error(401));
    expect(await repo.refresh()).toMatchObject({ok:false,status:401});
    expect(await storage.read()).toBeNull();
  });
  it('envía los datos de alta y completa recuperación y cambio de contraseña', async () => {
    const {repo} = setup();
    for (const name of ['register','resendVerification','forgotPassword','resetPassword','changePassword']) mockApi[name].mockResolvedValue({message:'Aceptado'});
    expect(await repo.register({email:'a@example.test',password:'secret',firstName:'Ana',nickname:'Anita',avatarCode:'jaguar',isAdult:true,privacyNoticeVersion:'v1'})).toMatchObject({ok:true,status:201});
    expect(mockApi.register).toHaveBeenCalledWith(expect.objectContaining({password_confirmation:'secret', first_name:'Ana', is_adult:true}));
    expect(await repo.resendVerification('a@example.test')).toMatchObject({ok:true,status:202});
    expect(await repo.forgotPassword('a@example.test')).toMatchObject({ok:true,status:202});
    expect(await repo.resetPassword('a@example.test','123456','new')).toMatchObject({ok:true,status:200});
    expect(await repo.changePassword('old','new')).toMatchObject({ok:true,status:200});
  });
  it('traduce errores de todas las operaciones y conserva credenciales ante borrado rechazado', async () => {
    const {repo,storage} = setup(); await storage.write(tokens);
    Object.values(mockApi).forEach(fn => fn.mockRejectedValue(error(422)));
    const outcomes = await Promise.all([
      repo.register({email:'a@example.test',password:'secret',firstName:'Ana',nickname:'A',avatarCode:'jaguar',isAdult:true,privacyNoticeVersion:'v1'}),
      repo.verifyEmail('a','123'), repo.resendVerification('a'), repo.forgotPassword('a'),
      repo.resetPassword('a','123','new'), repo.updateProfile({firstName:'Ana',nickname:'A',avatarCode:'jaguar'}),
      repo.changePassword('old','new'), repo.deleteAccount('wrong'),
    ]);
    outcomes.forEach(result => expect(result).toMatchObject({ok:false,status:422}));
    expect(await storage.read()).toEqual(tokens);
    expect(await repo.getPrivacyNotice()).toMatchObject({version:'2026-10'});
    mockApi.me.mockRejectedValueOnce(error(401));
    expect(await repo.getProfile()).toBeNull();
    mockApi.me.mockRejectedValueOnce(new Error('offline'));
    await expect(repo.getProfile()).rejects.toThrow('offline');
  });
});

describe('mobile-011 CA-05: progreso remoto y catálogos', () => {
  it.each(['species_count','enclosure_count','missions_completed'] as const)('describe retos %s, singulares, plurales y desbloqueados', rule_type => {
    for (const rule_target of [1,2,15]) for (const unlocked of [true,false]) {
      const text = achievementHowTo({...catalog,rule_type,rule_target},unlocked);
      expect(text).toMatch(unlocked ? /^(Descubriste|Exploraste|Completaste)/ : /^(Descubre|Explora|Completa)/);
      expect(text).not.toContain('undefined');
      if (rule_target===15) expect(text).toContain('15');
    }
  });
  it.each(['bird','mammal','reptile','amphibian','fish','insect',null])('describe categorías conocidas y desconocidas: %s', rule_param => {
    const locked = achievementHowTo({...catalog,rule_type:'category_species_count',rule_param},false);
    const unlocked = achievementHowTo({...catalog,rule_type:'category_species_count',rule_param,rule_target:2},true);
    expect(locked).toMatch(/^Descubre una especie/);
    expect(unlocked).toMatch(/^Descubriste dos especies/);
    expect(locked).not.toMatch(/\s+\./);
  });
  it('ofrece texto para reglas futuras y conserva campos de logros y misiones', () => {
    const future = {...catalog,rule_type:'future' as VisitorCatalogItemDto['rule_type']};
    expect(achievementHowTo(future,true)).toBe('Completaste el reto de este logro.');
    expect(achievementHowTo(future,false)).toBe('Completa el reto de este logro.');
    expect(mapAchievement(catalog)).toMatchObject({unlocked:false,earnedAt:undefined});
    expect(mapAchievement({...catalog,state:'unlocked',earned_at:'2026-11-09'})).toMatchObject({unlocked:true,earnedAt:'2026-11-09'});
    expect(mapMission(catalog).objective).toBe(catalog.description);
    expect(mapMission({...catalog,objective:'Visita recintos'}).objective).toBe('Visita recintos');
  });
  it('carga progreso, especies y catálogos; registra descubrimientos y preserva refresh tokens', async () => {
    const storage = createMemoryTokenStorage();
    const repo = createHttpProgressRepository({baseUrl:'https://api.example.test',storage});
    const config = jest.mocked(createVisitorApi).mock.calls[0][0];
    expect(await config.getAccessToken?.()).toBeNull(); expect(await config.getRefreshToken?.()).toBeNull();
    await config.onTokens?.({accessToken:'a',refreshToken:'r'});
    await config.onTokens?.({accessToken:'b'} as never);
    expect(await storage.read()).toEqual({accessToken:'b',refreshToken:'r'});
    expect(await config.getAccessToken?.()).toBe('b'); expect(await config.getRefreshToken?.()).toBe('r');
    mockApi.progress.mockResolvedValue(progressDto);
    mockApi.collection.mockResolvedValue([{id:1,common_name:'Jaguar',category:null,discovered:true,discovered_at:null}]);
    mockApi.achievements.mockResolvedValue([catalog]); mockApi.missions.mockResolvedValue([catalog]);
    expect(await repo.load()).toMatchObject({progress:{points:20},collection:[{commonName:'Jaguar'}],achievements:[{id:'first'}],missions:[{id:'first'}]});
    mockApi.discoveries.mockResolvedValue({result:'discovered',points_awarded:10,new_species:[{id:1,common_name:'Jaguar'}],already_known_species:[{id:2,common_name:'León'}],progress:progressDto});
    expect(await repo.discover({code:'ARCA-A',scannedAt:'2026-11-09',clientScanId:'id'})).toMatchObject({message:'Descubriste especies nuevas.',newSpecies:['Jaguar'],unlockedSpecies:[{id:'1',name:'Jaguar'}],alreadyKnownSpecies:[{id:'2',name:'León'}]});
    expect(mockApi.discoveries).toHaveBeenCalledWith({code:'ARCA-A',scanned_at:'2026-11-09',client_scan_id:'id'});
    await config.onSessionExpired?.();
    await config.onTokens?.({accessToken:'c'} as never);
    expect(await storage.read()).toEqual({accessToken:'c',refreshToken:''});
    mockApi.progress.mockRejectedValueOnce(new Error('offline'));
    await expect(repo.load()).rejects.toThrow('offline');
  });
});
