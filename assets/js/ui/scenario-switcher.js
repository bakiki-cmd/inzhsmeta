/**
 * @fileoverview Компонент переключения сценариев расчёта фундамента.
 * Сетка 2x2, чтение query-параметров (?mode=...) и выбор режимов ленты.
 */

import { CONCRETE_SCENARIO_LIST } from '../calculator-registry.js';

export const FOUNDATION_GROUPS = [
  {
    id: 'slab',
    title: 'Плитный',
    sub: 'Плиты, УШП',
    scenarioId: 'slab',
    // Иконка монолитной плиты
    iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M3 9l9-4 9 4-9 4-9-4z"/>
      <path d="M3 9v6l9 4 9-4V9"/>
      <path d="M12 13v6"/>
    </svg>`
  },
  {
    id: 'stripFoundation',
    title: 'Ленточный',
    sub: 'Лента, перемычки',
    scenarioId: 'stripFoundation',
    // Иконка контура ленты
    iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="3" y="5" width="18" height="14" rx="0"/>
      <rect x="7" y="8" width="10" height="8" rx="0"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
    </svg>`
  },
  {
    id: 'pile',
    title: 'Свайный / Столбы',
    sub: 'Опоры, сваи',
    scenarioId: 'circularColumn',
    // Иконка сваи с оголовком
    iconSvg: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M4 6h16v3H4z"/>
      <path d="M7 9v11"/>
      <path d="M17 9v11"/>
      <path d="M12 9v11"/>
    </svg>`
  }
];


export class ScenarioSwitcher {
  /**
   * @param {HTMLElement} navContainer - Контейнер для кнопок сценариев
   * @param {HTMLElement} subNavContainer - Контейнер подрежимов ленты (Режим A / B)
   * @param {(scenarioKey: string, stripMode: 'A'|'B') => void} onScenarioChange - Коллбэк при смене сценария
   */
  constructor(navContainer, subNavContainer, onScenarioChange) {
    this.navContainer = navContainer;
    this.subNavContainer = subNavContainer;
    this.onScenarioChange = onScenarioChange;

    this.activeScenario = 'slab';
    this.activeStripMode = 'B'; // По умолчанию удобный Режим B (внешний контур + перемычки)

    this.readUrlParams();
    this.render();
  }

  /**
   * Считывание ?mode=... из адресной строки при переходе с каталога
   */
  readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');

    if (!mode) return;

    if (mode === 'stripFoundationA') {
      this.activeScenario = 'stripFoundation';
      this.activeStripMode = 'A';
    } else if (mode === 'stripFoundationB' || mode === 'stripFoundation' || mode === 'strip') {
      this.activeScenario = 'stripFoundation';
      this.activeStripMode = 'B';
    } else if (mode === 'slab') {
      this.activeScenario = 'slab';
    } else if (mode === 'circularColumn' || mode === 'pile') {
      this.activeScenario = 'circularColumn';
    } else if (mode === 'wallWithOpenings' || mode === 'wall') {
      this.activeScenario = 'wallWithOpenings';
    } else if (CONCRETE_SCENARIO_LIST.some((sc) => sc.id === mode)) {
      this.activeScenario = mode;
    }
  }

    render() {
    if (!this.navContainer) return;

    this.navContainer.innerHTML = `
      <div class="group-cards-grid" role="tablist" aria-label="Тип фундамента">
        ${FOUNDATION_GROUPS.map((group) => {
          const isActive = this.isGroupActive(group);
          return `
            <button 
              type="button" 
              role="tab" 
              class="group-card-btn ${isActive ? 'active' : ''}" 
              data-group-id="${group.id}"
              data-scenario="${group.scenarioId}"
              aria-selected="${isActive}"
            >
              <div class="group-card-icon" aria-hidden="true">
                ${group.iconSvg}
              </div>
              <div class="group-card-text">
                <span class="group-card-title">${group.title}</span>
                <span class="group-card-sub">${group.sub}</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    `;

    this.bindEvents();
    this.renderSubNav();
    this.notify();
  }


  isGroupActive(group) {
    if (group.id === 'stripFoundation') {
      return this.activeScenario === 'stripFoundation';
    }
    return this.activeScenario === group.scenarioId;
  }

  bindEvents() {
    const buttons = this.navContainer.querySelectorAll('.group-card-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetScenario = btn.dataset.scenario;
        if (targetScenario && targetScenario !== this.activeScenario) {
          this.activeScenario = targetScenario;

          buttons.forEach((b) => {
            const isCur = b === btn;
            b.classList.toggle('active', isCur);
            b.setAttribute('aria-selected', String(isCur));
          });

          this.updateUrl();
          this.renderSubNav();
          this.notify();
        }
      });
    });
  }

  renderSubNav() {
    if (!this.subNavContainer) return;

    if (this.activeScenario === 'stripFoundation') {
      this.subNavContainer.hidden = false;
      this.subNavContainer.innerHTML = `
        <div class="sub-mode-switcher" role="radiogroup" aria-label="Метод расчёта ленты">
          <label class="sub-mode-label">
            <input type="radio" name="stripFoundationMode" value="B" ${this.activeStripMode === 'B' ? 'checked' : ''}>
            <span>Контур дома + перемычки</span>
          </label>
          <label class="sub-mode-label">
            <input type="radio" name="stripFoundationMode" value="A" ${this.activeStripMode === 'A' ? 'checked' : ''}>
            <span>По общей длине ленты</span>
          </label>
        </div>
      `;

      const radios = this.subNavContainer.querySelectorAll('input[name="stripFoundationMode"]');
      radios.forEach((r) => {
        r.addEventListener('change', (e) => {
          this.activeStripMode = e.target.value;
          this.updateUrl();
          this.notify();
        });
      });
    } else {
      this.subNavContainer.hidden = true;
      this.subNavContainer.innerHTML = '';
    }
  }

  updateUrl() {
    const scenarioKey = this.activeScenario === 'stripFoundation'
      ? (this.activeStripMode === 'A' ? 'stripFoundationA' : 'stripFoundationB')
      : this.activeScenario;

    const url = new URL(window.location.href);
    url.searchParams.set('mode', scenarioKey);
    window.history.replaceState({}, '', url.toString());
  }

  notify() {
    const scenarioKey = this.activeScenario === 'stripFoundation'
      ? (this.activeStripMode === 'A' ? 'stripFoundationA' : 'stripFoundationB')
      : this.activeScenario;

    this.onScenarioChange(scenarioKey, this.activeStripMode);
  }
}
