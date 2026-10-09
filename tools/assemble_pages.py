"""Reconstruct the exact verified Web export from repository-sized chunks."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def assemble(repo, output):
    manifest = json.loads((repo / 'release.json').read_text(encoding='utf-8'))
    output.mkdir(parents=True, exist_ok=True)
    for item in manifest['files']:
        name = item['name']
        relative = Path(name)
        if relative.is_absolute() or '..' in relative.parts or '\\' in name:
            raise ValueError('Unexpected asset path')
        target = output / name
        if not target.resolve().is_relative_to(output.resolve()):
            raise ValueError('Asset escapes output')
        target.parent.mkdir(parents=True, exist_ok=True)
        if 'chunks' in item:
            with tempfile.TemporaryFile() as packed:
                for part in item['chunks']:
                    source = repo / 'payload' / part['name']
                    if source.parent != repo / 'payload' or digest(source) != part['sha256']:
                        raise ValueError('Chunk hash mismatch')
                    with source.open('rb') as stream:
                        shutil.copyfileobj(stream, packed)
                packed.seek(0)
                with gzip.GzipFile(fileobj=packed) as source, target.open('wb') as dest:
                    shutil.copyfileobj(source, dest)
        else:
            shutil.copy2(repo / 'static' / name, target)
        if target.stat().st_size != item['size'] or digest(target) != item['sha256']:
            raise ValueError('Export hash mismatch: ' + name)
    (output / '.nojekyll').touch()
    (output / 'release.json').write_text(json.dumps({'version': manifest['version'], 'files': [{k:v for k,v in f.items() if k != 'chunks'} for f in manifest['files']]}, ensure_ascii=False, indent=2), encoding='utf-8')
    print('VERIFIED_WEB_EXPORT', output, sum(f['size'] for f in manifest['files']))

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--repo', type=Path, default=Path('.'))
    parser.add_argument('--output', type=Path, default=Path('_site'))
    args=parser.parse_args()
    assemble(args.repo.resolve(), args.output.resolve())
