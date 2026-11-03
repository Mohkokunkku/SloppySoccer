'use strict';
const buttons = document.querySelectorAll('.choose');
const selection = document.getElementById('selection');
const names = { A1: 'Matchday Athlete', A2: 'Power Captain' };
buttons.forEach(button => button.addEventListener('click', () => {
  const option = button.dataset.option;
  buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  selection.textContent = `${option} selected — ${names[option]}. Preference only; game unchanged.`;
}));
