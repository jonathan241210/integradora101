import { useRouter } from 'expo-router';
import { InfoSectionsScreen } from '../../screens/InfoSectionsScreen';
import { useVisitorContentViewModel } from '../../viewmodels/useAccessViewModels';

export default function AboutRoute() {
  const router = useRouter();
  const { aboutSections } = useVisitorContentViewModel();

  return (
    <InfoSectionsScreen
      title="Acerca de ARCA-NB"
      sections={aboutSections}
      backLabel="Volver a ajustes"
      onBackPress={() => router.back()}
    />
  );
}
