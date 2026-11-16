export type HumanShout={id:string;path:string;spokenText:string;source:string;performer:string;license:'CC0'};

/** The only spoken clips available to runtime audio routes; every entry is an original recorded performance. */
export const HUMAN_SHOUTS:readonly HumanShout[]=[
 {id:'cheer-yeah',path:'/audio-v3/cheer-yeah.wav?v=human-v1',spokenText:'You win!',source:'Kenney Voiceover Pack, Male/you_win.ogg',performer:'Jeffrey M. Smith',license:'CC0'},
 {id:'cheer-we-did-it',path:'/audio-v3/cheer-we-did-it.wav?v=human-v1',spokenText:'Congratulations!',source:'Kenney Voiceover Pack, Female/congratulations.ogg',performer:'Giselle',license:'CC0'},
 {id:'cheer-champions',path:'/audio-v3/cheer-champions.wav?v=human-v1',spokenText:'You win!',source:'Kenney Voiceover Pack, Female/you_win.ogg',performer:'Giselle',license:'CC0'},
 {id:'voice-go',path:'/audio-v2/voice-go.wav?v=human-v1',spokenText:'Go!',source:'Kenney Voiceover Pack, Male/go.ogg',performer:'Jeffrey M. Smith',license:'CC0'},
 {id:'voice-yes',path:'/audio-v2/voice-yes.wav?v=human-v1',spokenText:'Hurry up!',source:'Kenney Voiceover Pack, Female/hurry_up.ogg',performer:'Giselle',license:'CC0'},
];
