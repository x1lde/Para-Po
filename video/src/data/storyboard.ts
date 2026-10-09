export const FPS = 30;
export const TOTAL_FRAMES = 1800;
export const storyboard = [
  {id:'problem',from:0,duration:240,title:'Lost in Makati?'},
  {id:'reveal',from:240,duration:180,title:'Meet ParaPo!'},
  {id:'landmark',from:420,duration:300,title:'Start with what you see.'},
  {id:'destination',from:720,duration:240,title:"Know where you’re going."},
  {id:'boarding',from:960,duration:330,title:'Know where to board.'},
  {id:'offline',from:1290,duration:240,title:'Built for the moments you lose signal.'},
  {id:'closing',from:1530,duration:270,title:'Less guessing. More going.'},
] as const;
// Verbatim data snapshot; verified against the application JSON by scripts/verify.mjs.
export const demoJourney = {
  originId:'ayala_malls_circuit',destinationId:'one_ayala',
  origin:'Ayala Malls Circuit',destination:'One Ayala',
  board:'The CityFlats Circuit loading point',
  route:'Circuit Makati–One Ayala P2P',alight:'One Ayala terminal',
};
