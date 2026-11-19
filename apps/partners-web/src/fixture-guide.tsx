import Link from 'next/link';
import { notFound } from 'next/navigation';
import { djFixtureDetail } from './dj-fixture-detail';

export function guideEnabled(env: string | undefined, value: string | undefined) {
  return env === 'development' && value === '1';
}

function GuideImage() {
  return <svg viewBox="0 0 800 500" width="800" height="500" style={{ maxWidth: '100%', height: 'auto' }} role="img" aria-label="공간 구성" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="500" fill="#eeece8" /><rect x="120" y="80" width="560" height="340" fill="#d7d3cd" /><circle cx="400" cy="250" r="112" fill="#b9b4ae" /></svg>;
}

const djCopy = {
  ko: { title: 'DJ 가이드', navigation: '가이드 탐색', back: 'DJ 가이드로', headings: ['공간 및 컨셉 가이드', '음악 및 무드 가이드', '촬영 안내', '장비 정보 및 기타 요구사항'], intro: '공간의 분위기와 공연 흐름을 함께 준비합니다.', space: '음악과 공간이 자연스럽게 어우러지는 시간을 만듭니다.', music: '공연의 흐름에 맞춰 음악을 준비해 주세요.', shoot: '촬영과 공유 범위는 공연 전에 함께 확인합니다.', gear: '공연 시간과 장비 구성을 미리 확인해 주세요.', lists: ['장비 구성', 'USB 사용 안내', '세션 타임', '촬영 및 업로드 안내', '무드 가이드', '의상 관련'], steps: ['장비 연결과 음량을 확인합니다.', '음악 파일을 준비합니다.', '공연 순서를 확인합니다.', '촬영 범위를 조율합니다.', '공연에 어울리는 분위기를 함께 만듭니다.', '편안한 복장을 준비합니다.'], house: '하우스 음악 가이드', rnb: 'R&B · 힙합 음악 가이드', tracks: ['첫 곡은 여유로운 흐름으로 시작합니다.', '공간의 분위기에 맞춰 곡을 이어갑니다.', '마지막 곡까지 흐름을 유지합니다.'] },
  en: { title: 'DJ Guide', navigation: 'Guide navigation', back: 'DJ guide', headings: ['Space and concept', 'Music and mood', 'Filming', 'Equipment and other requests'], intro: 'Prepare the atmosphere and the flow of the performance together.', space: 'Create a moment where music and space come together.', music: 'Prepare music that follows the flow of the performance.', shoot: 'Agree on filming and sharing before the performance.', gear: 'Check the performance time and equipment in advance.', lists: ['Equipment', 'Using a USB drive', 'Session time', 'Filming and sharing', 'Mood', 'Clothing'], steps: ['Check equipment connections and volume.', 'Prepare your music files.', 'Check the performance order.', 'Agree on the filming scope.', 'Create a mood that suits the performance.', 'Prepare comfortable clothing.'], house: 'House music guide', rnb: 'R&B and hip-hop music guide', tracks: ['Begin with an unhurried first track.', 'Follow the mood of the space.', 'Keep the flow through the final track.'] },
} as const;

const djKeys = ['ko', 'en', 'ko-house', 'en-house', 'ko-rnb-hiphop', 'en-rnb-hiphop'] as const;
function djHref(key: string) { return key === 'ko' ? '/guide/dj' : `/guide/dj/${key}`; }

export function DjFixtureGuide({ guideKey = 'ko' }: { guideKey?: string }) {
  if (!guideEnabled(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE) || !djKeys.some(key => key === guideKey)) notFound();
  const language = guideKey.startsWith('en') ? 'en' : 'ko';
  const copy = djCopy[language];
  const detail = djFixtureDetail[language];
  const suffix = guideKey.includes('-') ? guideKey.slice(2) : '';
  const isHouse = suffix === '-house';
  const title = suffix ? isHouse ? copy.house : copy.rnb : copy.title;
  return <><main className="partners-public-guide" lang={language}><nav className="partners-guide-links" aria-label={copy.navigation}>
    {suffix && <Link href={djHref(language)}>{copy.back}</Link>}
    <Link href={djHref(`ko${suffix}`)} lang="ko" hrefLang="ko" aria-current={language === 'ko' ? 'page' : undefined}>한국어</Link>
    <Link href={djHref(`en${suffix}`)} lang="en" hrefLang="en" aria-current={language === 'en' ? 'page' : undefined}>English</Link>
  </nav><article><h1>{title}</h1>{suffix ? <>{detail.genreParagraphs.map((paragraph, index) => <div key={paragraph}><p>{paragraph}</p><ul>{detail.genreItems.slice(index, index === detail.genreParagraphs.length - 1 ? (isHouse ? 10 : 12) : index + 1).map(item => <li key={item}>{item}</li>)}</ul></div>)}</> : <>
    <p>{copy.intro}</p><h2>{copy.headings[0]}</h2><p>{copy.space}</p><p>{detail.paragraphs[0]}</p><p>{detail.paragraphs[1]}</p><figure><GuideImage /></figure>
    <div className="partners-guide-columns" style={{ '--guide-columns': '1fr 1fr 1fr 1fr' } as React.CSSProperties}>{[0, 1, 2, 3].map(index => <div className="partners-guide-column" key={index}><figure><GuideImage /></figure></div>)}</div>
    <h2>{copy.headings[1]}</h2><p>{copy.music}</p><p>{detail.paragraphs[2]}</p><ul><li><Link href={djHref(`${language}-house`)}>{copy.house}</Link></li><li><Link href={djHref(`${language}-rnb-hiphop`)}>{copy.rnb}</Link></li></ul>
    <h2>{copy.headings[2]}</h2><p>{copy.shoot}</p><p>{detail.paragraphs[3]}</p><h2>{copy.headings[3]}</h2><p>{copy.gear}</p>{copy.lists.map((heading, index) => <div key={heading}><h3>{index + 1}) {heading}</h3><ul><li>{copy.steps[index]}</li>{detail.extras[index].map(item => <li key={item}>{item}</li>)}</ul>{index === 0 && <><h3>{detail.caution}</h3><ul>{detail.cautionItems.map(item => <li key={item}>{item}</li>)}</ul></>}</div>)}
  </>}</article></main><footer className="public-footer"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p></div></footer></>;
}
