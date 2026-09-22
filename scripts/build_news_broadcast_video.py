import subprocess
import os

print("Starting generation of dynamic news broadcast video...")

# Ensure output directory exists
os.makedirs("public/company-profile/videos", exist_ok=True)

# Define segment durations in seconds
# Audio length: 89.36s
# 1. 0 - 14s: Anchor studio intro (zoom in)
# 2. 14 - 28s: Solar park footage
# 3. 28 - 44s: Battery storage footage
# 4. 44 - 58s: Power grid substation footage
# 5. 58 - 72s: Operations & revenue dispatch footage
# 6. 72 - 89.4s: Anchor studio conclusion

cmd = [
    "ffmpeg", "-y",
    "-loop", "1", "-t", "14", "-i", "public/news-broadcast/anchor_studio_framed.jpg",
    "-ss", "0", "-t", "14", "-i", "public/company-profile/videos/solar-park-grid.mp4",
    "-ss", "0", "-t", "16", "-i", "public/company-profile/videos/battery-storage-hub.mp4",
    "-ss", "0", "-t", "14", "-i", "public/company-profile/videos/how-power-grid-works.mp4",
    "-ss", "0", "-t", "14", "-i", "public/company-profile/videos/ppa-revenue-dispatch.mp4",
    "-loop", "1", "-t", "17.5", "-i", "public/news-broadcast/speaking_studio_framed.jpg",
    "-i", "public/company-profile/audio/mohana-sarkar-globaltv-news.mp3",
    "-filter_complex",
    "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='min(zoom+0.0006,1.15)':d=14*25:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps=25,setsar=1[v0];"
    "[1:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=25[v1];"
    "[2:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=25[v2];"
    "[3:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=25[v3];"
    "[4:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,fps=25[v4];"
    "[5:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,zoompan=z='min(zoom+0.0005,1.12)':d=18*25:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps=25,setsar=1[v5];"
    "[v0][v1][v2][v3][v4][v5]concat=n=6:v=1:a=0[vconcat]",
    "-map", "[vconcat]",
    "-map", "6:a",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-t", "89.4",
    "-movflags", "+faststart",
    "public/company-profile/videos/globaltv-news-report.mp4"
]

print("Executing ffmpeg...")
proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
if proc.returncode != 0:
    print("Error:", proc.stderr[-500:])
else:
    print("Successfully generated dynamic news report video!")
    size = os.path.getsize("public/company-profile/videos/globaltv-news-report.mp4")
    print(f"File size: {size} bytes")
