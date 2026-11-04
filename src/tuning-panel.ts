import {DEFAULT_TUNING,TUNING_LIMITS,type getTuning} from '../shared/tuning';
import type {GameTuning} from '../shared/types';
const keys=Object.keys(TUNING_LIMITS) as (keyof GameTuning)[];
const valueText=(n:number)=>Number(n.toFixed(2)).toString();
export function tuningPanelMarkup(tuning:GameTuning):string{
 return `<details id="tuning-panel" class="tuning-panel"><summary>Tuning lab</summary><div class="tuning-inner"><p class="tuning-help">Change the feel without restarting. Lower turning response gives smoother turns; lower acceleration gives a gentler start.</p><div class="tuning-grid">${keys.map(key=>{const r=TUNING_LIMITS[key];return `<div class="tuning-control"><label for="tune-${key}">${r.label}</label><output for="tune-${key}">${valueText(tuning[key])} ${r.unit}</output><input id="tune-${key}" type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${tuning[key]}" data-tuning="${key}"></div>`;}).join('')}</div><div class="tuning-actions"><button id="tuning-reset" class="quiet-button" type="button">Reset tuning</button><button id="tuning-return" class="quiet-button" type="button">Back to pitch</button><span id="tuning-status" role="status">Local test values. Restart keeps them; reset restores the defaults.</span></div></div></details>`;
}
export function mountTuningPanel(host:HTMLElement,read:()=>ReturnType<typeof getTuning>,change:(patch:Partial<GameTuning>)=>void,focusPitch:()=>void):void{
 host.innerHTML=tuningPanelMarkup(read());
 const sync=()=>{const current=read();for(const key of keys){const range=host.querySelector<HTMLInputElement>(`#tune-${key}`)!;range.value=String(current[key]);host.querySelector<HTMLOutputElement>(`output[for="tune-${key}"]`)!.value=`${valueText(current[key])} ${TUNING_LIMITS[key].unit}`;}};
 host.addEventListener('input',event=>{const target=event.target;if(!(target instanceof HTMLInputElement))return;const key=target.dataset.tuning as keyof GameTuning;if(!keys.includes(key))return;change({[key]:target.valueAsNumber});sync();const t=read();host.querySelector('#tuning-status')!.textContent=`Applied live · ${valueText(t.fieldWidth)} × ${valueText(t.fieldHeight)} m field · goal ${valueText(t.goalWidth)} × ${valueText(t.goalHeight)} m`;});
 host.querySelector('#tuning-reset')!.addEventListener('click',()=>{change({...DEFAULT_TUNING});sync();host.querySelector('#tuning-status')!.textContent='Default tuning restored. Match score and clock kept.';});
 host.querySelector('#tuning-return')!.addEventListener('click',focusPitch);
}
