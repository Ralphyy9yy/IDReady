"""Render original motion graphics, local narration, and synthesized music to MP4.

Requires Pillow, numpy, and imageio-ffmpeg. No photo data or network calls.
"""
from pathlib import Path
import json
import math
import subprocess
import sys
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '.demo-tools'))
import imageio_ffmpeg

OUT = ROOT / 'docs' / 'demo'
WORK = OUT / 'work'
OUT.mkdir(parents=True, exist_ok=True)
WORK.mkdir(parents=True, exist_ok=True)
W, H, FPS, RATE = 1280, 720, 24, 44100
BG, INK, BLUE, MUTED, MINT = '#f3f5fa', '#17212f', '#2458db', '#596579', '#a7f3d0'
SCENES = json.loads((Path(__file__).parent / 'scenes.json').read_text(encoding='utf-8'))


def font(size, bold=False):
    return ImageFont.truetype('C:/Windows/Fonts/' + ('segoeuib.ttf' if bold else 'segoeui.ttf'), size)


def text(draw, xy, value, size=22, color=INK, bold=False):
    draw.text(xy, value, font=font(size, bold), fill=color, spacing=6)


def rounded(draw, box, fill, radius=18, outline=None, width=1):
    draw.rounded_rectangle(box, radius, fill=fill, outline=outline, width=width)


def emblem(draw, x, y, scale=1):
    s = scale
    rounded(draw, (x, y, x+40*s, y+48*s), BLUE, int(7*s))
    draw.ellipse((x+14*s,y+10*s,x+26*s,y+22*s),fill='white')
    draw.pieslice((x+8*s,y+22*s,x+32*s,y+46*s),180,360,fill='white')
    rounded(draw,(x+28*s,y+32*s,x+48*s,y+50*s),MINT,int(5*s))
    draw.line([(x+33*s,y+40*s),(x+37*s,y+44*s),(x+44*s,y+36*s)],fill='#145b46',width=max(2,int(2*s)))


def portrait(draw, box):
    x,y,r,b=box
    rounded(draw,box,'#edf3ff',4)
    cx=(x+r)/2
    unit=(r-x)/100
    draw.ellipse((cx-17*unit,y+12*unit,cx+17*unit,y+48*unit),fill='#a9bedf')
    draw.ellipse((cx-36*unit,y+49*unit,cx+36*unit,b+30*unit),fill=BLUE)


def scene_image(index):
    im=Image.new('RGB',(W,H),BG)
    d=ImageDraw.Draw(im)
    for x in range(20,W,26):
        for y in range(20,H,26):
            d.ellipse((x,y,x+1,y+1),fill='#d4ddec')
    rounded(d,(550,120,1235,575),'#e6edf8',28)
    emblem(d,50,35,.8)
    text(d,(99,32),'IDReady.',28,bold=True)
    text(d,(1050,42),'PRODUCT TOUR',13,MUTED,True)
    text(d,(50,152),SCENES[index]['label'],15,BLUE,True)
    text(d,(47,201),SCENES[index]['title'],48,bold=True)
    # Wrap short descriptive copy into the left column.
    words=SCENES[index]['subtitle'].split()
    lines=[]; current=''
    for word in words:
        candidate=(current+' '+word).strip()
        if d.textlength(candidate,font=font(21))>450:
            lines.append(current); current=word
        else: current=candidate
    lines.append(current)
    text(d,(50,352),'\n'.join(lines),21,MUTED)
    if index in (0,1):
        screenshot=Image.open(ROOT/'docs/images/desktop.png').convert('RGB')
        screenshot=screenshot.crop((100,0,1340,760))
        screenshot.thumbnail((650,400),Image.Resampling.LANCZOS)
        px=568; py=155
        rounded(d,(px-3,py-3,px+screenshot.width+3,py+screenshot.height+3),'white',12)
        im.paste(screenshot,(px,py))
        d=ImageDraw.Draw(im)
        text(d,(585,548),'ACTUAL APPLICATION SCREEN',12,MUTED,True)
    elif index==2:
        rounded(d,(595,150,875,548),'white',15)
        portrait(d,(620,174,850,500))
        rounded(d,(668,462,802,488),'white',3)
        text(d,(685,466),'YOUR NAME',13,bold=True)
        for j,(label,value) in enumerate([('Background','White'),('Photo size','2 x 2 in'),('Border','Thin'),('Name tag','Optional')]):
            yy=183+j*83
            rounded(d,(900,yy,1208,yy+66),'white',10)
            text(d,(919,yy+9),label,13,MUTED)
            text(d,(919,yy+29),value,19,bold=True)
        text(d,(595,553),'ILLUSTRATIVE EDITING PREVIEW',12,MUTED,True)
    elif index==3:
        rounded(d,(610,145,870,550),'white',3,outline='#d4dce9')
        for row in range(4):
            for col in range(2):
                x=630+col*115; y=165+row*88
                portrait(d,(x,y,x+94,y+74))
        for j,label in enumerate(['A4 / Photo paper','Copies and spacing','Exact-size PDF']):
            rounded(d,(903,195+j*93,1205,265+j*93),'white',12)
            text(d,(924,215+j*93),label,20,bold=True)
        text(d,(610,555),'ILLUSTRATIVE SHEET LAYOUT',12,MUTED,True)
    elif index==4:
        rounded(d,(695,145,1015,555),'#17212f',28)
        rounded(d,(705,155,1005,545),'white',22)
        emblem(d,815,185,1.2)
        text(d,(758,265),'Offline setup',28,bold=True)
        for j,label in enumerate(['Open online','Download AI assets','Verify offline readiness']):
            yy=323+j*56
            d.ellipse((733,yy+5,755,yy+27),fill=MINT)
            text(d,(765,yy),label,17,bold=True)
        text(d,(730,504),'Approximately 51 MB of AI assets',14,MUTED)
    else:
        emblem(d,804,178,2.8)
        text(d,(705,357),'IDReady.',65,bold=True)
        text(d,(696,446),'YOUR PHOTO. PRINT READY.',20,BLUE,True)
        text(d,(700,499),'github.com/Ralphyy9yy/IDReady',16,MUTED)
    return im


def read_voice(path):
    with wave.open(str(path),'rb') as w:
        channels, sample_width, source_rate=w.getnchannels(),w.getsampwidth(),w.getframerate()
        if sample_width!=2:
            raise ValueError('Expected 16-bit PCM narration')
        data=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
        if channels>1: data=data.reshape(-1,channels).mean(axis=1)
        n=round(len(data)*RATE/source_rate)
        return np.interp(np.arange(n)*source_rate/RATE,np.arange(len(data)),data).astype(np.float32)


voices=[read_voice(WORK/f'voice-{i}.wav') for i in range(len(SCENES))]
durations=[len(v)/RATE+1.2 for v in voices]
total=sum(durations)
n=round(total*RATE)
audio=np.zeros(n,np.float32)
offset=0.
captions=[]
for scene,voice,duration in zip(SCENES,voices,durations):
    start=round((offset+.45)*RATE)
    audio[start:start+len(voice)]+=voice*.95
    captions.append((offset+.45,offset+.45+len(voice)/RATE,scene['narration']))
    offset+=duration

# An original, unobtrusive A-minor / F / C / G instrumental bed.
music=np.zeros(n,np.float32)
chords=[(220,261.63,329.63),(174.61,220,261.63),(130.81,164.81,196),(196,246.94,293.66)]
for beat_time in np.arange(0,total,0.625):
    chord=chords[int(beat_time//5)%len(chords)]
    for frequency in chord:
        start=round(beat_time*RATE); count=min(round(1.8*RATE),n-start)
        t=np.arange(count)/RATE
        envelope=(1-np.exp(-t*16))*np.exp(-t*2.4)
        music[start:start+count]+=(np.sin(2*np.pi*frequency*t)+.15*np.sin(4*np.pi*frequency*t))*envelope*.012
    # Soft bell arpeggio.
    frequency=chord[int(beat_time/.625)%3]*2
    count=min(round(.65*RATE),n-start); t=np.arange(count)/RATE
    music[start:start+count]+=np.sin(2*np.pi*frequency*t)*np.exp(-t*7)*.011
fade=np.minimum(1,np.arange(n)/RATE/1.5)*np.minimum(1,(n-1-np.arange(n))/RATE/2)
audio=(audio+music)*fade
audio=np.clip(audio,-.98,.98)
with wave.open(str(WORK/'mix.wav'),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE)
    stereo=np.repeat((audio*32767).astype(np.int16)[:,None],2,axis=1)
    w.writeframes(stereo.tobytes())

def timestamp(sec):
    ms=round(sec*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
    return f'{h:02}:{m:02}:{s:02}.{ms:03}'

(OUT/'captions.vtt').write_text('WEBVTT\n\n'+'\n\n'.join(f'{timestamp(a)} --> {timestamp(b)}\n{c}' for a,b,c in captions)+'\n',encoding='utf-8')
frames=[scene_image(i) for i in range(len(SCENES))]
frames[0].save(OUT/'poster.jpg',quality=92)
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
command=[ffmpeg,'-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(WORK/'mix.wav'),'-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-movflags','+faststart','-shortest',str(OUT/'idready-demo.mp4')]
process=subprocess.Popen(command,stdin=subprocess.PIPE,stderr=open(WORK/'encode.log','w'))
offset=0
for index,(base,duration) in enumerate(zip(frames,durations)):
    frame_count=round(duration*FPS)
    for frame_number in range(frame_count):
        progress=frame_number/max(1,frame_count-1)
        im=base.copy();d=ImageDraw.Draw(im)
        # Original motion accents, synced to each scene.
        shift=math.sin(progress*math.pi*2)*12
        d.ellipse((1190,70+shift,1220,100+shift),outline='#a1c5b6',width=3)
        d.line((50,603,1230,603),fill='#d5deed',width=2)
        d.line((50,603,50+1180*(offset+progress*duration)/total,603),fill=BLUE,width=3)
        for k in range(6):
            rounded(d,(50+k*37,557,78+k*37,561),BLUE if k<=index else '#d5deed',2)
        # Readable burned-in scene captions, separate from the voice script.
        caption=SCENES[index]['subtitle']
        text(d,(50,633),caption,23,INK,True)
        text(d,(50,672),f'{index+1:02} / 06',13,MUTED)
        # Short fades keep cuts gentle without flashing.
        opacity=min(1,frame_number/(FPS*.35),(frame_count-1-frame_number)/(FPS*.35))
        if opacity<1: im=Image.blend(Image.new('RGB',(W,H),BG),im,max(0,opacity))
        process.stdin.write(im.tobytes())
    offset+=duration
    print(f'Rendered scene {index+1}/6',flush=True)
process.stdin.close()
if process.wait()!=0: raise RuntimeError((WORK/'encode.log').read_text()[-3000:])
print(f'Created {OUT / "idready-demo.mp4"} ({total:.1f} seconds)',flush=True)
