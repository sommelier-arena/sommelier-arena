import { Injectable } from '@nestjs/common';
import { Session } from './interfaces/session.interface';

const ADJECTIVES = [
  'Tannic', 'Fruity', 'Oaky', 'Crisp', 'Bold',
  'Silky', 'Robust', 'Floral', 'Velvety', 'Mineral',
  'Earthy', 'Smoky', 'Spicy', 'Vivid', 'Amber',
  'Peaty', 'Briny', 'Zesty', 'Plummy', 'Mellow',
];

const NOUNS = [
  'Falcon', 'Barrel', 'Vine', 'Cork', 'Cellar',
  'Magnum', 'Chateau', 'Bouquet', 'Tannin', 'Grape',
  'Carafe', 'Terroir', 'Decanter', 'Cuvee', 'Goblet',
  'Riesling', 'Claret', 'Merlot', 'Shiraz', 'Pinot',
];

@Injectable()
export class PseudonymService {
  generate(session: Session): string {
    const used = new Set(
      Array.from(session.participants.values()).map((p) => p.pseudonym),
    );

    // 400 combinations >> 10 player max — loop is safe
    for (let i = 0; i < 400; i++) {
      const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
      const candidate = `${adj}${noun}`;
      if (!used.has(candidate)) return candidate;
    }

    // Unreachable with ≤10 players, but satisfies exhaustive coverage
    return `Wine${Math.floor(Math.random() * 9000) + 1000}`;
  }
}
