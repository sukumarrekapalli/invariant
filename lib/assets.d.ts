declare module '*?raw' {
  const content: string;
  export default content;
}

declare module 'nspell' {
  type Dictionary = { aff: string | Buffer; dic: string | Buffer };
  type Spell = {
    correct(word: string): boolean;
    suggest(word: string): string[];
  };
  export default function nspell(dictionary: Dictionary): Spell;
}
