import { InfoSection, VisitorAccountSummary, VisitorPreferences } from '../models';

export const MOCK_VISITOR_ACCOUNT: VisitorAccountSummary = {
  displayName: 'María García',
  email: 'maria.garcia@correo.com',
};

export const DEFAULT_VISITOR_PREFERENCES: VisitorPreferences = {
  notifications: true,
  darkMode: false,
  location: true,
};

export const ACCOUNT_DELETION_WARNING =
  'En esta versión la cuenta solo existe en pantalla. Si eliminas la aplicación, no se podrá restaurar esta información.';

export const FORGOT_PASSWORD_NOTICE =
  'Si el correo está registrado, enviamos un código de 6 dígitos. En esta demostración el correo no se envía.';

export const PRIVACY_SECTIONS: InfoSection[] = [
  {
    id: 'collected',
    title: 'Qué datos recopila',
    body: 'En esta demostración, lo que escribes al crear la cuenta o iniciar sesión, y los interruptores de Ajustes, no se envían a un servidor ni se guardan en el teléfono. La ficha de María García es un ejemplo. Cuando la cuenta se conecte, la aplicación pedirá correo, contraseña y nombre de usuario. La contraseña no se conserva en la aplicación.',
  },
  {
    id: 'purpose',
    title: 'Para qué se utilizan',
    body: 'Esos datos servirán para crear la cuenta, iniciar sesión y, más adelante, conservar el progreso del visitante. Restablecer la contraseña usará un código de un solo uso enviado al correo. No hay inicio de sesión con Google.',
  },
  {
    id: 'protection',
    title: 'Cómo se protegen',
    body: 'La conexión prevista con el servidor es cifrada. La contraseña se guarda cifrada y los códigos de acceso solo como un resumen que no permite recuperarlos. Esta demostración no guarda sesión ni secretos en el dispositivo. Los interruptores no activan notificaciones, el tema oscuro ni la ubicación del teléfono.',
  },
  {
    id: 'rights',
    title: 'Cómo ejercer tus derechos',
    body: 'Puedes leer este aviso en Ajustes. En esta versión, eliminar la aplicación borra la demostración y no hay forma de restaurarla. Cuando la cuenta exista en el servidor, podrás pedir la supresión de tus datos. El Zoológico Municipal Nicolás Bravo publicará el aviso oficial y el canal para solicitar acceso, corrección o cancelación. Este texto no sustituye ese aviso.',
  },
];

export const HELP_SECTIONS: InfoSection[] = [
  {
    id: 'enter',
    title: 'Entrar a la aplicación',
    body: 'Iniciar sesión y Entrar como invitado abren el inicio. En esta versión no se comprueba una cuenta real.',
  },
  {
    id: 'account',
    title: 'Cuenta de visitante',
    body: 'Crear cuenta pide nombre de usuario, correo, contraseña y confirmación. La cuenta de esta demostración no se guarda: si eliminas la aplicación, no se puede restaurar.',
  },
  {
    id: 'password',
    title: 'Contraseña olvidada',
    body: 'Indica tu correo. El aviso no dice si ese correo existe. Después escribe un código de 6 dígitos y la nueva contraseña. En esta demostración el código no se envía; cualquiera de 6 dígitos permite continuar.',
  },
  {
    id: 'settings',
    title: 'Ajustes',
    body: 'Notificaciones, modo oscuro y ubicación solo cambian de estado en pantalla. La aplicación permanece en modo claro.',
  },
];

export const ABOUT_SECTIONS: InfoSection[] = [
  {
    id: 'app',
    title: 'Aplicación',
    body: 'ARCA-NB, versión 1.0.0. Descubre el zoológico como un explorador.',
  },
  {
    id: 'place',
    title: 'Lugar',
    body: 'Zoológico Municipal Nicolás Bravo, Tulancingo.',
  },
  {
    id: 'version',
    title: 'Qué es esta versión',
    body: 'Prototipo para recorrer el zoológico: inicio, mapa, escáner simulado, colección y perfil de ejemplo. La cuenta y los ajustes todavía no se guardan.',
  },
];
