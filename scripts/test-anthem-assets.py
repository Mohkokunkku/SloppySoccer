import hashlib,json,pathlib,unittest,wave
R=pathlib.Path(__file__).resolve().parents[1];D=R/'public/audio-v5'
class AnthemAssets(unittest.TestCase):
 def test_actual_anthem_melodies(self):
  tracks=json.loads((D/'manifest.json').read_text(encoding='utf-8'))
  self.assertEqual([n['pitch'] for n in tracks[0]['note_events'][:5]],[70,65,74,70,77])
  self.assertEqual([n['pitch'] for n in tracks[1]['note_events'][:5]],[65,65,70,65,62])
  self.assertEqual([len(t['note_events']) for t in tracks],[97,68])
 def test_stereo_pcm_metrics_and_boundaries(self):
  tracks=json.loads((D/'manifest.json').read_text(encoding='utf-8'));hashes=set()
  for track in tracks:
   path=D/track['file'];raw=path.read_bytes();sha=hashlib.sha256(raw).hexdigest();hashes.add(sha);self.assertEqual(sha,track['sha256'])
   with wave.open(str(path)) as w:
    self.assertEqual(w.getnchannels(),2);self.assertEqual(w.getsampwidth(),2);self.assertEqual(w.getframerate(),24000);self.assertEqual(w.getnframes()/w.getframerate(),32)
    data=w.readframes(w.getnframes());self.assertEqual(data[:4],bytes(4));self.assertEqual(data[-4:],bytes(4))
   self.assertGreater(track['rms'],.03);self.assertLess(track['peak'],.99);self.assertEqual(track['clipped_samples'],0)
  self.assertEqual(len(hashes),2)
if __name__=='__main__':unittest.main()
