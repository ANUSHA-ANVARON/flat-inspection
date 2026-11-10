"""Parse the master category reference docx into convex/seed/checklist.json."""
import zipfile, re, json, sys
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
src = sys.argv[1]
dst = sys.argv[2]
root = ET.fromstring(zipfile.ZipFile(src).read('word/document.xml')).find(W + 'body')

def txt(e):
    return ''.join(t.text or '' for t in e.iter(W + 't'))

blocks = []
for c in root:
    if c.tag == W + 'p':
        s = txt(c).strip()
        if s:
            blocks.append(('P', s))
    elif c.tag == W + 'tbl':
        blocks.append(('T', [[txt(tc).strip() for tc in tr.findall(W + 'tc')] for tr in c.findall(W + 'tr')]))

ROOM = ['H', 'K', 'U', 'W', 'B', 'S', 'F']
# category map (first table with 'No.' header)
matrix = {}
for k, v in blocks:
    if k == 'T' and v[0][0] == 'No.':
        for r in v[1:]:
            matrix[int(r[0])] = dict(group=r[1], name=r[2], rows=int(r[3]),
                                     apply={ROOM[i]: r[4 + i] for i in range(7)})
        break

def primary(ct):
    return ct.split('+')[0].strip()

def input_kind(ct):
    p = primary(ct)
    return {'Measure': 'number', 'Test': 'number', 'Verify': 'text'}.get(p, 'none')

cats = {}
cur = None
section = None
i = 0
started = False
while i < len(blocks):
    k, v = blocks[i]
    if k == 'P' and re.match(r'^Group [A-I]: ', v):
        started = True
    if started and k == 'P':
        m = re.match(r'^(\d{1,2})\. (.+)$', v)
        if m and int(m.group(1)) in matrix and matrix[int(m.group(1))]['name'].split(' (')[0][:8] == m.group(2)[:8] and int(m.group(1)) not in cats:
            n = int(m.group(1)); cur = n; section = None
            cats[n] = dict(number=n, name=m.group(2), group=matrix[n]['group'],
                           roomTypes=[r for r in ROOM if matrix[n]['apply'][r] != '–'],
                           conditionalRoomTypes=[r for r in ROOM if matrix[n]['apply'][r] == '○'],
                           appliesTo='', tools='', commonFindings=[], parameters=[])
        elif cur and v.startswith('Common findings:'):
            cats[cur]['commonFindings'] = [s.strip().rstrip('.') for s in v[len('Common findings:'):].split(';') if s.strip()]
            cur = None
        elif cur and not v.startswith('Group '):
            section = v.rstrip(':')
    elif started and cur and k == 'T':
        if v[0][0] == 'Header':
            d = {r[0]: r[1] for r in v[1:]}
            cats[cur]['appliesTo'] = d.get('Applies to', '')
            cats[cur]['tools'] = d.get('Main tools', '')
        elif v[0][0] == 'Ref':
            sec_name, sec_rooms = section, None
            if section and 'Room type:' in section:
                sec_name, rt = re.split(r'\s+Room type:\s*', section)
                names = {'habitable': 'H', 'kitchen': 'K', 'utility': 'U', 'washroom': 'W', 'balcony': 'B', 'support': 'S'}
                sec_rooms = [names[w] for w in re.findall(r'[A-Za-z]+', rt.lower().split('(')[0]) if w in names]
            for r in v[1:]:
                ct = r[3]
                cats[cur]['parameters'].append(dict(
                    ref=r[0], name=r[1], whatToCheck=r[2], checkType=ct,
                    primaryType=primary(ct), extraInput=input_kind(ct),
                    unit='', tool=r[4], section=sec_name,
                    roomTypes=sec_rooms or cats[cur]['roomTypes']))
            section = None
    i += 1

out = dict(roomTypes=[
    dict(code='H', name='Habitable room'), dict(code='K', name='Kitchen'), dict(code='U', name='Utility'),
    dict(code='W', name='Washroom'), dict(code='B', name='Balcony'), dict(code='S', name='Support space'),
    dict(code='F', name='Flat-level')], categories=[cats[n] for n in sorted(cats)])
total = sum(len(c['parameters']) for c in out['categories'])
for c in out['categories']:
    assert len(c['parameters']) == matrix[c['number']]['rows'], (c['number'], len(c['parameters']))
print(len(out['categories']), 'categories', total, 'rows')
json.dump(out, open(dst, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
