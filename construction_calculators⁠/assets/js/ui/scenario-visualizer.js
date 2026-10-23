/**
 * @fileoverview Компонент векторной визуализации строительных конструкций (SVG).
 * Чертёжный стиль: текст строго параллелен размерным линиям и стрелкам.
 */

export class ScenarioVisualizer {
  /**
   * @param {HTMLElement} container - DOM-элемент для вывода схемы
   */
  constructor(container) {
    this.container = container;
  }

  /**
   * Отрисовывает схему соответствующего сценария.
   * @param {string} scenarioKey
   */
  render(scenarioKey) {
    if (!this.container) return;

    let svgContent = '';

    switch (scenarioKey) {
      case 'slab':
        svgContent = this.getSlabSvg();
        break;
      case 'stripFoundationA':
        svgContent = this.getStripFoundationASvg();
        break;
      case 'stripFoundationB':
        svgContent = this.getStripFoundationBSvg();
        break;
      case 'wallWithOpenings':
        svgContent = this.getWallSvg();
        break;
      case 'circularColumn':
        svgContent = this.getCircularColumnSvg();
        break;
      case 'rectangularColumn':
        svgContent = this.getRectangularColumnSvg();
        break;
      case 'rectangularVolume':
        svgContent = this.getRectangularVolumeSvg();
        break;
      default:
        svgContent = '';
    }

    this.container.innerHTML = `
      <div class="visualizer-card">
        <div class="visualizer-graphic">
          ${svgContent}
        </div>
      </div>
    `;
  }

  /* Общие маркеры стрелок и стили текста */
  getSharedDefs() {
    return `
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#2563eb"/>
        </marker>
        <style>
          .dim-text {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 11px;
            font-weight: 700;
            fill: #1d4ed8;
            text-anchor: middle;
            paint-order: stroke fill;
            stroke: #f1f5f9;
            stroke-width: 3.5px;
            stroke-linejoin: round;
          }
          .dim-line {
            stroke: #2563eb;
            stroke-width: 1.5;
          }
        </style>
      </defs>
    `;
  }

  /* 1. Плита */
  getSlabSvg() {
    return `
      <svg viewBox="0 0 320 180" class="schema-svg" aria-label="Схема монолитной плиты">
        ${this.getSharedDefs()}
        <!-- Грани плиты -->
        <polygon points="40,85 160,35 280,75 160,125" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
        <polygon points="40,85 160,125 160,145 40,105" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
        <polygon points="160,125 280,75 280,95 160,145" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
        
        <!-- Длина (L): угол ~18° -->
        <line x1="30" y1="112" x2="150" y2="152" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="90" y="145" class="dim-text" transform="rotate(18.4, 90, 145)">Длина (L)</text>

        <!-- Ширина (W): угол ~ -22° -->
        <line x1="170" y1="152" x2="290" y2="102" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="230" y="140" class="dim-text" transform="rotate(-22.6, 230, 140)">Ширина (W)</text>

        <!-- Толщина (T): вертикально -90° -->
        <line x1="295" y1="75" x2="295" y2="95" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="310" y="85" class="dim-text" transform="rotate(-90, 310, 85)">Толщина</text>
      </svg>
    `;
  }

  /* 2. Лента Режим А (Эффективная длина) */
  getStripFoundationASvg() {
    return `
      <svg viewBox="0 0 320 180" class="schema-svg" aria-label="Схема ленточного фундамента (эффективная длина)">
        ${this.getSharedDefs()}
        <!-- Участок ленты -->
        <polygon points="50,65 230,20 270,40 90,85" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
        <polygon points="50,65 90,85 90,145 50,125" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
        <polygon points="90,85 270,40 270,100 90,145" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>

        <!-- Ширина ленты (b): угол ~26° -->
        <line x1="42" y1="60" x2="82" y2="80" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="62" y="66" class="dim-text" transform="rotate(26.5, 62, 66)">Ширина (b)</text>

        <!-- Высота ленты (h): вертикально -90° -->
        <line x1="38" y1="67" x2="38" y2="125" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="24" y="96" class="dim-text" transform="rotate(-90, 24, 96)">Высота (h)</text>

        <!-- Суммарная эффективная длина: угол ~ -14° -->
        <line x1="98" y1="155" x2="278" y2="110" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="188" y="146" class="dim-text" transform="rotate(-14, 188, 146)">Суммарная длина (L)</text>
      </svg>
    `;
  }

  /* 3. Лента Режим B (Контур с внутренними лентами) */
  getStripFoundationBSvg() {
    return `
      <svg viewBox="0 0 340 195" class="schema-svg" aria-label="Схема ленточного фундамента с перемычкой">
        ${this.getSharedDefs()}

        <!-- 1. Дно внутренних колодцев (грунт) -->
        <polygon points="104,82 170,52 192,62 126,92" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>
        <polygon points="148,102 214,72 236,82 170,112" fill="#f8fafc" stroke="#94a3b8" stroke-width="1"/>

        <!-- 2. Внутренние вертикальные грани лент (глубина) -->
        <!-- Задняя внутренняя стенка левого колодца -->
        <polygon points="104,82 170,52 170,70 104,100" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
        <!-- Правая внутренняя стенка перемычки -->
        <polygon points="214,72 148,102 148,120 214,90" fill="#cbd5e1" stroke="#475569" stroke-width="1.2"/>

        <!-- 3. Наружные вертикальные грани фундамента -->
        <!-- Левая наружная грань -->
        <polygon points="60,82 170,132 170,167 60,117" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
        <!-- Правая наружная грань -->
        <polygon points="170,132 280,82 280,117 170,167" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>

        <!-- 4. Верхняя горизонтальная плоскость (периметр и перемычка) -->
        <polygon points="60,82 170,32 280,82 170,132" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
        <!-- Проёмы колодцев -->
        <polygon points="104,82 170,52 192,62 126,92" fill="#f1f5f9" stroke="#475569" stroke-width="1.5"/>
        <polygon points="148,102 214,72 236,82 170,112" fill="#f1f5f9" stroke="#475569" stroke-width="1.5"/>
        <!-- Верхняя грань внутренней перемычки -->
        <polygon points="192,62 214,72 148,102 126,92" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>

        <!-- 5. РАЗМЕРНЫЕ ЛИНИИ И СТРЕЛКИ -->

        <!-- Высота ленты (h): вертикально слева -->
        <line x1="42" y1="82" x2="42" y2="117" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="28" y="102" class="dim-text" transform="rotate(-90, 28, 102)">Высота (h)</text>

        <!-- Наружная длина (L): вдоль левой нижней грани -->
        <line x1="48" y1="125" x2="158" y2="175" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="103" y="157" class="dim-text" transform="rotate(18.4, 103, 157)">Наружная длина (L)</text>

        <!-- Наружная ширина (W): вдоль правой нижней грани -->
        <line x1="182" y1="175" x2="292" y2="125" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="237" y="157" class="dim-text" transform="rotate(-22.6, 237, 157)"> Наружная ширина (W)</text>

        <!-- Ширина ленты (b): на верхней грани правой ленты -->
        <line x1="205" y1="95" x2="225" y2="105" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="228" y="88" class="dim-text" transform="rotate(24.5, 228, 88)">Ширина (b)</text>
      </svg>
    `;
  }

  /* 4. Стена с проёмами */
  getWallSvg() {
    return `
      <svg viewBox="0 0 320 180" class="schema-svg" aria-label="Схема стены с проёмами">
        ${this.getSharedDefs()}
        <!-- Изометрия стены -->
        <polygon points="50,55 250,25 270,35 70,65" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
        <polygon points="50,55 70,65 70,145 50,135" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
        <polygon points="70,65 270,35 270,115 70,145" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>

        <!-- Проёмы -->
        <polygon points="100,80 140,74 140,105 100,111" fill="#f8fafc" stroke="#2563eb" stroke-width="1.5"/>
        <polygon points="180,68 220,62 220,122 180,128" fill="#f8fafc" stroke="#2563eb" stroke-width="1.5"/>

        <!-- Толщина стены: угол ~26° -->
        <line x1="48" y1="48" x2="68" y2="58" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="58" y="47" class="dim-text" transform="rotate(26.5, 58, 47)">Толщина</text>

        <!-- Высота стены (H): вертикально -90° -->
        <line x1="38" y1="58" x2="38" y2="135" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="24" y="96" class="dim-text" transform="rotate(-90, 24, 96)">Высота (H)</text>

        <!-- Длина стены (L): угол ~ -8.5° -->
        <line x1="70" y1="155" x2="270" y2="125" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="170" y="152" class="dim-text" transform="rotate(-8.5, 170, 152)">Длина стены (L)</text>
      </svg>
    `;
  }

  /* 5. Круглые колонны */
  getCircularColumnSvg() {
    return `
      <svg viewBox="0 0 320 180" class="schema-svg" aria-label="Схема круглой колонны">
        ${this.getSharedDefs()}
        <!-- Тело колонны -->
        <path d="M 120,45 L 120,135 A 40,15 0 0,0 200,135 L 200,45 Z" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
        <ellipse cx="160" cy="135" rx="40" ry="15" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
        <ellipse cx="160" cy="45" rx="40" ry="15" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>

        <!-- Диаметр (D): строго горизонтально над колонной -->
        <line x1="120" y1="22" x2="200" y2="22" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="160" y="16" class="dim-text">Диаметр (D)</text>

        <!-- Высота (H): вертикально -90° справа от колонны -->
        <line x1="215" y1="45" x2="215" y2="135" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="230" y="90" class="dim-text" transform="rotate(-90, 230, 90)">Высота (H)</text>
      </svg>
    `;
  }

  /* 6. Прямоугольные колонны */
  getRectangularColumnSvg() {
    return `
      <svg viewBox="0 0 320 180" class="schema-svg" aria-label="Схема прямоугольной колонны">
        ${this.getSharedDefs()}
        <!-- Грани колонны -->
        <polygon points="130,40 170,25 210,40 170,55" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
        <polygon points="130,40 170,55 170,145 130,130" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
        <polygon points="170,55 210,40 210,130 170,145" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>

        <!-- Сторона A: угол ~20° -->
        <line x1="120" y1="43" x2="160" y2="58" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="140" y="47" class="dim-text" transform="rotate(20.5, 140, 47)">Сторона A</text>

        <!-- Сторона B: угол ~ -20° -->
        <line x1="180" y1="58" x2="220" y2="43" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="200" y="47" class="dim-text" transform="rotate(-20.5, 200, 47)">Сторона B</text>

        <!-- Высота (H): вертикально -90° -->
        <line x1="225" y1="42" x2="225" y2="132" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="240" y="87" class="dim-text" transform="rotate(-90, 240, 87)">Высота (H)</text>
      </svg>
    `;
  }

  /* 7. Свободный объём */
  getRectangularVolumeSvg() {
    return `
      <svg viewBox="0 0 320 180" class="schema-svg" aria-label="Схема прямоугольного объёма">
        ${this.getSharedDefs()}
        <!-- Параллелепипед -->
        <polygon points="60,65 170,30 260,60 150,95" fill="#e2e8f0" stroke="#475569" stroke-width="2"/>
        <polygon points="60,65 150,95 150,145 60,115" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
        <polygon points="150,95 260,60 260,110 150,145" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>

        <!-- Высота (H): вертикально -90° -->
        <line x1="46" y1="65" x2="46" y2="115" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="32" y="90" class="dim-text" transform="rotate(-90, 32, 90)">Высота (H)</text>

        <!-- Длина (L): угол ~18° -->
        <line x1="50" y1="124" x2="140" y2="154" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="95" y="152" class="dim-text" transform="rotate(18.4, 95, 152)">Длина (L)</text>

        <!-- Ширина (W): угол ~ -17.5° -->
        <line x1="160" y1="154" x2="270" y2="119" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
        <text x="215" y="148" class="dim-text" transform="rotate(-17.6, 215, 148)">Ширина (W)</text>
      </svg>
    `;
  }
}
