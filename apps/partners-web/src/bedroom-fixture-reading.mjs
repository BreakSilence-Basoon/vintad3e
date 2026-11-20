export function readingMinutes(language, text, imageCount) {
  const words = text.trim();
  const textMinutes = language === 'en' ? (words ? words.split(/\s+/u).length : 0) / 265 : text.replace(/\s/gu, '').length / 500;
  return Math.max(1, Math.ceil(textMinutes + imageCount * 10 / 60));
}
