import { useRouter } from 'expo-router';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { InfoSectionsScreen } from '../../screens/InfoSectionsScreen';
import { useVisitorContentViewModel } from '../../viewmodels/useAccessViewModels';

export default function HelpRoute() {
  const router = useRouter();
  const { helpSections } = useVisitorContentViewModel();

  return (
    <InfoSectionsScreen
      title="Ayuda y soporte"
      sections={helpSections}
      backLabel="Volver a ajustes"
      onBackPress={() => goBackWithinTabs(router)}
    />
  );
}
