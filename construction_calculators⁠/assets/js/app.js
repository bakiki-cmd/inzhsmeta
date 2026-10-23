/**
 * @fileoverview Главная точка входа приложения калькулятора бетона.
 * Реализует четырёхслойную архитектуру, интерактивную визуализацию и управление состояниями.
 */

import { getScenario } from './calculator-registry.js';
import { calculateOrderResults } from './core/result-calculator.js';
import {
  validateReservePercent,
  validateDensity,
  validatePricePerM3
} from './core/validation.js';
import { parseNumberString } from './core/number-parser.js';

import { MessageView } from './ui/message-view.js';
import { ResultView } from './ui/result-view.js';
import { FormController } from './ui/form-controller.js';
import { ScenarioSwitcher } from './ui/scenario-switcher.js';
import { ScenarioVisualizer } from './ui/scenario-visualizer.js';

document.addEventListener('DOMContentLoaded', () => {
  const formElement = document.getElementById('calc-form');
  if (!formElement) return;

  const navContainer = document.getElementById('scenario-tabs-container');
  const subNavContainer = document.getElementById('sub-mode-container');
  const fieldsContainer = document.getElementById('dynamic-fields-container');
  const visualizerContainer = document.getElementById('scenario-visualizer');
  const errorsContainer = document.getElementById('form-errors');
  const warningsContainer = document.getElementById('form-warnings');
  const resultsContainer = document.getElementById('results-output');

  // Инициализация слоя UI
  const messageView = new MessageView(errorsContainer, warningsContainer);
  const resultView = new ResultView(resultsContainer);
  const formController = new FormController(fieldsContainer, formElement);
  const visualizer = new ScenarioVisualizer(visualizerContainer);

  let currentScenarioKey = 'slab';

  // Инициализация переключателя сценариев
  new ScenarioSwitcher(navContainer, subNavContainer, (scenarioKey, stripMode) => {
    currentScenarioKey = scenarioKey;

    // Скрываем старые результаты и ошибки при переключении
    resultView.hide();
    messageView.clearErrors(formElement);
    messageView.clearWarnings();

    // Отрисовываем SVG-схему для активного сценария
    visualizer.render(scenarioKey);

    const baseScenarioId = scenarioKey.startsWith('stripFoundation')
      ? 'stripFoundation'
      : scenarioKey;

    formController.setScenario(baseScenarioId, stripMode);
  });

  // Первичный запуск: отображаем схему плиты и её поля ввода
  visualizer.render('slab');
  formController.setScenario('slab', 'A');

  // Обработка отправки формы
  formElement.addEventListener('submit', (e) => {
    e.preventDefault();

    // 1. Мгновенно скрываем результат и сбрасываем подсветку ошибок
    resultView.hide();
    messageView.clearErrors(formElement);
    messageView.clearWarnings();

    // 2. Получаем модуль сценария
    const scenario = getScenario(currentScenarioKey);
    if (!scenario) {
      console.error(`Сценарий ${currentScenarioKey} не найден в реестре.`);
      return;
    }

    // 3. Сбор строковых значений
    const { scenarioValues, orderValues } = formController.getRawValues();

    // 4. Валидация общих параметров заказа
    const orderErrors = [];
    const errReserve = validateReservePercent(orderValues.reservePercent, 'reservePercent');
    if (errReserve) orderErrors.push(errReserve);

    const errDensity = validateDensity(orderValues.densityKgM3, 'densityKgM3');
    if (errDensity) orderErrors.push(errDensity);

    const errPrice = validatePricePerM3(orderValues.pricePerM3, 'pricePerM3');
    if (errPrice) orderErrors.push(errPrice);

    // 5. Валидация геометрического сценария
    const scenarioValidation = scenario.validate(scenarioValues);
    const allErrors = [...scenarioValidation.errors, ...orderErrors];

    // 6. При наличии хотя бы одной блокирующей ошибки прерываем расчёт
    if (allErrors.length > 0) {
      messageView.renderErrors(allErrors, formElement);
      errorsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    // 7. Геометрический расчёт (чистая функция)
    const geometricResult = scenario.compute(scenarioValidation.values);

    // 8. Расчёт параметров заказа (Слой 4)
    const parsedReserve = parseNumberString(orderValues.reservePercent).value;
    const parsedDensity = parseNumberString(orderValues.densityKgM3).value;
    const parsedPrice = orderValues.pricePerM3 ? parseNumberString(orderValues.pricePerM3).value : null;

    const orderResult = calculateOrderResults({
      volumeM3: geometricResult.volume,
      reservePercent: parsedReserve !== null ? parsedReserve : 5,
      densityKgM3: parsedDensity !== null ? parsedDensity : 2415,
      gradeName: orderValues.gradeName || 'М300 (B22.5)',
      pricePerM3: parsedPrice,
      structural: geometricResult.structural
    });


    // 9. Объединение предупреждений
    const combinedWarnings = [
      ...scenarioValidation.warnings,
      ...orderResult.warnings
    ];

    if (combinedWarnings.length > 0) {
      messageView.renderWarnings(combinedWarnings);
    }

    // 10. Отрисовка результатов
    resultView.render(orderResult, geometricResult.steps);
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
});
