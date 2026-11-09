"""Prepare traceable website images from the existing 1.7.0 (105) captures.

Usage: python3 scripts/prepare-gameplay.py --source-dir /path/to/raw
Only re-encoding/resizing and the documented gameplay crop are performed.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path, required=True)
parser.add_argument('--app-icon', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
output = root / 'images' / 'gameplay'
output.mkdir(parents=True, exist_ok=True)
locales = {'en':'en_US','ar':'ar','de':'de','es':'es','fr':'fr','ja':'ja','ko':'ko','zh-Hans':'zh_Hans','zh-Hant':'zh_Hant'}
shapes = {'rectangular':'','hexagonal':'_hexagonal','honeycomb':'_honeycomb','circular':'_circular'}
manifest = {'sourceVersion':'1.7.0 (105)','locales':{},'crops':{}}
icon_bytes = args.app_icon.read_bytes()
icon_name = 'app-icon.' + hashlib.sha256(icon_bytes).hexdigest()[:12] + '.png'
(output/icon_name).write_bytes(icon_bytes)
manifest['brand'] = {'src':'/images/gameplay/'+icon_name,'width':512,'height':512,'source':args.app_icon.name,'sha256':hashlib.sha256(icon_bytes).hexdigest()}

def save(image, label, source, crop=None):
    stream = io.BytesIO()
    image.save(stream, format='WEBP', quality=84, method=6)
    payload = stream.getvalue()
    name = label + '.' + hashlib.sha256(payload).hexdigest()[:12] + '.webp'
    (output/name).write_bytes(payload)
    return {'src':'/images/gameplay/'+name,'width':image.width,'height':image.height,'bytes':len(payload),'source':source.name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'crop':crop}

for locale, capture in locales.items():
    manifest['locales'][locale] = {}
    for shape, suffix in shapes.items():
        source = args.source_dir / f'iphone17promax_{capture}_01-easy{suffix}.png'
        with Image.open(source) as raw:
            assert raw.size == (1320,2868), (source,raw.size)
            image = raw.convert('RGB')
            image.thumbnail((660,1434),Image.Resampling.LANCZOS)
            manifest['locales'][locale][shape] = save(image,locale+'-'+shape,source)
            if locale == 'en':
                # Exclude score, control panel and all UI text; retain actual maze.
                box = (0,380,1320,1760)
                crop = raw.convert('RGB').crop(box)
                crop.thumbnail((792,858),Image.Resampling.LANCZOS)
                manifest['crops'][shape] = save(crop,'maze-'+shape,source,list(box))
(root/'content'/'gameplay-images.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Prepared 36 localized full captures and 4 text-free gameplay crops.')
