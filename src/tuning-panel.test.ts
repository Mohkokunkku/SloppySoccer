import {it,expect} from 'vitest';
import {tuningPanelMarkup} from './tuning-panel';
import {TUNING_LIMITS,DEFAULT_TUNING} from '../shared/tuning';
it('offers a labelled live range with output for each validated tuning key',()=>{
 const html=tuningPanelMarkup(DEFAULT_TUNING);
 for(const [key,rule]of Object.entries(TUNING_LIMITS)){
  expect(html).toContain(`id="tune-${key}"`);expect(html).toContain(`for="tune-${key}"`);expect(html).toContain(rule.label);expect(html).toContain(`min="${rule.min}"`);expect(html).toContain(`max="${rule.max}"`);
 }
 expect(html).toContain('id="tuning-reset"');expect(html).toContain('id="tuning-status"');expect(html).toContain('Tuning lab');
});
