import './control-help.css';
/** Manual popovers use the browser's top layer, above the pitch and setup panels. */
export const controlHelpMarkup=()=>`<div class="control-help-tools" role="group" aria-label="Control diagrams"><button class="quiet-button control-help-trigger" id="keyboard-help" type="button" aria-label="Keyboard controls" aria-controls="control-help-popover" aria-expanded="false"><span aria-hidden="true">⌨</span></button><button class="quiet-button control-help-trigger" id="gamepad-help" type="button" aria-label="Gamepad controls" aria-controls="control-help-popover" aria-expanded="false"><span aria-hidden="true">🎮</span></button></div><section id="control-help-popover" class="control-help-popover" popover="manual" aria-labelledby="control-help-title"><header class="control-help-heading"><h2 id="control-help-title">Keyboard controls</h2><button class="quiet-button" id="control-help-close" type="button" aria-label="Close controls">×</button></header><div id="local-control-guide" aria-label="Local player control diagrams"></div></section>`;
export function mountControlHelp(root:HTMLElement,returnToGame:()=>void){
 const popup=root.querySelector<HTMLElement>('#control-help-popover')!,guide=root.querySelector<HTMLElement>('#local-control-guide')!,title=root.querySelector<HTMLElement>('#control-help-title')!;
 const buttons=[root.querySelector<HTMLButtonElement>('#keyboard-help')!,root.querySelector<HTMLButtonElement>('#gamepad-help')!];
 let current:HTMLButtonElement|null=null,pinned=false,hovering=false,closing=false,timer:ReturnType<typeof setTimeout>|undefined;
 const cancel=()=>{clearTimeout(timer);};
 const position=()=>{if(!current)return;const anchor=current.getBoundingClientRect(),box=popup.getBoundingClientRect();popup.style.left=`${Math.max(12,Math.min(innerWidth-box.width-12,anchor.right-box.width))}px`;popup.style.top=`${Math.max(12,Math.min(innerHeight-box.height-12,anchor.bottom+8))}px`;};
 const close=(restore:'none'|'trigger'|'game'='none')=>{cancel();if(!current)return;const trigger=current;current=null;pinned=false;hovering=false;popup.hidePopover();buttons.forEach(b=>b.setAttribute('aria-expanded','false'));closing=true;if(restore==='trigger')trigger.focus({preventScroll:true});else if(restore==='game')returnToGame();closing=false;};
 const open=(button:HTMLButtonElement)=>{if(closing)return;cancel();if(current!==button)pinned=false;current=button;const kind=button===buttons[0]?'keyboard':'gamepad';popup.dataset.kind=guide.dataset.kind=kind;title.textContent=kind==='keyboard'?'Keyboard controls':'Gamepad controls';buttons.forEach(b=>b.setAttribute('aria-expanded',String(b===button)));if(!popup.matches(':popover-open'))popup.showPopover();position();};
 const later=()=>{cancel();timer=setTimeout(()=>{if(!pinned&&!hovering&&!popup.contains(document.activeElement)&&!buttons.some(b=>b===document.activeElement&&b.matches(':focus-visible')))close();},180);};
 for(const button of buttons){
  button.addEventListener('pointerenter',e=>{if(e.pointerType!=='mouse')return;hovering=true;open(button);});
  button.addEventListener('pointerleave',()=>{hovering=false;later();});
  button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))open(button);});
  button.addEventListener('blur',later);
  button.addEventListener('click',e=>{if(current===button&&pinned){close(e.detail>0?'game':'trigger');return;}open(button);pinned=true;});
 }
 popup.addEventListener('pointerenter',()=>{hovering=true;cancel();});popup.addEventListener('pointerleave',()=>{hovering=false;later();});popup.addEventListener('focusout',later);
 root.querySelector('#control-help-close')!.addEventListener('click',e=>close((e as MouseEvent).detail>0?'game':'trigger'));
 document.addEventListener('keydown',e=>{if(e.code==='Escape'&&current){e.preventDefault();e.stopImmediatePropagation();close(buttons.includes(document.activeElement as HTMLButtonElement)||popup.contains(document.activeElement)?'trigger':'none');}},true);
 document.addEventListener('pointerdown',e=>{const target=e.target as Node;if(current&&!popup.contains(target)&&!buttons.some(b=>b.contains(target)))close();},true);
 window.addEventListener('resize',position);window.addEventListener('scroll',position,true);window.addEventListener('blur',()=>close());
 return {close:()=>close()};
}
