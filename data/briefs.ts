// data/briefs.ts

export interface Brief {
  id: number;
  text: string;
}

export const BRIEFS: Brief[] = [
  { id: 1,  text: "Logo: coffee shop on Mars" },
  { id: 2,  text: "Album cover: a sad robot" },
  { id: 3,  text: "Movie poster: haunted toaster" },
  { id: 4,  text: "Mascot: gym only for cats" },
  { id: 5,  text: "Cereal box: breakfast in 3025" },
  { id: 6,  text: "Tour poster: heavy metal grandmas" },
  { id: 7,  text: "Magazine cover: Vogue Pirate Edition" },
  { id: 8,  text: "Book cover: calculator-stapler romance" },
  { id: 9,  text: "Brand identity: hotel run by raccoons" },
  { id: 10, text: "Packaging: cereal by a horror director" },
  { id: 11, text: "Travel poster: holiday inside a microwave" },
  { id: 12, text: "Logo: startup that sells naps" },
  { id: 13, text: "Concert poster: medieval knight DJs" },
  { id: 14, text: "Children's book: an existential crisis" },
  { id: 15, text: "Mascot: fast-food chain only serving soup" },
  { id: 16, text: "Album cover: an underwater rave" },
  { id: 17, text: "Brand identity: funeral home for houseplants" },
  { id: 18, text: "Movie poster: goldfish detective noir" },
  { id: 19, text: "Logo: airline that only flies in circles" },
  { id: 20, text: "Magazine cover: Forbes Goblin Edition" },
  { id: 21, text: "Movie poster: Fast & Furious mobility scooters" },
  { id: 22, text: "Cereal box: designed by Salvador Dalí" },
  { id: 23, text: "Logo: co-working space inside a volcano" },
  { id: 24, text: "Album cover: lo-fi beats by a tired dad" },
  { id: 25, text: "Tour poster: folk band of mushrooms" },
  { id: 26, text: "Brand identity: dating app for ghosts" },
  { id: 27, text: "Movie poster: Pixar film about office printers" },
  { id: 28, text: "Mascot: bank that accepts only buttons" },
  { id: 29, text: "Album cover: opera performed by cats" },
  { id: 30, text: "Poster: wellness retreat run by clowns" },
];

export function pickRandomBriefs(count: number): Brief[] {
  return [...BRIEFS].sort(() => Math.random() - 0.5).slice(0, count);
}
