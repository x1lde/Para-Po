import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Art, Card, Icon, ui } from '@/components/commute/ui';
import { PressScale, Reveal } from '@/components/commute/motion';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDistance, MODE_LABELS, routeOf, TRANSIT_ATTRIBUTION, TRANSIT_DATA_DATE,
  type JourneyOption, type JourneyPlan, type TransitMode,
} from '../planner/journey-planner';

const MODE_ART: Record<TransitMode, 'jeepney' | 'ejeep' | 'bus'> = {
  jeepney: 'jeepney', 'e-jeepney': 'ejeep', bus: 'bus', p2p: 'bus', 'uv-express': 'bus',
};

/** Ranked ways to get from one landmark to another: walking, direct rides and one-transfer rides. */
export function JourneyOptions({ plan, selected = 0, onSelect, limit }: {
  plan: JourneyPlan; selected?: number; onSelect?: (index: number) => void; limit?: number;
}) {
  const t = useTheme();
  if (plan.status === 'unknown-place') {
    return <Card><ThemedText>Choose a supported starting point and destination.</ThemedText></Card>;
  }
  if (plan.status === 'same-place') {
    return <Card style={ui.row}><Icon name="check" /><View style={{ flex: 1 }}><ThemedText type="smallBold">You’re already at {plan.place.name}.</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">Choose another destination to plan a ride.</ThemedText></View></Card>;
  }
  const options = limit ? plan.options.slice(0, limit) : plan.options;
  return <View style={styles.list} accessibilityLiveRegion="polite">
    <View style={styles.heading}>
      <ThemedText type="smallBold">{plan.origin.name} → {plan.destination.name}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{formatDistance(plan.straightMeters)} apart · {plan.options.length} {plan.options.length === 1 ? 'way' : 'ways'} to go</ThemedText>
    </View>
    {options.map((option, index) => <Reveal key={`${plan.origin.id}-${plan.destination.id}-${index}`} delay={index * 90}>
      <OptionCard option={option} best={index === 0} selected={index === selected} onPress={onSelect ? () => onSelect(index) : undefined} />
    </Reveal>)}
    <View style={[ui.row, { alignItems: 'flex-start' }]}><Icon name="shield" size={15} color={t.textSecondary} />
      <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>Times are estimates with a typical wait, not schedules. Check the signboard before boarding. {TRANSIT_ATTRIBUTION} Data from {TRANSIT_DATA_DATE}.</ThemedText></View>
  </View>;
}

function OptionCard({ option, best, selected, onPress }: { option: JourneyOption; best: boolean; selected: boolean; onPress?: () => void }) {
  const t = useTheme();
  const [details, setDetails] = useState(false);
  const rides = option.legs.flatMap((leg) => leg.type === 'ride' ? [routeOf(leg.route)] : []);
  const title = rides.length === 0 ? 'Walk' : rides.map((route) => MODE_LABELS[route.mode]).join(' + ');
  const body = <>
    <View style={[ui.row, { alignItems: 'flex-start' }]}>
      <View style={[styles.badge, { backgroundColor: best ? t.yellow : t.soft }]}>
        {rides.length ? <Art name={MODE_ART[rides[0].mode]} size={38} /> : <Icon name="walk" size={26} color={t.onYellow} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={[ui.row, { flexWrap: 'wrap', gap: 6 }]}>
          {best && <View style={[styles.tag, { backgroundColor: t.orange }]}><ThemedText type="small" style={styles.tagText}>Best</ThemedText></View>}
          {option.kind === 'transfer' && <View style={[styles.tag, { backgroundColor: t.backgroundSelected }]}><ThemedText type="small" style={[styles.tagText, { color: t.primary }]}>1 transfer</ThemedText></View>}
          <ThemedText type="smallBold">{title}</ThemedText>
        </View>
        <ThemedText style={styles.minutes}>~{option.minutes} min</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{formatDistance(option.walkMeters)} of walking</ThemedText>
      </View>
    </View>
    <View style={styles.steps}>
      {option.legs.map((leg, i) => {
        const last = i === option.legs.length - 1;
        if (leg.type === 'walk') {
          if (leg.meters < 40 && option.legs.length > 1) return null;
          return <Step key={i} last={last} color={t.textSecondary} icon="walk"
            title={leg.text} detail={`${formatDistance(leg.meters)} · about ${leg.minutes} min`} />;
        }
        const route = routeOf(leg.route);
        return <Step key={i} last={last} color={t.primary} icon="bus"
          title={`${MODE_LABELS[route.mode]}: ${route.name}${route.ref ? ` (${route.ref})` : ''}`}
          detail={`Board at ${leg.board.name} · get off at ${leg.alight.name} · ${formatDistance(leg.meters)}, about ${leg.minutes} min with wait${route.note ? ` · ${route.note}` : ''}`} />;
      })}
    </View>
    {rides.length > 0 && <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)}
      style={({ pressed }) => [ui.row, styles.details, { opacity: pressed ? .65 : 1 }]}>
      <Icon name={details ? 'close' : 'book'} size={16} /><ThemedText type="link" style={{ fontSize: 14 }}>{details ? 'Hide route sources' : 'Route sources'}</ThemedText>
    </Pressable>}
    {details && rides.map((route) => <Pressable key={route.source} accessibilityRole="link" onPress={() => void Linking.openURL(route.source)}>
      <ThemedText type="small" themeColor="textSecondary">{route.name}{route.operator ? ` · ${route.operator}` : ''} · <ThemedText type="small" style={{ color: t.primary }}>{route.source.replace('https://', '')}</ThemedText></ThemedText>
    </Pressable>)}
  </>;
  const style = [styles.card, selected && onPress ? { borderColor: t.primary, borderWidth: 2 } : null];
  if (!onPress) return <Card style={style}>{body}</Card>;
  return <PressScale accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${title}, about ${option.minutes} minutes`} onPress={onPress}>
    <Card style={style}>{body}</Card>
  </PressScale>;
}

function Step({ title, detail, icon, color, last }: { title: string; detail: string; icon: 'walk' | 'bus'; color: string; last: boolean }) {
  const t = useTheme();
  return <View style={styles.step}>
    <View style={styles.rail}>
      <View style={[styles.dot, { backgroundColor: icon === 'bus' ? t.primary : t.backgroundElement, borderColor: color }]} />
      {!last && <View style={[styles.line, { backgroundColor: t.line }]} />}
    </View>
    <View style={{ flex: 1, paddingBottom: last ? 0 : 14, gap: 2 }}>
      <ThemedText type={icon === 'bus' ? 'smallBold' : 'small'}>{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{detail}</ThemedText>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  list: { gap: 14 }, heading: { gap: 2 },
  card: { gap: 14 },
  badge: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  tagText: { color: '#FFFFFF', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  minutes: { fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -.5 },
  steps: { gap: 0 }, step: { flexDirection: 'row', gap: 12 },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, marginTop: 4 },
  line: { width: 2, flex: 1, marginTop: 2 },
  details: { minHeight: 40, cursor: 'pointer' },
});
