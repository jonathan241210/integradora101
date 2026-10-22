import { InfoSection, VisitorAccountSummary, VisitorPreferenceKey, VisitorPreferences } from '../models';
import {
  ABOUT_SECTIONS,
  ACCOUNT_DELETION_WARNING,
  DEFAULT_VISITOR_PREFERENCES,
  FORGOT_PASSWORD_NOTICE,
  HELP_SECTIONS,
  MOCK_VISITOR_ACCOUNT,
  PRIVACY_SECTIONS,
} from '../mocks/visitorAccess';

export type AccessGate = 'signedOut' | 'entered';

type Listener = () => void;

let gate: AccessGate = 'signedOut';
let preferences: VisitorPreferences = { ...DEFAULT_VISITOR_PREFERENCES };
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export const visitorAccessRepository = {
  getGate(): AccessGate {
    return gate;
  },
  enter() {
    gate = 'entered';
    emit();
  },
  leave() {
    gate = 'signedOut';
    emit();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getPreferences(): VisitorPreferences {
    return { ...preferences };
  },
  setPreference(key: VisitorPreferenceKey, value: boolean) {
    preferences = { ...preferences, [key]: value };
    emit();
  },
  getAccount(): VisitorAccountSummary {
    return { ...MOCK_VISITOR_ACCOUNT };
  },
  getAccountDeletionWarning(): string {
    return ACCOUNT_DELETION_WARNING;
  },
  getForgotPasswordNotice(): string {
    return FORGOT_PASSWORD_NOTICE;
  },
  getPrivacySections(): InfoSection[] {
    return PRIVACY_SECTIONS;
  },
  getHelpSections(): InfoSection[] {
    return HELP_SECTIONS;
  },
  getAboutSections(): InfoSection[] {
    return ABOUT_SECTIONS;
  },
  resetDemoState() {
    gate = 'signedOut';
    preferences = { ...DEFAULT_VISITOR_PREFERENCES };
    listeners.clear();
  },
};
