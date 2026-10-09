import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { AppIcon, BodyText, Card, Kicker, PrimaryButton, RouteField, ScreenFrame, VehiclePixelArt, typography, useAppColors } from '@/components/commuter-ui';
import { Radius, Space } from '@/constants/theme';

type PickerKind = 'origin' | 'destination';

export default function RideScreen() {
  const colors = useAppColors();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanFocused, setScanFocused] = useState(false);

  return (
    <ScreenFrame>
      <View style={[styles.mainLayout, wide ? styles.wideLayout : null]}>
        <View style={styles.planner}>
          <View style={styles.intro}>
            <Kicker>Makati commute guide</Kicker>
            <Text accessibilityRole="header" style={[typography.pageTitle, { color: colors.text }]}>Where are you headed?</Text>
            <BodyText>Start with a landmark. We’ll help you find a ride when verified route information is available.</BodyText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan a landmark. Recognition is not connected yet."
            onPress={() => setScanOpen(true)}
            onFocus={() => setScanFocused(true)}
            onBlur={() => setScanFocused(false)}
            style={({ pressed }) => [styles.scanCard, { backgroundColor: colors.primary, borderColor: colors.primary }, scanFocused ? { borderWidth: 3, borderColor: colors.gold } : null, pressed && styles.pressed]}>
            <View style={[styles.scanIcon, { backgroundColor: colors.primaryText }]}>
              <AppIcon name="camera" size={23} color={colors.primary} />
            </View>
            <View style={styles.scanCopy}>
              <Text style={[styles.scanTitle, { color: colors.primaryText }]}>Scan a landmark</Text>
              <Text style={[styles.scanCaption, { color: colors.primaryText }]}>Find a nearby starting point</Text>
            </View>
            <AppIcon name="arrowRight" size={18} color={colors.primaryText} />
          </Pressable>

          <Card>
            <View style={styles.cardHeading}>
              <View style={[styles.stepBadge, { backgroundColor: colors.backgroundSelected }]}><AppIcon name="location" size={19} color={colors.primary} /></View>
              <View style={styles.headingCopy}>
                <Text style={[typography.sectionTitle, { color: colors.text }]}>Plan your ride</Text>
                <BodyText>Choose two verified Makati landmarks.</BodyText>
              </View>
            </View>
            <View style={styles.fields}>
              <RouteField label="Starting point" icon="location" onPress={() => setPicker('origin')} />
              <RouteField label="Destination" icon="destination" onPress={() => setPicker('destination')} />
            </View>
            <PrimaryButton label="Find my ride" icon="arrowRight" disabled />
            <View style={[styles.infoBox, { backgroundColor: colors.backgroundSelected }]}>
              <AppIcon name="info" size={16} color={colors.plum} />
              <BodyText style={styles.infoText}>Verified landmark search and ride recommendations aren’t connected yet. Your trip can’t be planned until they’re available.</BodyText>
            </View>
          </Card>

          <View style={styles.rideTypes}>
            <Text style={[styles.rideTypesTitle, { color: colors.text }]}>Ride types we’re preparing for</Text>
            <View style={styles.typeRow}>
              {['Jeepney', 'E-jeep', 'Tricycle', 'Bus'].map((type) => (
                <View key={type} style={[styles.typePill, { borderColor: colors.border, backgroundColor: colors.backgroundElement }]}>
                  <VehiclePixelArt mode={type as 'Jeepney' | 'E-jeep' | 'Tricycle' | 'Bus'} />
                  <Text style={[styles.typeText, { color: colors.textSecondary }]}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {wide ? <MapPreview /> : null}
      </View>

      <PlacePicker kind={picker} onClose={() => setPicker(null)} />
      <ScanNotice visible={scanOpen} onClose={() => setScanOpen(false)} onChooseOrigin={() => { setScanOpen(false); setPicker('origin'); }} />
    </ScreenFrame>
  );
}

function MapPreview() {
  const colors = useAppColors();
  return (
    <View style={styles.previewColumn}>
      <Card>
        <View style={styles.previewTitleRow}>
          <View>
            <Kicker>Area preview</Kicker>
            <Text style={[typography.sectionTitle, { color: colors.text }]}>Makati map</Text>
          </View>
          <AppIcon name="map" size={22} color={colors.primary} />
        </View>
        <View style={[styles.mapPlaceholder, { backgroundColor: colors.backgroundSelected, borderColor: colors.border }]}>
          <View style={[styles.mapPlaceholderIcon, { backgroundColor: colors.surfaceRaised }]}>
            <AppIcon name="map" size={24} color={colors.textSecondary} />
          </View>
          <Text style={[styles.mapPlaceholderTitle, { color: colors.text }]}>Map data unavailable</Text>
          <Text style={[styles.mapPlaceholderCopy, { color: colors.textSecondary }]}>No map renderer or offline map assets are connected to this app.</Text>
        </View>
        <BodyText>Text directions will remain available when verified routes are connected.</BodyText>
      </Card>
    </View>
  );
}

function PlacePicker({ kind, onClose }: { kind: PickerKind | null; onClose: () => void }) {
  const colors = useAppColors();
  const label = kind === 'origin' ? 'Nasaan ka ngayon?' : 'Saan ang punta?';
  return (
    <Modal visible={kind !== null} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.scrim }]}>
        <View accessibilityViewIsModal accessibilityLabel="Landmark picker" style={[styles.sheet, { backgroundColor: colors.background }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.controlMuted }]} />
          <View style={styles.sheetHeading}>
            <View style={styles.headingCopy}>
              <Kicker>{kind === 'origin' ? 'Starting point' : 'Destination'}</Kicker>
              <Text accessibilityRole="header" style={[typography.sectionTitle, { color: colors.text }]}>{label}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close landmark search" onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.backgroundSelected }]}>
              <AppIcon name="close" size={17} color={colors.text} />
            </Pressable>
          </View>
          <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}>
            <AppIcon name="search" size={18} color={colors.textSecondary} />
            <TextInput accessibilityLabel="Search Makati landmarks" placeholder="Search Makati landmarks" placeholderTextColor={colors.textSecondary} editable={false} style={[styles.searchInput, { color: colors.text }]} />
          </View>
          <View style={[styles.emptyState, { backgroundColor: colors.backgroundElement }]}>
            <AppIcon name="locationOff" size={23} color={colors.plum} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Landmark directory unavailable</Text>
            <BodyText style={styles.emptyCopy}>A verified landmark list and search service haven’t been added yet. We can’t confirm a starting point or destination.</BodyText>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={[styles.secondaryButton, { borderColor: colors.border }]}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ScanNotice({ visible, onClose, onChooseOrigin }: { visible: boolean; onClose: () => void; onChooseOrigin: () => void }) {
  const colors = useAppColors();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.scrim }]}>
        <View accessibilityViewIsModal accessibilityRole="alert" style={[styles.dialog, { backgroundColor: colors.background }]}>
          <View style={[styles.dialogIcon, { backgroundColor: colors.backgroundSelected }]}>
            <AppIcon name="viewfinder" size={25} color={colors.plum} />
          </View>
          <Text accessibilityRole="header" style={[typography.sectionTitle, { color: colors.text }]}>Landmark scanning isn’t ready</Text>
          <BodyText>The recognition model and verified landmark directory aren’t connected. No camera permission was requested and no scan was started.</BodyText>
          <PrimaryButton label="Choose starting point" onPress={onChooseOrigin} icon="location" />
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mainLayout: { width: '100%', gap: Space.four },
  wideLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.seven },
  planner: { flex: 1, minWidth: 0, gap: Space.four },
  intro: { gap: Space.two, paddingTop: Space.four, paddingBottom: Space.two },
  scanCard: { borderWidth: 1, minHeight: 90, borderRadius: Radius.card, paddingHorizontal: Space.four, paddingVertical: Space.three, flexDirection: 'row', alignItems: 'center', gap: Space.three },
  scanIcon: { width: 48, height: 48, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  scanCopy: { flex: 1, gap: Space.one },
  scanTitle: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  scanCaption: { fontSize: 13, lineHeight: 18, opacity: 0.88 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: Space.three },
  stepBadge: { width: 42, height: 42, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  headingCopy: { flex: 1, gap: Space.one },
  fields: { gap: Space.two },
  infoBox: { padding: Space.three, borderRadius: Radius.medium, flexDirection: 'row', alignItems: 'flex-start', gap: Space.two },
  infoText: { flex: 1 },
  rideTypes: { gap: Space.two, paddingVertical: Space.two },
  rideTypesTitle: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.two },
  typePill: { borderWidth: 1, borderRadius: Radius.medium, minHeight: 58, paddingHorizontal: Space.two, paddingVertical: Space.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.one },
  typeText: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  previewColumn: { flex: 0.92, minWidth: 300, paddingTop: Space.four },
  previewTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mapPlaceholder: { minHeight: 300, borderWidth: 1, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', padding: Space.seven, gap: Space.two },
  mapPlaceholderIcon: { width: 52, height: 52, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', marginBottom: Space.two },
  mapPlaceholderTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  mapPlaceholderCopy: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 280 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', padding: Space.two },
  sheet: { width: '100%', maxWidth: 620, alignSelf: 'center', borderTopLeftRadius: Radius.large, borderTopRightRadius: Radius.large, borderBottomLeftRadius: Radius.medium, borderBottomRightRadius: Radius.medium, padding: Space.four, paddingBottom: Space.seven, gap: Space.four, maxHeight: '90%' },
  sheetHandle: { width: 42, height: 5, borderRadius: Radius.pill, alignSelf: 'center', marginBottom: Space.two },
  sheetHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Space.three },
  closeButton: { width: 48, height: 48, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  searchBox: { minHeight: 52, borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Space.three, flexDirection: 'row', alignItems: 'center', gap: Space.two },
  searchInput: { flex: 1, minHeight: 48, fontSize: 15 },
  emptyState: { borderRadius: Radius.medium, padding: Space.four, alignItems: 'center', gap: Space.two },
  emptyTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  emptyCopy: { textAlign: 'center', maxWidth: 380 },
  secondaryButton: { minHeight: 52, borderWidth: 1, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  dialog: { width: '100%', maxWidth: 430, alignSelf: 'center', borderRadius: Radius.large, padding: Space.five, gap: Space.three },
  dialogIcon: { width: 54, height: 54, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  pressed: { opacity: 0.78 },
});
