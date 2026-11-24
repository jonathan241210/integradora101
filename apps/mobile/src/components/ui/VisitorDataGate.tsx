import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { Button } from './Button';
import { EmptyView, ErrorView, LoadingView } from './StateViews';
import { ScreenContainer } from './ScreenContainer';
import { spacing } from '../../theme/tokens';

export type VisitorDataStatus = 'loading' | 'guest' | 'error' | 'ready';

export const GUEST_TITLE = 'Inicia sesión para ver tu progreso';
export const GUEST_MESSAGE = 'Tu perfil, tus misiones, tus logros y tu colección se guardan en tu cuenta de visitante.';
export const GUEST_LOGIN_LABEL = 'Iniciar sesión';

interface NoticeProps {
  status: Exclude<VisitorDataStatus, 'ready'>;
  error?: string | null;
  loadingMessage?: string;
  onLogin: () => void;
  onRetry: () => void;
}

/** Estado vacío (sin sesión), de error con reintento o de carga para los datos del visitante. */
export function VisitorDataNotice({ status, error, loadingMessage = 'Cargando tus datos…', onLogin, onRetry }: NoticeProps) {
  if (status === 'loading') return <LoadingView message={loadingMessage} />;
  if (status === 'guest') {
    return (
      <View style={styles.guest}>
        <EmptyView title={GUEST_TITLE} message={GUEST_MESSAGE} />
        <Button label={GUEST_LOGIN_LABEL} onPress={onLogin} />
      </View>
    );
  }
  return (
    <ErrorView
      title="No se pudieron cargar tus datos"
      message={error ?? 'Revisa tu conexión e intenta de nuevo.'}
      onRetry={onRetry}
    />
  );
}

interface GateProps extends Omit<NoticeProps, 'status'> {
  status: VisitorDataStatus;
  title?: string;
  children: React.ReactNode;
}

/** Muestra `children` solo cuando hay datos reales; en otro caso, el aviso correspondiente. */
export function VisitorDataGate({ status, title, children, ...notice }: GateProps) {
  if (status === 'ready') return <>{children}</>;
  return (
    <ScreenContainer scroll={false}>
      <View style={styles.page}>
        {title ? <AppText variant="title">{title}</AppText> : null}
        <VisitorDataNotice status={status} {...notice} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, justifyContent: 'center' },
  guest: { gap: spacing.md, alignItems: 'stretch' },
});
