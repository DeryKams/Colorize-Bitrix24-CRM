(function () {
  'use strict';

  console.log('grid-colorize.js подключён (config-driven)');

  /* Конфиг приходит из init.php */
  var CFG = window.MyCrmColorizeConfig || {};

  /* Список возможных полей (data-column-id), в которых может лежать значение цвета */
  var FIELD_IDS = Array.isArray(CFG.fieldIds) ? CFG.fieldIds : [];

  /* Мапа значений -> цвет */
  var COLOR_MAP = (CFG.colorMap && typeof CFG.colorMap === 'object') ? CFG.colorMap : {};

  /* Флаг для отладки */
  var DEBUG = !!CFG.debug;

  /* Чтобы можно было "снять" раскраску */
  var MARK_ATTR = 'data-mycrm-colored';

  function normalize(value) {
    return (value || '').toString().trim().toLowerCase();
  }

  function log() {
    if (!DEBUG) return;
    // eslint-disable-next-line no-console
    console.log.apply(console, arguments);
  }

  function setBg(el, bg) {
    if (!el) return;

    el.style.setProperty('background-color', bg, 'important');
    el.style.setProperty('transition', 'background-color 150ms ease', 'important');
    el.setAttribute(MARK_ATTR, '1');
  }

  function clearBg(el) {
    if (!el) return;

    if (el.getAttribute(MARK_ATTR) !== '1') return;

    el.style.removeProperty('background-color');
    el.style.removeProperty('transition');
    el.removeAttribute(MARK_ATTR);
  }

  function paintRow(tr, bg) {
    /* Красим все ячейки строки */
    var tds = tr.querySelectorAll('td.main-grid-cell');

    tds.forEach(function (td) {
      setBg(td, bg);

      /* Иногда фон перекрывается внутренними обёртками */
      var inner = td.querySelector('.main-grid-cell-inner');
      if (inner) setBg(inner, bg);

      var content = td.querySelector('.main-grid-cell-content');
      if (content) setBg(content, bg);
    });
  }

  function clearRow(tr) {
    var nodes = tr.querySelectorAll(
      'td.main-grid-cell, td.main-grid-cell .main-grid-cell-inner, td.main-grid-cell .main-grid-cell-content'
    );

    nodes.forEach(function (node) {
      clearBg(node);
    });
  }

  function getRowColorKey(tr) {
    /* Пробуем по очереди все поля, которые пришли из init.php */
    for (var i = 0; i < FIELD_IDS.length; i++) {
      var fieldId = FIELD_IDS[i];

      var td = tr.querySelector('td[data-column-id="' + fieldId + '"]');
      if (!td) continue;

      var content = td.querySelector('.main-grid-cell-content');
      var raw = content ? content.textContent : td.textContent;

      var key = normalize(raw);
      if (key) {
        log('FOUND', tr.getAttribute('data-id'), fieldId, key);
        return key;
      }
    }

    return '';
  }

  function colorizeOneGrid(container) {
    if (!container) return;

    if (!FIELD_IDS.length) {
      log('FIELD_IDS пустой: проверьте init.php (MyCrmColorizeConfig.fieldIds)');
      return;
    }

    var rows = container.querySelectorAll(
      'tbody tr.main-grid-row-body:not([hidden])[data-id]:not([data-id^="template_"])'
    );

    if (!rows.length) return;

    rows.forEach(function (tr) {
      var key = getRowColorKey(tr);

      var bg = key ? COLOR_MAP[key] : null;
      if (!bg) {
        clearRow(tr);
        return;
      }

      paintRow(tr, bg);
    });
  }

  function colorizeAllGridsOnPage() {
    var containers = document.querySelectorAll('.main-grid-container');
    if (!containers.length) return;

    containers.forEach(function (container) {
      if (!container.querySelector('table.main-grid-table')) return;
      colorizeOneGrid(container);
    });
  }

  function attachObservers() {
    var containers = document.querySelectorAll('.main-grid-container');
    if (!containers.length) return;

    containers.forEach(function (container) {
      if (container.dataset.mycrmColorObserver === '1') return;
      container.dataset.mycrmColorObserver = '1';

      var observer = new MutationObserver(function () {
        colorizeOneGrid(container);
      });

      observer.observe(container, { childList: true, subtree: true });
    });
  }

  function bootstrap() {
    colorizeAllGridsOnPage();
    attachObservers();

    /* На случай поздней дорисовки/подгрузки */
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      colorizeAllGridsOnPage();
      attachObservers();

      if (tries >= 30) clearInterval(timer);
    }, 300);
  }

  if (typeof BX !== 'undefined' && BX.ready) {
    BX.ready(bootstrap);
  } else {
    document.addEventListener('DOMContentLoaded', bootstrap);
  }
})();
