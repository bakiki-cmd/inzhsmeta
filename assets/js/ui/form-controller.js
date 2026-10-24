/**
 * @fileoverview Контроллер полей ввода, интерактивных степперов (+/-) и подсказок.
 */

import { CONCRETE_GRADES, DEFAULT_GRADE_ID, getGradeById } from '../config/concrete-grades.js';

export class FormController {
  /**
   * @param {HTMLElement} fieldsContainer - Контейнер для динамических полей сценария
   * @param {HTMLFormElement} formElement - Корневой элемент формы
   */
  constructor(fieldsContainer, formElement) {
    this.fieldsContainer = fieldsContainer;
    this.formElement = formElement;
    this.currentScenarioId = 'slab';
    this.stripMode = 'A';
    this.innerStripsCount = 0;
    this.openingsCount = 0;

    this.initStepperDelegation();
    this.initGradeSync();
  }

  /**
   * Устанавливает активный сценарий и перерисовывает поля.
   */
  setScenario(scenarioId, stripMode = 'A') {
    this.currentScenarioId = scenarioId;
    this.stripMode = stripMode;
    this.renderScenarioFields();
  }

  /**
   * Шаблон поля со степпером (+ / -) и буквенным бейджем.
   */
  renderStepperField({ id, name, label, letter = '', value = '', placeholder = '', step = '0.5', min = '0', max = '1000', hint = '', isThickness = false }) {
    const letterHtml = letter ? `<span class="badge-letter">${letter}</span>` : '';
    const thicknessAttr = isThickness ? 'data-thickness-check="true"' : '';

    return `
      <div class="form-group">
        <label for="${id}">${letterHtml} ${label}</label>
        <div class="stepper-wrap">
          <button type="button" class="stepper-btn btn-minus" data-target="${id}" data-step="${step}" data-min="${min}" aria-label="Уменьшить">&minus;</button>
          <input 
            type="text" 
            inputmode="decimal" 
            id="${id}" 
            name="${name}" 
            value="${value}" 
            placeholder="${placeholder}" 
            data-step="${step}" 
            data-min="${min}" 
            data-max="${max}"
            ${thicknessAttr}
            required
          >
          <button type="button" class="stepper-btn btn-plus" data-target="${id}" data-step="${step}" data-max="${max}" aria-label="Увеличить">+</button>
        </div>
        ${hint ? `<small class="hint">${hint}</small>` : ''}
        ${isThickness ? `<div class="thickness-notice" id="${id}-notice" hidden></div>` : ''}
      </div>
    `;
  }

  renderScenarioFields() {
    if (!this.fieldsContainer) return;

    if (this.currentScenarioId === 'slab') {
      this.fieldsContainer.innerHTML = `
        <div class="form-grid">
          ${this.renderStepperField({ id: 'f-length', name: 'length', label: 'Длина плиты', letter: 'A', placeholder: '8', step: '0.5', min: '0.1', hint: 'В метрах. Например, 8 м' })}
          ${this.renderStepperField({ id: 'f-width', name: 'width', label: 'Ширина плиты', letter: 'B', placeholder: '6', step: '0.5', min: '0.1', hint: 'В метрах. Например, 6 м' })}
          ${this.renderStepperField({ id: 'f-thickness', name: 'thickness', label: 'Толщина плиты', letter: 'C', placeholder: '0.25', step: '0.05', min: '0.05', hint: '25 см = 0.25 м, 20 см = 0.2 м', isThickness: true })}
          ${this.renderStepperField({ id: 'f-count', name: 'count', label: 'Количество плит', value: '1', step: '1', min: '1', max: '1000', hint: 'Целое число' })}
        </div>
      `;
    } else if (this.currentScenarioId === 'stripFoundation') {
      if (this.stripMode === 'A') {
        this.fieldsContainer.innerHTML = `
          <div class="form-grid">
            ${this.renderStepperField({ id: 'f-eff-len', name: 'effectiveLength', label: 'Суммарная длина ленты', letter: 'L', placeholder: '36', step: '1', min: '0.5', hint: 'По осевым линиям' })}
            ${this.renderStepperField({ id: 'f-strip-w', name: 'width', label: 'Ширина ленты', letter: 'b', placeholder: '0.4', step: '0.05', min: '0.1', hint: '40 см = 0.4 м' })}
            ${this.renderStepperField({ id: 'f-strip-h', name: 'height', label: 'Высота ленты', letter: 'h', placeholder: '1.2', step: '0.1', min: '0.1', hint: 'Глубина + цоколь' })}
          </div>
        `;
      } else {
        this.innerStripsCount = 0;
        this.fieldsContainer.innerHTML = `
          <div class="form-grid">
            ${this.renderStepperField({ id: 'f-outer-len', name: 'outerLength', label: 'Наружная длина (L)', letter: 'L', placeholder: '10', step: '0.5', min: '0.5' })}
            ${this.renderStepperField({ id: 'f-outer-w', name: 'outerWidth', label: 'Наружная ширина (W)', letter: 'W', placeholder: '8', step: '0.5', min: '0.5' })}
            ${this.renderStepperField({ id: 'f-strip-w-b', name: 'width', label: 'Ширина ленты (b)', letter: 'b', placeholder: '0.4', step: '0.05', min: '0.1' })}
            ${this.renderStepperField({ id: 'f-strip-h-b', name: 'height', label: 'Высота ленты (h)', letter: 'h', placeholder: '1.2', step: '0.1', min: '0.1' })}
          </div>

          <div class="dynamic-section">
            <div class="dynamic-header">
              <span class="dynamic-title">Внутренние перемычки (ленты)</span>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-add-strip">+ Добавить ленту</button>
            </div>
            <div id="inner-strips-list" class="dynamic-list"></div>
          </div>
        `;
        this.bindStripListEvents();
      }
    } else if (this.currentScenarioId === 'wallWithOpenings') {
      this.openingsCount = 0;
      this.fieldsContainer.innerHTML = `
        <div class="form-grid">
          ${this.renderStepperField({ id: 'f-wall-len', name: 'length', label: 'Длина стены', letter: 'L', placeholder: '6', step: '0.5', min: '0.5' })}
          ${this.renderStepperField({ id: 'f-wall-t', name: 'thickness', label: 'Толщина стены', letter: 'T', placeholder: '0.2', step: '0.05', min: '0.05', hint: '20 см = 0.2 м' })}
          ${this.renderStepperField({ id: 'f-wall-h', name: 'height', label: 'Высота стены', letter: 'H', placeholder: '2.7', step: '0.1', min: '0.5' })}
        </div>

        <div class="dynamic-section">
          <div class="dynamic-header">
            <span class="dynamic-title">Оконные и дверные проёмы</span>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-opening">+ Добавить проём</button>
          </div>
          <div id="openings-list" class="dynamic-list"></div>
        </div>
      `;
      this.bindOpeningsEvents();
    } else if (this.currentScenarioId === 'circularColumn') {
      this.fieldsContainer.innerHTML = `
        <div class="form-grid">
          ${this.renderStepperField({ id: 'f-col-d', name: 'diameter', label: 'Диаметр колонны', letter: 'D', placeholder: '0.3', step: '0.05', min: '0.1', hint: '30 см = 0.3 м' })}
          ${this.renderStepperField({ id: 'f-col-h', name: 'height', label: 'Высота колонны', letter: 'H', placeholder: '3', step: '0.1', min: '0.5' })}
          ${this.renderStepperField({ id: 'f-col-c', name: 'count', label: 'Количество колонн', value: '1', step: '1', min: '1' })}
        </div>
      `;
    } else if (this.currentScenarioId === 'rectangularColumn') {
      this.fieldsContainer.innerHTML = `
        <div class="form-grid">
          ${this.renderStepperField({ id: 'f-side-a', name: 'sideA', label: 'Сторона A', letter: 'A', placeholder: '0.4', step: '0.05', min: '0.1' })}
          ${this.renderStepperField({ id: 'f-side-b', name: 'sideB', label: 'Сторона B', letter: 'B', placeholder: '0.4', step: '0.05', min: '0.1' })}
          ${this.renderStepperField({ id: 'f-col-rect-h', name: 'height', label: 'Высота колонны', letter: 'H', placeholder: '3', step: '0.1', min: '0.5' })}
          ${this.renderStepperField({ id: 'f-col-rect-c', name: 'count', label: 'Количество колонн', value: '1', step: '1', min: '1' })}
        </div>
      `;
    } else if (this.currentScenarioId === 'rectangularVolume') {
      this.fieldsContainer.innerHTML = `
        <div class="form-grid">
          ${this.renderStepperField({ id: 'f-vol-l', name: 'length', label: 'Длина (L)', letter: 'L', placeholder: '2', step: '0.5', min: '0.1' })}
          ${this.renderStepperField({ id: 'f-vol-w', name: 'width', label: 'Ширина (W)', letter: 'W', placeholder: '2', step: '0.5', min: '0.1' })}
          ${this.renderStepperField({ id: 'f-vol-h', name: 'height', label: 'Высота (H)', letter: 'H', placeholder: '1', step: '0.1', min: '0.1' })}
        </div>
      `;
    }

    this.bindThicknessLiveCheck();
  }

  /**
   * Делегирование событий степпера (+/-) на всю форму.
   */
  initStepperDelegation() {
    this.formElement.addEventListener('click', (e) => {
      const btn = e.target.closest('.stepper-btn');
      if (!btn) return;

      const targetId = btn.dataset.target;
      const input = this.formElement.querySelector(`#${targetId}`);
      if (!input) return;

      const step = parseFloat(btn.dataset.step) || 1;
      const min = parseFloat(btn.dataset.min);
      const max = parseFloat(btn.dataset.max);

      let currentVal = parseFloat(input.value.replace(',', '.'));
      if (isNaN(currentVal)) {
        currentVal = parseFloat(input.placeholder.replace(',', '.')) || 0;
      }

      const isPlus = btn.classList.contains('btn-plus');
      let newVal = isPlus ? currentVal + step : currentVal - step;

      // Округляем до 3 знаков, чтобы избежать артефактов float (0.1 + 0.2)
      newVal = Math.round(newVal * 1000) / 1000;

      if (!isNaN(min) && newVal < min) newVal = min;
      if (!isNaN(max) && newVal > max) newVal = max;

      input.value = String(newVal).replace('.', ',');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  /**
   * Живая подсказка-страховка для толщины плиты (> 0.8 м).
   */
  bindThicknessLiveCheck() {
    const thicknessInput = this.fieldsContainer.querySelector('[data-thickness-check="true"]');
    if (!thicknessInput) return;

    const noticeEl = this.fieldsContainer.querySelector(`#${thicknessInput.id}-notice`);
    if (!noticeEl) return;

    const checkValue = () => {
      const val = parseFloat(thicknessInput.value.replace(',', '.'));
      if (val > 0.8 && val <= 10) {
        const inCm = Math.round(val * 100);
        const intendedM = (val / 10).toFixed(2).replace('.', ',');
        noticeEl.innerHTML = `⚠️ Указана толщина <strong>${val} м (${inCm} см)</strong>. Если вы имели в виду ${Math.round(val * 10)} см, введите <strong>${intendedM}</strong>.`;
        noticeEl.hidden = false;
      } else {
        noticeEl.innerHTML = '';
        noticeEl.hidden = true;
      }
    };

    thicknessInput.addEventListener('input', checkValue);
    checkValue();
  }

  /**
   * Синхронизация селектора марок бетона и поля плотности.
   */
  initGradeSync() {
    const gradeSelect = this.formElement.querySelector('#f-grade');
    const densityInput = this.formElement.querySelector('#f-density');
    if (!gradeSelect || !densityInput) return;

    gradeSelect.addEventListener('change', () => {
      const grade = getGradeById(gradeSelect.value);
      if (grade && grade.density) {
        densityInput.value = grade.density;
      }
    });
  }

  bindStripListEvents() {
    const addBtn = this.fieldsContainer.querySelector('#btn-add-strip');
    const list = this.fieldsContainer.querySelector('#inner-strips-list');
    if (!addBtn || !list) return;

    addBtn.addEventListener('click', () => {
      if (this.innerStripsCount >= 20) return;
      const idx = this.innerStripsCount++;
      const item = document.createElement('div');
      item.className = 'dynamic-row';
      item.dataset.index = String(idx);
      item.innerHTML = `
        <div class="form-group flex-2">
          <label>Направление</label>
          <select name="innerStrips[${idx}].direction">
            <option value="alongLength">Вдоль длины (L)</option>
            <option value="acrossWidth">Вдоль ширины (W)</option>
          </select>
        </div>
        <div class="form-group flex-2">
          <label>Длина ленты, м</label>
          <input type="text" inputmode="decimal" name="innerStrips[${idx}].length" placeholder="Длина">
        </div>
        <button type="button" class="btn btn-remove btn-icon" title="Удалить" aria-label="Удалить ленту">✕</button>
      `;

      item.querySelector('.btn-remove').addEventListener('click', () => item.remove());
      list.appendChild(item);
    });
  }

  bindOpeningsEvents() {
    const addBtn = this.fieldsContainer.querySelector('#btn-add-opening');
    const list = this.fieldsContainer.querySelector('#openings-list');
    if (!addBtn || !list) return;

    addBtn.addEventListener('click', () => {
      if (this.openingsCount >= 100) return;
      const idx = this.openingsCount++;
      const item = document.createElement('div');
      item.className = 'dynamic-row';
      item.dataset.index = String(idx);
      item.innerHTML = `
        <div class="form-group flex-2">
          <label>Ширина, м</label>
          <input type="text" inputmode="decimal" name="openings[${idx}].width" placeholder="Ширина">
        </div>
        <div class="form-group flex-2">
          <label>Высота, м</label>
          <input type="text" inputmode="decimal" name="openings[${idx}].height" placeholder="Высота">
        </div>
        <div class="form-group flex-1">
          <label>Кол-во</label>
          <input type="text" inputmode="numeric" name="openings[${idx}].count" value="1">
        </div>
        <button type="button" class="btn btn-remove btn-icon" title="Удалить" aria-label="Удалить проём">✕</button>
      `;

      item.querySelector('.btn-remove').addEventListener('click', () => item.remove());
      list.appendChild(item);
    });
  }

  getRawValues() {
    const fd = new FormData(this.formElement);

    const gradeId = fd.get('concreteGrade') || DEFAULT_GRADE_ID;
    const grade = getGradeById(gradeId);

    const orderValues = {
      reservePercent: fd.get('reservePercent') ?? '5',
      densityKgM3: fd.get('densityKgM3') ?? (grade?.density ? String(grade.density) : '2415'),
      pricePerM3: fd.get('pricePerM3') ?? '',
      gradeName: grade ? grade.name : 'М300 (B22.5)'
    };

    const scenarioValues = {};

    if (this.currentScenarioId === 'stripFoundation' && this.stripMode === 'B') {
      scenarioValues.outerLength = fd.get('outerLength');
      scenarioValues.outerWidth = fd.get('outerWidth');
      scenarioValues.width = fd.get('width');
      scenarioValues.height = fd.get('height');
      scenarioValues.innerStrips = [];

      const rows = this.fieldsContainer.querySelectorAll('#inner-strips-list .dynamic-row');
      rows.forEach((row) => {
        const dirSelect = row.querySelector('select');
        const lenInput = row.querySelector('input');
        if (dirSelect && lenInput) {
          scenarioValues.innerStrips.push({
            direction: dirSelect.value,
            length: lenInput.value
          });
        }
      });
    } else if (this.currentScenarioId === 'wallWithOpenings') {
      scenarioValues.length = fd.get('length');
      scenarioValues.thickness = fd.get('thickness');
      scenarioValues.height = fd.get('height');
      scenarioValues.openings = [];

      const rows = this.fieldsContainer.querySelectorAll('#openings-list .dynamic-row');
      rows.forEach((row) => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 3) {
          scenarioValues.openings.push({
            width: inputs[0].value,
            height: inputs[1].value,
            count: inputs[2].value
          });
        }
      });
    } else {
      for (const [key, val] of fd.entries()) {
        if (!['reservePercent', 'densityKgM3', 'pricePerM3', 'concreteGrade'].includes(key)) {
          scenarioValues[key] = val;
        }
      }
    }

    return { scenarioValues, orderValues };
  }
}
