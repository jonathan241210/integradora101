import { useRouter } from 'expo-router';
import { InfoSectionsScreen } from '../../screens/InfoSectionsScreen';
import { useVisitorContentViewModel } from '../../viewmodels/useAccessViewModels';

export default function PrivacyRoute() {
  const router = useRouter();
  const { privacySections } = useVisitorContentViewModel();

  return (
    <InfoSectionsScreen
      title="Aviso de privacidad"
      intro="Explicación de demostración. El aviso oficial lo publicará el zoológico."
      sections={privacySections}
      backLabel="Volver a ajustes"
      onBackPress={() => router.back()}
    />
  );
}
