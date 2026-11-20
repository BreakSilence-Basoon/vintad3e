const unsafe = /[\\\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]/gu;
export function escapeConfirmationText(value: string): string {
  return value.replace(unsafe, character => {
    if (character === '\\') return '\\\\';
    const point = character.codePointAt(0)!;
    const hex = point.toString(16).toUpperCase();
    return point <= 0xffff ? `\\u${hex.padStart(4, '0')}` : `\\u{${hex}}`;
  });
}
export function confirmationPayloadText(value: unknown): string {
  return JSON.stringify(value, null, 2).split('\n').map(escapeConfirmationText).join('\n');
}
