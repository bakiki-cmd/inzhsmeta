/**
 * @fileoverview Модуль отображения ошибок и предупреждений.
 * Разделы 4.2, 4.3 и 8.2 Мастер-спецификации v1.3.
 */

import { formatErrorMessage } from '../config/messages-ru.js';

export class MessageView {
  /**
   * @param {HTMLElement} errorContainer - Контейнер для вывода ошибок
   * @param {HTMLElement} warningContainer - Контейнер для вывода предупреждений
   */
  constructor(errorContainer, warningContainer) {
    this.errorContainer = errorContainer;
    this.warningContainer = warningContainer;
  }

  /**
   * Очищает сообщения об ошибках и снимает подсветку с полей формы.
   * @param {HTMLFormElement} [formElement]
   */
  clearErrors(formElement) {
    if (this.errorContainer) {
      this.errorContainer.innerHTML = '';
      this.errorContainer.hidden = true;
    }

    if (formElement) {
      const invalidInputs = formElement.querySelectorAll('.is-invalid');
      invalidInputs.forEach((el) => {
        el.classList.remove('is-invalid');
        el.removeAttribute('aria-invalid');
      });
    }
  }

  /**
   * Очищает блок предупреждений.
   */
  clearWarnings() {
    if (this.warningContainer) {
      this.warningContainer.innerHTML = '';
      this.warningContainer.hidden = true;
    }
  }

  /**
   * Отображает массив ошибок и подсвечивает соответствующие поля ввода.
   * @param {Array<{ field: string, code: string, params: object }>} errors
   * @param {HTMLFormElement} [formElement]
   */
  renderErrors(errors, formElement) {
    this.clearErrors(formElement);
    if (!errors || errors.length === 0 || !this.errorContainer) return;

    const list = document.createElement('ul');
    list.className = 'error-list';

    errors.forEach((err) => {
      const item = document.createElement('li');
      item.className = 'error-item';
      item.textContent = formatErrorMessage(err.code, err.params);
      list.appendChild(item);

      // Подсветка проблемного инпута
      if (formElement && err.field) {
        const input = formElement.querySelector(`[name="${err.field}"]`);
        if (input) {
          input.classList.add('is-invalid');
          input.setAttribute('aria-invalid', 'true');
        }
      }
    });

    this.errorContainer.appendChild(list);
    this.errorContainer.hidden = false;
  }

  /**
   * Отображает мягкие предупреждения, не блокирующие расчёт.
   * @param {Array<{ code: string, field: string|null, message: string }>} warnings
   */
  renderWarnings(warnings) {
    this.clearWarnings();
    if (!warnings || warnings.length === 0 || !this.warningContainer) return;

    const list = document.createElement('ul');
    list.className = 'warning-list';

    warnings.forEach((warn) => {
      const item = document.createElement('li');
      item.className = 'warning-item';
      item.textContent = warn.message;
      list.appendChild(item);
    });

    this.warningContainer.appendChild(list);
    this.warningContainer.hidden = false;
  }
}
