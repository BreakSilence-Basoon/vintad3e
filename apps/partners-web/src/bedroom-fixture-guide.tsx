import { notFound } from 'next/navigation';
import { guideEnabled } from './fixture-guide';
import { BedroomFixtureControls, BedroomFixtureCopy } from './bedroom-fixture-controls';
import { BedroomFixtureGallery } from './bedroom-fixture-gallery';
import { BedroomFixtureContents, BedroomFixtureMiniMap } from './bedroom-fixture-contents';
import { bedroomFixtureDetail } from './bedroom-fixture-detail';

const copy = {
  ko: { brief: '작가 브리프', contents: '목차', skip: '본문으로 건너뛰기', top: '맨 위로', sections: ['빈타제 소개', 'proj. bedroom 개요', '전시 구성', '전시 진행 프로세스', '공간의 분위기 및 비주얼 방향', '그래픽 아카이브', '참여 작가에게 요청드리는 사항', '빈타제 제공 사항', '공간 정보', '판매 및 정산 기준', '정산 안내', '프로젝트 비전'], paragraphs: ['작품과 이야기를 함께 소개하는 공간입니다.', '작가의 작업을 가까이에서 만날 수 있는 전시를 만듭니다.', '작품의 구성과 전시 기간을 함께 정합니다.', '전시 준비부터 마무리까지 일정을 함께 확인합니다.', '작품과 공간의 분위기가 어우러지도록 준비합니다.', '작품을 기록하고 이야기를 나눕니다.', '전시에 필요한 작품과 자료를 함께 확인합니다.', '전시 운영에 필요한 내용을 협의합니다.', '공간의 구성과 설치 위치를 미리 확인합니다.', '판매와 정산 조건은 협업 전에 함께 정합니다.', '판매 내역과 지급 일정을 함께 확인합니다.', '서로의 작업이 더 많은 사람에게 닿도록 함께합니다.'], revenue: '판매 금액 배분', artist: '작가', partner: '빈타제', schedule: ['작품과 전시 방향을 확인합니다.', '전시 준비와 설치를 진행합니다.', '전시 종료 후 정산을 진행합니다.'] },
  en: { brief: 'Artist Brief', contents: 'Contents', skip: 'Skip to content', top: 'Back to top', sections: ['About vintad3e', 'About proj. bedroom', 'Exhibition', 'Exhibition process', 'Space and visual direction', 'Graphic archive', 'For participating artists', 'What we provide', 'Space information', 'Sales and settlement', 'Settlement schedule', 'Project vision'], paragraphs: ['A space for sharing works and their stories.', 'An exhibition that brings artists and visitors together.', 'We agree on the works and exhibition dates.', 'We review the schedule from preparation through closing.', 'We prepare the space to complement the work.', 'We document the work and share its story.', 'We review the materials needed for the exhibition.', 'We agree on what is needed to run the exhibition.', 'We review the space and installation positions.', 'Sales and settlement terms are agreed in advance.', 'We review sales and the payment schedule together.', 'We work together to share the work with more people.'], revenue: 'Sales distribution', artist: 'Artist', partner: 'vintad3e', schedule: ['Review the works and exhibition direction.', 'Prepare and install the exhibition.', 'Settle accounts after the exhibition.'] },
  ja: { brief: 'アーティスト向けブリーフ', contents: '目次', skip: '本文へスキップ', top: 'ページの先頭へ', sections: ['빈타제について', 'proj. bedroomについて', '展示構成', '展示の流れ', '空間とビジュアル', 'グラフィックアーカイブ', '参加アーティストへのお願い', '提供するもの', '空間情報', '販売と精算', '精算のご案内', 'プロジェクトのビジョン'], paragraphs: ['作品とその物語を共に紹介する空間です。', '作家と来場者をつなぐ展示を作ります。', '作品の構成と展示期間を一緒に決めます。', '準備から終了までの予定を確認します。', '作品に合う空間を準備します。', '作品を記録し、その物語を伝えます。', '展示に必要な作品と資料を確認します。', '展示運営に必要な内容を相談します。', '空間の構成と設営位置を確認します。', '販売と精算の条件を事前に決めます。', '販売内容と支払い日程を確認します。', '作品をより多くの人に届けます。'], revenue: '売上の分配', artist: 'アーティスト', partner: '빈타제', schedule: ['作品と展示の方向を確認します。', '展示の準備と設営を行います。', '展示終了後に精算します。'] },
} as const;

const details = {
  ko: [['의류', '작품과 어울리는 의류를 함께 선보입니다.'], ['음악', '공간에 어울리는 음악을 준비합니다.'], ['음료·음식', '전시와 어울리는 자리를 준비합니다.'], ['전시', '작품을 소개하는 전시를 함께 만듭니다.'], ['전시 작품', '전시에 필요한 작품을 함께 정합니다.'], ['그래픽', '전시에 사용할 그래픽을 준비합니다.'], ['인터뷰 및 사진', '작품을 소개할 자료를 함께 준비합니다.']],
  en: [['Clothing', 'We share clothing that complements the work.'], ['Music', 'We prepare music for the space.'], ['Food and drinks', 'We prepare a gathering for the exhibition.'], ['Exhibition', 'We create an exhibition together.'], ['Exhibition works', 'We agree on the works for the exhibition.'], ['Graphics', 'We prepare graphics for the exhibition.'], ['Interview and photos', 'We prepare material to introduce the work.']],
  ja: [['衣類', '作品に合う衣類を一緒に紹介します。'], ['音楽', '空間に合う音楽を準備します。'], ['飲食', '展示に合う場を準備します。'], ['展示', '作品を紹介する展示を一緒に作ります。'], ['展示作品', '展示に必要な作品を一緒に決めます。'], ['グラフィック', '展示に使うグラフィックを準備します。'], ['インタビューと写真', '作品を紹介する資料を一緒に準備します。']],
} as const;

export function BedroomFixtureGuide({ language }: { language: string }) {
  if (!guideEnabled(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE) || !Object.hasOwn(copy, language)) notFound();
  const lang = language as keyof typeof copy;
  const text = copy[lang];
  const detail = bedroomFixtureDetail[lang];
  const headings = text.sections.map((heading, index) => ({ id: `section-${index + 1}`, text: heading }));
  const expanded: string[][] = [[], [...detail.overview, detail.quote], [...detail.exhibition], [detail.processTitle, ...detail.process], [...detail.directions], [...detail.archive], [], [...detail.provided], [...detail.space, ...detail.spaceNotes], detail.cases.flatMap(item => [item.title, ...item.items]), [...detail.quarters.map(([quarter, date]) => `${quarter}: ${date}`), detail.settlementNote], []];
  const markdown = [`# proj.bedroom`, ...text.sections.flatMap((heading, index) => [`## ${heading}`, text.paragraphs[index], ...expanded[index], ...(index === 0 ? details[lang].slice(0, 4).map(([title, body]) => `- ${title}: ${body}`) : index === 6 ? details[lang].slice(4).map(([title, body]) => `- ${title}: ${body}`) : []), ...(index === 3 ? text.schedule.map((item, step) => `${step + 1}. ${item}`) : []), ...(index === 9 ? [`${text.revenue}: ${text.artist} 60% / ${text.partner} 40%`] : [])])].join('\n\n');
  return <div className="bedroom-guide" lang={lang} id="bedroom-top"><a className="bedroom-skip" href="#bedroom-content">{text.skip}</a>
    <main id="bedroom-content" tabIndex={-1}><div className="bedroom-title"><h1>proj.bedroom</h1><div className="bedroom-title-meta"><p>{text.brief}</p></div></div>
      <div className="bedroom-reading"><div className="bedroom-article"><BedroomFixtureContents headings={headings} label={text.contents} />
        <article aria-label={text.brief}>{text.sections.map((heading, index) => <section key={heading} aria-labelledby={`section-${index + 1}`}><h2 id={`section-${index + 1}`}>{heading}</h2><p>{text.paragraphs[index]}</p>
          {(index === 0 || index === 6) && details[lang].slice(index === 0 ? 0 : 4, index === 0 ? 4 : 7).map(([title, body], detailIndex) => <details className="bedroom-intro-toggle" id={`guide-disclosure-${index === 0 ? detailIndex : detailIndex + 4}`} key={title}><summary>{title}<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 9 6 6 6-6" /></svg></summary><p>{body}</p></details>)}
          {index === 1 && <>{detail.overview.map(item => <p key={item}>{item}</p>)}<blockquote>{detail.quote}</blockquote></>}
          {index === 2 && detail.exhibition.map(item => <p className="bedroom-exhibition-line" key={item}>{item}</p>)}
          {index === 3 && <ol className="bedroom-schedule">{text.schedule.map((item, step) => <li key={item}><span className="bedroom-schedule-time">{step + 1}</span><ul className="bedroom-schedule-tasks"><li>{item}</li></ul></li>)}</ol>}
          {index === 3 && <><h3>{detail.processTitle}</h3><ul>{detail.process.map(item => <li key={item}>{item}</li>)}</ul></>}
          {index === 4 && <ul className="bedroom-visual-directions">{detail.directions.map(item => <li key={item}>{item}</li>)}</ul>}
          {index === 5 && detail.archive.map(item => <p key={item}>{item}</p>)}
          {index === 7 && <ul className="bedroom-provided">{detail.provided.map((item, itemIndex) => <li key={item}>{item}{itemIndex === 1 && <BedroomFixtureGallery language={lang} count={1} />}</li>)}</ul>}
          {index === 8 && <>{detail.space.map((item, itemIndex) => <div className="bedroom-photo-section" key={item}><h3 className="bedroom-detail-label">{item}</h3>{detail.spaceNotes[itemIndex] && <p className="bedroom-photo-note">{detail.spaceNotes[itemIndex]}</p>}{itemIndex < 5 && <BedroomFixtureGallery language={lang} count={[3, 2, 2, 2, 1][itemIndex]} />}</div>)}<ol className="bedroom-image-legend">{detail.spaceNotes.map((item, itemIndex) => <li key={item}><span className="bedroom-legend-number" aria-hidden="true">{'①②③④⑤'[itemIndex]}</span><div>{item}</div></li>)}</ol></>}
          {index === 9 && detail.cases.map(item => <div className="bedroom-settlement-case" key={item.title}><h3>{item.title}</h3><ul>{item.items.map(line => <li key={line}>{line}</li>)}</ul></div>)}
          {index === 9 && <div className="bedroom-revenue"><div className="bedroom-revenue-bar"><div><span>{text.artist}</span><strong>60<small>%</small></strong></div><div><span>{text.partner}</span><strong>40<small>%</small></strong></div></div><p className="bedroom-revenue-label">{text.revenue}</p></div>}
          {index === 10 && <div className="bedroom-royalties"><dl>{detail.quarters.map(([quarter, date]) => <div key={quarter}><dt>{quarter}</dt><dd>{date}</dd></div>)}</dl><p className="bedroom-photo-note">{detail.settlementNote}</p></div>}
        </section>)}</article></div></div></main>
    <footer className="public-footer bedroom-footer"><div className="public-footer__inner"><p className="public-footer__copyright">© 2026 빈타제</p><BedroomFixtureCopy language={lang} markdown={markdown} /></div></footer><BedroomFixtureMiniMap headings={headings} label={text.contents} /><BedroomFixtureControls language={lang} label={lang === 'ko' ? '언어 선택' : lang === 'ja' ? '言語を選択' : 'Select language'} top={text.top} />
  </div>;
}
