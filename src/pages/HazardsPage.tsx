// Space Hazards: справочная страница о пяти факторах риска космического полёта (NASA HRP),
// рисках для здоровья и мониторинге радиации (CSA). Английский текст — оригинал источников,
// русский — перевод. Ссылки ведут на первоисточники.
import { Brain, ExternalLink, Globe2, Orbit, Radiation, Warehouse } from 'lucide-react'
import { Card, PageHeader } from '../components/ui'
import { tr } from '../lib/i18n'

const HAZARDS = () => [
  { icon: Radiation, name: tr('Космическое излучение', 'Space radiation'), url: 'https://www.nasa.gov/hrp/hazard-space-radiation/' },
  { icon: Brain, name: tr('Изоляция и замкнутость', 'Isolation and confinement'), url: 'https://www.nasa.gov/hrp/hazard-isolation-and-confinement/' },
  { icon: Globe2, name: tr('Удалённость от Земли', 'Distance from Earth'), url: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/' },
  { icon: Orbit, name: tr('Гравитация (и её отсутствие)', 'Gravity (and the lack of it)'), url: 'https://www.nasa.gov/hrp/hazard-gravity-fields/' },
  { icon: Warehouse, name: tr('Замкнутая или враждебная среда', 'Closed or hostile environments'), url: 'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/' },
]

function Source({ label, url }: { label: string; url?: string }) {
  return (
    <p className="mt-4 border-t border-space-700 pt-2 text-xs text-ink-mute">
      {tr('Источник', 'Source')}:{' '}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
          {label} <ExternalLink size={11} />
        </a>
      ) : (
        <span className="text-ink-dim">{label}</span>
      )}
    </p>
  )
}

export default function HazardsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title={tr('Факторы риска', 'Space Hazards')}
        subtitle={tr('Пять факторов риска полёта человека к Марсу и мониторинг радиации', 'The five hazards of a human journey to Mars and radiation monitoring')}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {HAZARDS().map(({ icon: Icon, name, url }, i) => (
          <a key={url} href={url} target="_blank" rel="noreferrer" className="panel group p-4 transition hover:border-accent/60">
            <div className="flex items-center justify-between">
              <Icon size={22} className="text-accent" aria-hidden />
              <span className="font-mono text-[11px] text-ink-mute">0{i + 1}</span>
            </div>
            <div className="mt-3 text-sm font-medium leading-snug group-hover:text-accent">{name}</div>
          </a>
        ))}
      </div>

      <Card title={tr('О пяти факторах риска', 'About the Five Hazards')}>
        <div className="space-y-3 text-sm leading-relaxed text-ink-dim">
          <p>
            {tr(
              'Полёт человека к Марсу на первый взгляд таит в себе бесконечное множество сложностей. Чтобы превратить такую миссию к Красной планете из фантастики в реальность, Программа исследований человека NASA (Human Research Program) выделила пять факторов риска, с которыми астронавты столкнутся в пути: космическое излучение, изоляция и замкнутость, удалённость от Земли, гравитация (и её отсутствие), а также замкнутая или враждебная среда.',
              'A human journey to Mars, at first glance, offers an inexhaustible amount of complexities. To bring such a mission to the Red Planet from fiction to fact, NASA’s Human Research Program has pinpointed five hazards that astronauts will encounter on their journeys. These include space radiation, isolation and confinement, distance from Earth, gravity (and the lack of it), and closed or hostile environments.',
            )}
          </p>
          <p>
            {tr(
              'Объединение проблем пилотируемых полётов в категории позволяет организованно преодолевать препятствия, стоящие перед такой миссией. Однако эти факторы не существуют по отдельности: они могут подпитывать друг друга и усиливать воздействие на организм человека. Это изучается с помощью наземных аналогов, лабораторий и Международной космической станции — все они служат испытательными площадками для оценки работоспособности человека и эффективности стратегий, которые помогут сохранить здоровье и безопасность астронавтов в космосе.',
              'Pooling the challenges of human spaceflight into categories allows for an organized effort to overcome the obstacles that lay before such a mission. However, these hazards do not stand alone. They can feed off one another and exacerbate effects on the human body, which are being studied using ground-based analogs, laboratories, and the International Space Station. These locations all serve as test beds to evaluate human performance, as well as the effectiveness of strategies that could keep astronauts safe and healthy in space.',
            )}
          </p>
          <p>
            {tr(
              'Благодаря тщательным исследованиям NASA получает ценные сведения о том, как тело и психика человека могут реагировать во время длительных полётов в космос. Полученные данные, технологии и методы образуют банк знаний, на основе которого учёные могут делать выводы для многолетних межпланетных миссий.',
              'Through meticulous research, NASA is gaining valuable insight into how the human body and mind might respond during extended forays into space. The resulting data, technology, and methods serve as a knowledge bank from which scientists can extrapolate to multi-year interplanetary missions.',
            )}
          </p>
        </div>
        <Source label="NASA Human Research Program — 5 Hazards of Human Spaceflight" url="https://www.nasa.gov/hrp/hazards/" />
      </Card>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Card title={tr('О рисках пилотируемых полётов', 'About Human Spaceflight Risks')}>
          <p className="text-sm leading-relaxed text-ink-dim">
            {tr(
              'Программа исследований человека NASA определила ряд конкретных рисков для здоровья человека, связанных с пятью факторами риска космического полёта. Последствия этих рисков различаются в зависимости от того, куда летят люди: на низкую околоземную орбиту, на Луну или на Марс.',
              'NASA’s Human Research Program has identified several specific risks to human health associated with five hazards of spaceflight. The effects of these risks vary depending on whether humans are traveling to low Earth orbit, the Moon, or Mars.',
            )}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center font-mono text-[11px] uppercase tracking-wider">
            {[tr('Низкая орбита', 'Low Earth orbit'), tr('Луна', 'Moon'), tr('Марс', 'Mars')].map((d) => (
              <div key={d} className="rounded-lg border border-space-700 bg-space-950/60 px-2 py-2 text-ink-dim">
                {d}
              </div>
            ))}
          </div>
          <Source label="NASA Human Research Program — Risks of Human Spaceflight" url="https://www.nasa.gov/hrp/risks/" />
        </Card>

        <Card
          title={tr('Мониторинг радиации для здоровья астронавтов', 'Monitoring radiation for astronaut health')}
          action={<span className="font-mono text-[11px] text-ink-mute">2026-02-26</span>}
        >
          <div className="space-y-3 text-sm leading-relaxed text-ink-dim">
            <p>
              {tr(
                'Радиация — одна из ключевых проблем для астронавтов, живущих и работающих за пределами защитного щита атмосферы Земли. По мере того как Канада и её международные партнёры продвигают планы миссий на Луну, а затем и на Марс, CSA продолжает инвестировать в технологии, позволяющие лучше понимать уровни облучения.',
                'Radiation is one of the key challenges faced by astronauts living and working beyond the protective shield of Earth’s atmosphere. As Canada and its international partners advance plans for missions to the Moon, and eventually Mars, the CSA continues to invest in technology to better understand exposure levels.',
              )}
            </p>
            <p>
              {tr(
                'CSA заключило контракт на 5,5 млн долларов с компанией Bubble Technology Industries на дальнейшую разработку CANS — компактного автономного прибора для измерения нейтронного облучения в космосе.',
                'The CSA has awarded a contract of $5.5 million to Bubble Technology Industries for the continued development of the CANS, a compact and autonomous instrument designed to measure neutron radiation exposure in space.',
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-space-700 bg-space-950/60 p-3">
                <div className="font-mono text-2xl font-semibold text-medium">~30%</div>
                <div className="text-xs text-ink-mute">{tr('доля нейтронов в общей радиации на МКС', 'neutron share of total radiation on the ISS')}</div>
              </div>
              <div className="rounded-lg border border-space-700 bg-space-950/60 p-3">
                <div className="font-mono text-2xl font-semibold text-accent">25+</div>
                <div className="text-xs text-ink-mute">{tr('лет МКС как испытательной площадки', 'years of the ISS as a test bed')}</div>
              </div>
            </div>
            <p>
              {tr(
                'Нейтронное излучение, на которое приходится около 30% всей радиации на МКС, особенно опасно: оно может вызывать серьёзные биологические повреждения и требует специальных мер защиты. Более 25 лет МКС служит испытательной площадкой для новых технологий. Канада обладает большим опытом экспериментов по регистрации радиации на МКС, включая MOSFET, EVARM, Radi-N и Radi-N2.',
                'Neutron radiation, which contributes to about 30% of total radiation on the ISS, is especially harmful because it can cause serious biological damage and require specialized protective measures. For over 25 years, the ISS has been a test bed for new technology. Canada has significant expertise in radiation detection experiments on the ISS, including MOSFET, EVARM and Radi-N and Radi-N2.',
              )}
            </p>
            <p>
              {tr(
                'CANS превосходит прежние методы регистрации радиации уникальным сочетанием возможностей: он работает непрерывно и автономно. Собранные данные помогут разработать более эффективные меры снижения рисков для здоровья астронавтов, а также могут найти применение на Земле — в лучевой терапии рака, радиационной защите экипажей самолётов, обнаружении ядерных угроз, обеспечении общественной безопасности и других областях.',
                'CANS improves upon previous radiation detection methods with the unique combined capabilities of working continuously and autonomously. Data collected could help develop better measures to reduce risks for astronauts’ health and also has potential applications on Earth, including cancer therapy, radiation protection for aircrews, nuclear threat detection and public safety, among others.',
              )}
            </p>
          </div>
          <Source label={tr('Канадское космическое агентство (CSA), новость от 26.02.2026', 'Canadian Space Agency (CSA), news release, 2026-02-26')} />
        </Card>
      </div>

      <p className="text-xs text-ink-mute">
        {tr(
          'Английский текст приведён по материалам NASA и CSA; русский — перевод. StarTime+ отслеживает часть этих факторов: радиацию (Radiation Tracking), сон и изоляцию (Sleep Monitoring), физиологические показатели (Live Monitoring).',
          'English text is quoted from NASA and CSA materials. StarTime+ tracks several of these factors: radiation (Radiation Tracking), sleep and isolation (Sleep Monitoring) and vital signs (Live Monitoring).',
        )}
      </p>
    </div>
  )
}
