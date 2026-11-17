"""Original stereo toy-pop auditions of sourced historical anthem melodies.
Offline, deterministic Python stdlib synthesis of the approved recordings.
"""
from array import array
import hashlib,json,math,random,sys,wave
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/audio-v5'
RATE=24000
BPM=120
BEAT=60/BPM
DURATION=32
COUNT=int(RATE*DURATION)
TAU=math.tau

def hz(pitch):return 440*2**((pitch-69)/12)

def render(track):
 left=array('f',[0])*COUNT;right=array('f',[0])*COUNT
 def add(start,duration,voice,pitch=0,gain=.1,pan:float=0.0):
  begin=round(start*RATE);length=max(1,round(duration*RATE));frequency=hz(pitch) if pitch else 0
  gl=math.sqrt((1-pan)/2)*gain;gr=math.sqrt((1+pan)/2)*gain
  seed=random.Random(1931+begin+pitch);previous=0
  for j in range(length):
   index=(begin+j)%COUNT;t=j/RATE;edge=min(1,j/96,(length-1-j)/min(720,length/3))
   phase=TAU*frequency*t
   if voice=='lead':
    body=math.sin(phase)+.22*math.sin(phase*2)+.075*math.sin(phase*3)
    bell=.15*math.sin(phase*4.02)*math.exp(-t*23)
    value=(body*(.73+.27*math.exp(-t*6))+bell)*edge
   elif voice=='mallet':value=(math.sin(phase)*math.exp(-t*8)+.24*math.sin(phase*3.99)*math.exp(-t*27))*edge
   elif voice=='bass':value=(math.sin(phase)+.17*math.sin(phase*2))*math.exp(-t*6)*edge
   elif voice=='kick':value=math.sin(TAU*(44*t+1.5*(1-math.exp(-t*28))))*math.exp(-t*23)*edge
   else:
    noise=seed.uniform(-1,1);high=noise-previous;previous=noise
    if voice=='hat':value=high*math.exp(-t*95)*edge
    elif voice=='clap':value=(high*.8+math.sin(TAU*1473*t)*.12)*math.exp(-t*36)*edge
    else:value=(math.sin(phase)+.1*math.sin(phase*2))*math.exp(-t*12)*edge
   left[index]+=value*gl;right[index]+=value*gr
 # Historical pitch/rhythm line only: no reference orchestration or recording.
 for i,note in enumerate(track['notes']):
  start=note['beat']*BEAT;length=note['duration']*BEAT*.93
  add(start,length,'lead',note['pitch'],.24,(-.08 if track['id']=='spain' else .08))
  add(start,min(.22,length),'mallet',note['pitch']+12,.035,(-.45 if i%2 else .45))
 # Original pop accompaniment in B-flat major, not the source orchestration.
 progression=([58,63,58,65,58,63,65,58]*2 if track['id']=='spain' else [58,58,58,58,63,65,58,58,63,65,63,58,65,58,58,58])
 for bar,root in enumerate(progression):
  for beat in range(4):
   position=bar*4+beat
   add(position*BEAT,.22,'kick',gain=.34)
   if beat in (1,3):
    for offset,gain in [(0,.09),(.012,.055),(.025,.035)]:add(position*BEAT+offset,.095,'clap',gain=gain,pan=.08)
   for half in (0,.5):add((position+half)*BEAT,.065,'hat',gain=.037 if half else .025,pan=.4 if half else -.4)
   add((position+.5)*BEAT,.19,'bass',root-12+(7 if beat==3 else 0),.23)
   if beat in (0,2):add(position*BEAT,.24,'bass',root-12,.16)
   for interval in (0,4,7):add((position+.5)*BEAT,.16,'chord',root+interval,.04,pan=-.3)
 # Wrapped short stereo echoes avoid a long reverb wash.
 dl=round(.1875*RATE);dr=round(.3125*RATE)
 dry_l=array('f',left);dry_r=array('f',right)
 for i in range(COUNT):
  left[i]=math.tanh(left[i]+dry_r[(i-dl)%COUNT]*.13)
  right[i]=math.tanh(right[i]+dry_l[(i-dr)%COUNT]*.13)
 peak=max(max(abs(x) for x in left),max(abs(x) for x in right));scale=.85/peak
 pcm=array('h');energy=0;measured_peak=0
 for i in range(COUNT):
  fade=min(1,i/120,(COUNT-1-i)/120)
  for samples in (left,right):
   value=round(samples[i]*scale*fade*32767);pcm.append(value);energy+=(value/32768)**2;measured_peak=max(measured_peak,abs(value)/32768)
 if sys.byteorder!='little':pcm.byteswap()
 path=OUT/f"{track['id']}-toy-pop.wav"
 with wave.open(str(path),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
 return {'title':track['title']+' · Toy Pop','country':track['country'],'file':path.name,'duration_seconds':DURATION,'bpm':BPM,'bars':16,'sample_rate_hz':RATE,'channels':2,'format':'PCM signed 16-bit','peak':measured_peak,'rms':math.sqrt(energy/(COUNT*2)),'clipped_samples':sum(abs(x)>=32767 for x in pcm),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'source':track['source'],'source_midi':track['melody_source'],'source_track':track['source_track'],'source_beats':track['source_beats'],'note_events':[{'pitch':n['pitch'],'start':n['beat']*BEAT,'duration':n['duration']*BEAT} for n in track['notes']]}

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 tracks=json.loads((OUT/'melodies.json').read_text(encoding='utf-8'))
 results=[render(track) for track in tracks]
 (OUT/'manifest.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps([{k:v for k,v in t.items() if k!='note_events'} for t in results],ensure_ascii=False,indent=2))
if __name__=='__main__':main()
