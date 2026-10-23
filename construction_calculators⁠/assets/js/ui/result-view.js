/**
 * @fileoverview Модуль отображения строительной ведомости расчёта.
 */

import {
  formatVolumeM3,
  formatDimensionM,
  formatAreaM2,
  formatMassKg,
  formatMassTons,
  formatCurrencyRub
} from '../core/formatters.js';

export class ResultView {
  constructor(container) {
    this.container = container;
  }

  hide() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container.hidden = true;
    }
  }

  render(orderResult, steps = []) {
    if (!this.container) return;

    const {
      cleanVolumeM3,
      reservePercent,
      reserveVolumeM3,
      orderVolumeM3,
      gradeName,
      logistics,
      cleanMassKg,
      cleanMassTons,
      orderMassKg,
      orderMassTons,
      totalCost,
      structural
    } = orderResult;

    // 1. Строки конструктива (заменяем лабораторные термины на строительные)
    let structuralRowsHtml = '';
    if (structural && Array.isArray(structural.items)) {
      structuralRowsHtml = structural.items.map(item => {
        let valFormatted = item.value;
        if (item.unit === 'м²') valFormatted = formatAreaM2(item.value);
        else if (item.unit === 'м') valFormatted = formatDimensionM(item.value);
        else if (item.unit === 'м³') valFormatted = formatVolumeM3(item.value);

        // Упрощаем названия
        let cleanLabel = item.label
          .replace('Площадь подошвы (застройки)', 'Площадь основания')
          .replace('Площадь боковой опалубки', 'Площадь опалубки')
          .replace('Площадь подошвы ленты', 'Площадь опирания ленты');

        return `
          <tr class="report-row">
            <td class="col-label">${cleanLabel}</td>
            <td class="col-value">${valFormatted}</td>
          </tr>
        `;
      }).join('');
    }

    // 2. Логистика: количество миксеров
    let logisticsValueHtml = '—';
    if (logistics && logistics.mixersCount > 0) {
      if (logistics.mixersCount === 1) {
        logisticsValueHtml = `
          <strong>1 рейс</strong>
          <div class="val-sub">миксер ${formatVolumeM3(orderVolumeM3)}</div>
        `;
      } else {
        const remainderText = logistics.lastMixerVolume > 0 
          ? ` + 1 на ${formatVolumeM3(logistics.lastMixerVolume)}` 
          : '';
        logisticsValueHtml = `
          <strong>${logistics.mixersCount} рейса</strong>
          <div class="val-sub">${logistics.fullMixersCount} по ${logistics.mixerCapacityM3} м³${remainderText}</div>
        `;
      }
    }

    // 3. Строка стоимости
    const costRowHtml = totalCost !== null
      ? `
        <tr class="report-row row-cost-highlight">
          <td class="col-label">
            <strong>Стоимость бетона:</strong>
            <div class="label-sub">С учётом запаса ${reservePercent}%</div>
          </td>
          <td class="col-value val-cost"><strong>${formatCurrencyRub(totalCost)}</strong></td>
        </tr>
      `
      : '';

    // 4. Формула расчёта
    const stepsHtml = steps.length > 0
      ? `
        <div class="report-steps">
          <details class="steps-collapsible">
            <summary>Формула расчёта геометрии</summary>
            <ol class="steps-list">
              ${steps.map(s => `
                <li>
                  <span>${s.label}:</span>
                  <code>${s.expression} = <strong>${formatVolumeM3(s.value)}</strong></code>
                </li>
              `).join('')}
            </ol>
          </details>
        </div>
      `
      : '';

    // Итоговый каркас ведомости
    this.container.innerHTML = `
      <div class="report-card">
        
        <!-- Главный общий заголовок -->
        <div class="report-main-header">
          <h2 class="report-main-title">Результаты расчёта</h2>
          <span class="report-main-sub">Сводная строительная ведомость</span>
        </div>

        <!-- Таблица 1: Опалубка и конструкция -->
        <div class="report-section">
          <h3 class="section-title-sm">1. Опалубка и конструкция</h3>
          
          <table class="report-table">
            <tbody>
              <tr class="report-row row-accent">
                <td class="col-label"><strong>Объём конструкции</strong></td>
                <td class="col-value val-accent"><strong>${formatVolumeM3(cleanVolumeM3)}</strong></td>
              </tr>
              ${structuralRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Разделительная черта -->
        <hr class="report-divider">

        <!-- Таблица 2: Заказ бетона и доставка -->
        <div class="report-section">
          <h3 class="section-title-sm">2. Заказ и доставка бетона</h3>
          
          <table class="report-table">
            <tbody>
              <!-- Главная строка заказа -->
              <tr class="report-row row-order-highlight">
                <td class="col-label">
                  <strong>Бетон к заказу (запас ${reservePercent}%):</strong>
                  <div class="label-sub">+${formatVolumeM3(reserveVolumeM3)} на усадку и прокачку</div>
                </td>
                <td class="col-value val-order"><strong>${formatVolumeM3(orderVolumeM3)}</strong></td>
              </tr>
              
              <tr class="report-row">
                <td class="col-label">Марка бетона:</td>
                <td class="col-value"><strong>${gradeName}</strong></td>
              </tr>

              <tr class="report-row">
                <td class="col-label">Доставка (миксеры по ${logistics.mixerCapacityM3} м³):</td>
                <td class="col-value">${logisticsValueHtml}</td>
              </tr>

              <tr class="report-row">
                <td class="col-label">Общий вес бетона:</td>
                <td class="col-value">
                  <strong>${formatMassTons(orderMassTons)}</strong>
                  <div class="val-sub">${formatMassKg(orderMassKg)}</div>
                </td>
              </tr>

              ${costRowHtml}
            </tbody>
          </table>
        </div>

        ${stepsHtml}

      </div>
    `;

    this.container.hidden = false;
  }
}
