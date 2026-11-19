import { useEffect, useRef, useState } from 'react';
import { PORTALS } from './tunnel';

interface PhotoRow { id?: number; album: number; title: string; description: string; blob: Blob }
interface ViewPhoto extends PhotoRow { id: number; url: string }
const DB_NAME = 'nobita-time-journey-images-v1';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve,reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if(!req.result.objectStoreNames.contains('photos'))
        req.result.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function listPhotos(album: number): Promise<PhotoRow[]> {
  const db=await openDatabase();
  try {
    return await new Promise((resolve,reject)=>{
      const req=db.transaction('photos','readonly').objectStore('photos').getAll();
      req.onsuccess=()=>resolve((req.result as PhotoRow[]).filter((p)=>p.album===album));
      req.onerror=()=>reject(req.error);
    });
  } finally { db.close(); }
}
async function writePhoto(row: PhotoRow): Promise<void> {
  const db=await openDatabase();
  try {
    await new Promise<void>((resolve,reject)=>{
      const req=db.transaction('photos','readwrite').objectStore('photos').put(row);
      req.onsuccess=()=>resolve(); req.onerror=()=>reject(req.error);
    });
  } finally { db.close(); }
}
async function removePhoto(id:number):Promise<void> {
  const db=await openDatabase();
  try {
    await new Promise<void>((resolve,reject)=>{
      const req=db.transaction('photos','readwrite').objectStore('photos').delete(id);
      req.onsuccess=()=>resolve(); req.onerror=()=>reject(req.error);
    });
  } finally { db.close(); }
}

export function Gallery({ album, onClose }: { album:number; onClose:()=>void }) {
  const [photos, setPhotos] = useState<ViewPhoto[]>([]);
  const [selected, setSelected] = useState<ViewPhoto|null>(null);
  const [title,setTitle] = useState('');
  const [description,setDescription] = useState('');
  const [serial, setSerial] = useState(0);
  const [notice,setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const info = PORTALS[album] ?? PORTALS[0]!;

  useEffect(()=>{
    let cancelled=false; const urls: string[]=[];
    listPhotos(album).then((rows)=>{
      if(cancelled)return;
      const mapped=rows.filter((r):r is PhotoRow & {id:number}=>typeof r.id==='number')
        .map((r)=>{const url=URL.createObjectURL(r.blob);urls.push(url);return {...r,url};});
      setPhotos(mapped);
    }).catch(()=>{if(!cancelled)setNotice('Trình duyệt không mở được kho ảnh cục bộ.');});
    return ()=>{cancelled=true;for(const url of urls) URL.revokeObjectURL(url);};
  },[album,serial]);

  useEffect(()=>{
    if(!selected)return;
    setTitle(selected.title);setDescription(selected.description);
  },[selected]);

  async function upload(files:FileList|null){
    if(!files?.length)return;
    try{
      for(const file of Array.from(files)){
        if(!file.type.startsWith('image/'))continue;
        await writePhoto({ album, title:file.name.replace(/\.[^.]+$/,''), description:'Kỷ niệm của chúng mình', blob:file });
      }
      setNotice('Đã thêm ảnh vào thư viện trên trình duyệt này.');setSerial((n)=>n+1);
    }catch{setNotice('Không lưu được ảnh, có thể bộ nhớ trình duyệt đã đầy.');}
    if(fileInput.current)fileInput.current.value='';
  }
  async function save(){
    if(!selected)return;
    await writePhoto({id:selected.id,album,title,description,blob:selected.blob});
    setSelected(null);setSerial((n)=>n+1);setNotice('Đã lưu nội dung kỷ niệm.');
  }
  async function erase(){
    if(!selected || !window.confirm('Xóa ảnh này khỏi thư viện trên thiết bị?'))return;
    await removePhoto(selected.id);setSelected(null);setSerial((n)=>n+1);
  }
  const examples=['Những ngày đầu','Một chuyến đi','Một nụ cười','Lời hẹn tương lai'];
  return <div className="journey-modal" role="dialog" aria-modal="true" aria-label={`Thư viện ${info.title}`}>
    <div className="journey-modal-scrim" onClick={onClose}/>
    <section className="journey-gallery panel">
      <div className="journey-gallery-head">
        <div><p className="journey-eyebrow">{info.date} · BỘ SƯU TẬP ẢNH</p><h2>{info.title}</h2><p>Chọn ảnh để mở chi tiết. Ảnh của bạn được lưu trên thiết bị, không gửi lên máy chủ.</p></div>
        <button className="journey-icon-button" onClick={onClose} aria-label="Đóng cửa sổ">✕</button>
      </div>
      <div className="journey-gallery-tools">
        <input ref={fileInput} id="journey-photos" type="file" accept="image/*" multiple hidden onChange={(e)=>void upload(e.target.files)}/>
        <button className="journey-button journey-button-primary" onClick={()=>fileInput.current?.click()}>＋ Thêm ảnh kỷ niệm</button>
        <button className="journey-button" onClick={onClose}>Quay lại đường hầm</button>
      </div>
      <div className="journey-board">
        <div className="journey-rope top"/><div className="journey-rope bottom"/>
        <div className="journey-photos">
          {photos.length===0 ? examples.map((example,i)=><div className="journey-polaroid" key={example}>
            <div className={`journey-placeholder tone-${i}`}><span>✦</span></div>
            <strong>{example}</strong><small>Hãy thêm ảnh thật</small>
          </div>) : photos.map((photo)=><button className="journey-polaroid" key={photo.id} onClick={()=>setSelected(photo)}>
            <img src={photo.url} alt={photo.title}/><strong>{photo.title}</strong>
            <small>Xem ảnh và câu chuyện</small>
          </button>)}
        </div>
      </div>
      {notice && <p className="journey-notice" role="status">{notice}</p>}
    </section>
    {selected && <div className="journey-detail" role="dialog" aria-modal="true" aria-label="Chi tiết kỷ niệm">
      <div className="journey-detail-photo"><img src={selected.url} alt={selected.title}/></div>
      <div className="journey-detail-text">
        <button className="journey-icon-button journey-detail-close" onClick={()=>setSelected(null)} aria-label="Quay lại thư viện">✕</button>
        <p className="journey-eyebrow">KỶ NIỆM · {info.title}</p>
        <label>Tiêu đề<input value={title} onChange={(e)=>setTitle(e.target.value)} /></label>
        <label>Câu chuyện<textarea rows={6} value={description} onChange={(e)=>setDescription(e.target.value)} /></label>
        <div className="journey-detail-actions"><button className="journey-button journey-button-primary" onClick={()=>void save()}>Lưu nội dung</button><button className="journey-button" onClick={()=>setSelected(null)}>Về thư viện</button><button className="journey-button journey-danger" onClick={()=>void erase()}>Xóa ảnh</button></div>
      </div>
    </div>}
  </div>;
}
