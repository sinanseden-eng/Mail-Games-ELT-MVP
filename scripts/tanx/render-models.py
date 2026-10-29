"""Bake user-provided GLB tanks to tiny RGBA sprites; no WebGL at runtime.
Usage: python3 scripts/tanx/render-models.py MODEL.glb OUTPUT.png
Uses embedded positions, normals and base-colour texture, with a depth buffer.
"""
import sys,struct,json,io,pathlib
import numpy as np
from PIL import Image
p=pathlib.Path(sys.argv[1]);b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);offset=20+n+8
sizes={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4};types={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}
def accessor(i):
 a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];dtype=np.dtype(types[a['componentType']]);cols=sizes[a['type']];start=offset+v.get('byteOffset',0)+a.get('byteOffset',0)
 return np.ndarray((a['count'],cols),dtype=dtype,buffer=b,offset=start,strides=(v.get('byteStride',dtype.itemsize*cols),dtype.itemsize)).copy()
a=d['meshes'][0]['primitives'][0]['attributes'];pos=accessor(a['POSITION']);norm=accessor(a['NORMAL']);uv=accessor(a['TEXCOORD_0'])
print(p.name,'vertices',len(pos),'bounds',pos.min(0),pos.max(0))
v=d['bufferViews'][d['images'][0]['bufferView']];tex=np.asarray(Image.open(io.BytesIO(b[offset+v.get('byteOffset',0):offset+v.get('byteOffset',0)+v['byteLength']])).convert('RGB'))
# Remove the fixed forward barrel: the game supplies a pivoting barrel.
keep=~((pos[:,0]<-.2)&(pos[:,1]>.05));pos=pos[keep];norm=norm[keep];uv=uv[keep]
# Side view shows tracks and front armour, with a slight elevated camera.
forward=np.array([.22,.24,1.]);forward/=np.linalg.norm(forward);right=np.cross([0.,1.,0.],forward);right/=np.linalg.norm(right);up=np.cross(forward,right)
xy=np.stack([pos@right,-pos@up],1);z=pos@forward
W,H=384,224;scale=min((W-20)/np.ptp(xy[:,0]),(H-16)/np.ptp(xy[:,1]));xy=(xy-(xy.min(0)+xy.max(0))/2)*scale+[W/2,H/2]
x=np.floor(xy[:,0]).astype(int);y=np.floor(xy[:,1]).astype(int)
uv=np.mod(uv,1);tx=np.clip((uv[:,0]*tex.shape[1]).astype(int),0,tex.shape[1]-1);ty=np.clip((uv[:,1]*tex.shape[0]).astype(int),0,tex.shape[0]-1)
light=np.array([.65,1.,.3]);light/=np.linalg.norm(light);shade=.55+.6*np.maximum(0,norm@light);col=np.minimum(255,tex[ty,tx]*shade[:,None]).astype('uint8')
out=np.zeros((H,W,4),dtype='uint8');depth=np.full((H,W),-np.inf)
for dx,dy in [(0,0),(1,0),(0,1),(-1,0),(0,-1)]:
 xx=np.clip(x+dx,0,W-1);yy=np.clip(y+dy,0,H-1);flat=yy*W+xx;order=np.lexsort((-z,flat));first=np.r_[True,flat[order][1:]!=flat[order][:-1]];idx=order[first];sel=z[idx]>depth[yy[idx],xx[idx]];idx=idx[sel];out[yy[idx],xx[idx],:3]=col[idx];out[yy[idx],xx[idx],3]=255;depth[yy[idx],xx[idx]]=z[idx]
im=Image.fromarray(out);bbox=im.getbbox();im=im.crop(bbox);im.thumbnail((88,48),Image.Resampling.LANCZOS);im.save(sys.argv[2]);print('saved',sys.argv[2],im.size)
