"""Original deterministic ParaPo score/SFX. No samples, commercial songs or external assets.
Run with Python 3 + numpy. Stereo PCM, exactly 60 seconds at 48 kHz.
"""
from pathlib import Path
import wave
import numpy as np

RATE = 48000
DURATION = 60
rng = np.random.default_rng(20261010)
mix = np.zeros((RATE * DURATION, 2), dtype=np.float64)

def note(start, duration, freq, gain, pan=0, pluck=True):
    n = int(duration * RATE)
    t = np.arange(n) / RATE
    attack = np.minimum(t / 0.018, 1)
    release = np.minimum((duration - t) / 0.20, 1)
    env = attack * release * (np.exp(-t * 2.7) if pluck else 0.65)
    signal = (np.sin(2*np.pi*freq*t) + 0.22*np.sin(4*np.pi*freq*t) + 0.07*np.sin(6*np.pi*freq*t)) * env * gain
    i = int(start*RATE)
    n = min(n, len(mix)-i)
    if n <= 0: return
    mix[i:i+n,0] += signal[:n] * (0.75-pan*0.2)
    mix[i:i+n,1] += signal[:n] * (0.75+pan*0.2)
    # Short musical stereo echo; entirely synthesized.
    for seconds, amplitude in [(0.19,0.13),(0.38,0.07)]:
        j = i+int(seconds*RATE); count=min(n,len(mix)-j)
        if count>0: mix[j:j+count] += signal[:count,None]*amplitude*np.array([0.6,1.0])

def midi(n): return 440 * 2**((n-69)/12)

# Dmaj9 / Aadd9 / Bm7 / Gmaj7, restrained 112 BPM editorial pulse.
chords = [[50,57,61,64,69],[45,52,57,59,64],[47,54,57,62,66],[43,50,54,57,62]]
beat=60/112
for bar in range(28):
    start=bar*4*beat
    if start>=57: break
    chord=chords[bar%4]
    intensity=0.55 if start<8 else 0.85 if start<32 else 1.0 if start<43 else 0.62 if start<51 else 0.85
    for pitch in chord: note(start,3.0,midi(pitch),0.016*intensity,pluck=False)
    if start>=8:
        for step in range(8):
            pitch=chord[[1,3,2,4,1,2,3,4][step]]+12
            note(start+step*beat/2,0.8,midi(pitch),0.042*intensity,pan=(-0.6 if step%2 else 0.6))
    for k in range(4):
        at=start+k*beat
        if at>=56: continue
        note(at,0.33,midi(chord[0]-12),0.11*intensity,pluck=True)
        n=int(RATE*0.09); t=np.arange(n)/RATE
        kick=np.sin(2*np.pi*(64*t-25*t*t))*np.exp(-t*45)*0.085*intensity
        i=int(at*RATE); mix[i:i+n]+=kick[:,None]
        if start>=14 and k%2:
            n=int(RATE*0.065); t=np.arange(n)/RATE
            noise=rng.normal(0,1,n); noise=np.concatenate([[0],np.diff(noise)])
            hat=noise*np.exp(-t*80)*0.011*intensity
            i=int((at+beat/2)*RATE); mix[i:i+n]+=hat[:,None]

# Scene punctuation: question taps, reveal chime, selection, connection-off, closing.
for at,pitch in [(1,74),(1.95,71),(2.85,69),(8.18,74),(8.35,78),(8.53,81),(18.2,76),(27.15,78),(35.2,74),(45,69),(51.3,74),(51.55,78),(51.8,81)]:
    note(at,1.2,midi(pitch),0.07)
for pitch in [50,57,61,64,69,74]: note(55.8,4.2,midi(pitch),0.025,pluck=False)
timeline=np.arange(len(mix))/RATE
fade=np.minimum(timeline/0.6,1)*np.minimum((60-timeline)/2.4,1)
mix*=fade[:,None]
mix=np.tanh(mix*1.4)
peak=np.max(np.abs(mix))
mix*=0.68/max(peak,0.001)
out=Path(__file__).resolve().parents[1]/'public/assets/audio/parapo-original.wav'
out.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(out),'wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(RATE)
    f.writeframes((mix*32767).astype('<i2').tobytes())
print(f'Original stereo score: {out}, {len(mix)} samples, exactly 60 seconds; peak {np.max(np.abs(mix)):.3f}')
