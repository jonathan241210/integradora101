import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Card, ScreenContainer } from '../components/ui';
import { InfoSection } from '../models';
import { colors, radius, spacing } from '../theme/tokens';

interface InfoSectionsScreenProps {
  title: string;
  intro?: string;
  sections: InfoSection[];
  onBackPress: () => void;
  backLabel: string;
}

export function InfoSectionsScreen({ title, intro, sections, onBackPress, backLabel }: InfoSectionsScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel={backLabel} />
        <AppText variant="heading">{title}</AppText>
        {intro ? <AppText variant="body" color="textMuted">{intro}</AppText> : null}
        {sections.map((section) => (
          <Card key={section.id} style={styles.card}>
            <AppText variant="subheading" bold>{section.title}</AppText>
            <AppText variant="body">{section.body}</AppText>
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, gap: spacing.sm, borderRadius: radius.lg },
});
