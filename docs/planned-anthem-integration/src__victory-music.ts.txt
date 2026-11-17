import type {PostMatchView} from './post-match';

export const NATIONAL_VICTORY_TRACKS={
 home:{id:'victory-spain-pop',path:'/audio-v5/spain-toy-pop.wav',title:'Marcha Real · Toy Pop'},
 away:{id:'victory-argentina-pop',path:'/audio-v5/argentina-toy-pop.wav',title:'Himno Nacional Argentino · Toy Pop'},
} as const;

export function victoryMusic(view:Pick<PostMatchView,'winner'|'theme'>){
 if(view.winner)return NATIONAL_VICTORY_TRACKS[view.winner];
 return {id:`theme-${view.theme}`,path:`/audio-v3/theme-${view.theme}.wav`,title:['Golden Boot','The Grandstand','After the Whistle'][view.theme]};
}