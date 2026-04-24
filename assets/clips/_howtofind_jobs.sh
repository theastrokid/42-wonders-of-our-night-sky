#!/bin/bash
cd "E:/42 Wonders of our night sky"
W=web/assets/clips
set -e

enc() {
  # enc input start slug
  ffmpeg -y -ss "$2" -i "$1" -t 20 -an \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
    -c:v libx264 -preset veryfast -crf 26 -pix_fmt yuv420p -movflags +faststart \
    "$W/$3-howfind.mp4" 2>&1 | tail -1
}

enc "42 Wonder Clips/Final Exports/02 - Sombrero Galaxy.mp4"            20  sombrero-galaxy
enc "42 Wonder Clips/Final Exports/03 - Hercules Cluster.mp4"           35  hercules-cluster
enc "42 Wonder Clips/Final Exports/01 - Orion Nebula.mp4"              150  orion-nebula
enc "42 Wonder Clips/Final Exports/06 - Heart Nebula.mp4"               15  heart-nebula
enc "42 Wonder Clips/Final Exports/05 - Saturn.mp4"                     38  saturn
enc "42 Wonder Clips/Final Exports/04 - Black Hole.mp4"                115  black-hole
enc "42 Wonder Clips/Final Exports/07 - Albireo.mp4"                    15  albireo
enc "42 Wonder Clips/Final Exports/08 - Hubbles Variable Nebula.mp4"    20  hubbles-variable-nebula
enc "42 Wonder Clips/Final Exports/09 - Helix Nebula.mp4"               35  helix-nebula
enc "42 Wonder Clips/Final Exports/10 - Jupiter.mp4"                   175  jupiter
echo "HOWFIND DONE"
