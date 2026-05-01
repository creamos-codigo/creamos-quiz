// data/briefs.ts

export interface Brief {
  id: number;
  text: string;
}

export const BRIEFS: Brief[] = [
  { id: 1,  text: "Logo for a coffee shop on Mars" },
  { id: 2,  text: "Album cover for a sad robot" },
  { id: 3,  text: "Movie poster for a film about a haunted toaster" },
  { id: 4,  text: "Mascot for a gym that only trains cats" },
  { id: 5,  text: "Cereal box for breakfast in the year 3025" },
  { id: 6,  text: "Tour poster for a heavy metal band of grandmothers" },
  { id: 7,  text: "Magazine cover for 'Vogue: Pirate Edition'" },
  { id: 8,  text: "Book cover for a romance novel between a calculator and a stapler" },
  { id: 9,  text: "Brand identity for a luxury hotel run by raccoons" },
  { id: 10, text: "Packaging for cereal designed by a horror movie director" },
  { id: 11, text: "Travel poster for a vacation inside a microwave" },
  { id: 12, text: "Logo for a tech startup that sells naps" },
  { id: 13, text: "Concert poster for a DJ duo of medieval knights" },
  { id: 14, text: "Children's book cover about an existential crisis" },
  { id: 15, text: "Mascot for a fast food chain serving only soup" },
  { id: 16, text: "Album cover for an underwater rave" },
  { id: 17, text: "Brand identity for a funeral home for houseplants" },
  { id: 18, text: "Poster for a film noir starring a goldfish detective" },
  { id: 19, text: "Logo for an airline that only flies in circles" },
  { id: 20, text: "Magazine cover for 'Forbes: Goblin Edition'" },
  { id: 21, text: "Movie poster for 'Fast and Furious: Mobility Scooter Drift'" },
  { id: 22, text: "Cereal box for cereal designed by Salvador Dalí" },
  { id: 23, text: "Logo for a co-working space inside a volcano" },
  { id: 24, text: "Album cover for a lo-fi beats album by a sleep-deprived dad" },
  { id: 25, text: "Tour poster for a folk band of sentient mushrooms" },
  { id: 26, text: "Brand identity for a dating app for ghosts" },
  { id: 27, text: "Movie poster for a Pixar film about office printers" },
  { id: 28, text: "Mascot for a bank that only accepts buttons as currency" },
  { id: 29, text: "Album cover for an opera performed entirely by cats" },
  { id: 30, text: "Poster for a wellness retreat run by clowns" },
];

export function pickRandomBriefs(count: number): Brief[] {
  return [...BRIEFS].sort(() => Math.random() - 0.5).slice(0, count);
}