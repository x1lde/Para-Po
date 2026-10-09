// General boarding guidance only. Do not use these entries as route or fare data.
export const commuterGuide = [
  {
    id: 'jeepney',
    title: 'Jeepneys',
    summary: 'Route signs, fares, and getting off',
    keywords: 'jeep jeepney dyip para bayad signboard cash stop',
    tips: [
      { title: 'Before boarding', text: 'Read the displayed route and ask whether the jeepney passes your destination. Similar-looking vehicles can serve different routes.' },
      { title: 'Paying for your ride', text: 'Tell the driver your destination and ask the fare. Keep small cash ready and check your change when it is returned.' },
      { title: 'Getting off', text: 'Let the driver know your stop in advance. “Para po” is a polite request to stop; wait until the vehicle has stopped at a safe unloading point.' },
    ],
  },
  {
    id: 'bus',
    title: 'Buses',
    summary: 'Boarding points and destination checks',
    keywords: 'bus coach terminal conductor ticket stop',
    tips: [
      { title: 'Find the boarding point', text: 'Use the designated bus stop or terminal. Check the destination sign and ask staff about the direction of travel.' },
      { title: 'Confirm your stop', text: 'Ask the driver or conductor whether the bus serves your stop before boarding. Confirm the fare and accepted payment method.' },
      { title: 'Keep your ticket', text: 'If a ticket or receipt is issued, keep it until the end of your ride. Prepare to exit only when the bus reaches the unloading stop.' },
    ],
  },
  {
    id: 'train',
    title: 'Trains',
    summary: 'Platform direction, tickets, and exits',
    keywords: 'train rail mrt lrt station platform ticket card',
    tips: [
      { title: 'Check the direction', text: 'Find your destination on the station map and check the platform direction before entering. Ask station staff if you are unsure.' },
      { title: 'Prepare your ticket', text: 'Check the current ticket or card options at the station. Keep your ticket or card accessible for the entry and exit gates.' },
      { title: 'Board and exit calmly', text: 'Let passengers leave before boarding and keep doorways clear. Check the station exit signs before leaving for your destination.' },
    ],
  },
  {
    id: 'tricycle',
    title: 'Tricycles',
    summary: 'Local trips and agreeing on the fare',
    keywords: 'tricycle trike sidecar terminal local cash',
    tips: [
      { title: 'Confirm the destination', text: 'Tell the driver the exact place or nearby landmark you want to reach. Ask whether it is within the area they serve.' },
      { title: 'Agree before you go', text: 'Ask the total fare before boarding. Clarify whether it is per passenger or for the trip, and whether the ride is shared.' },
      { title: 'Plan your return', text: 'Ask where the nearest pickup point is for the return journey. Keep your belongings secure and wait for the vehicle to stop before exiting.' },
    ],
  },
] as const;
