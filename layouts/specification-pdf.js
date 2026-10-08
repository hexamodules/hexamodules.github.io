import {enquirySelections} from './dealer-enquiry.js?v=20261008-complete';
// A local canvas supplies Japanese glyphs without a font service. The PDF contains
// one A4 image and a real URI annotation, so the studio link remains clickable.
const ink='#263e35',muted='#738078';
const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Image unavailable'));image.src=src;});
export function specificationRows(data,catalogue,lang){
 const en=lang==='en';
 const modules=enquirySelections(catalogue,data.configuration,lang).filter(item=>item.key.startsWith('module:')).map(item=>({label:en?'Furniture':'家具',value:item.label}));
 // Exclude budget rows too: overseas vehicle preferences can contain customer-entered amounts.
 const nonFinancial=(row)=>!/予算|価格|金額|卸|取り分|工数|施工日数|budget|price|cost|margin|hours/i.test(row.label)&&!/(?:\b(?:JPY|AUD|USD|EUR|GBP)\b|[¥￥$€£]|\d[\d,.]*\s*円)/.test(row.value);
 return [...modules,...data.customerSummary.filter(nonFinancial)].map(({label,value})=>({label:String(label).replace(/DEALER OPTION/g,'').trim(),value:/マットレス|mattress/i.test(label)?String(value).replace(/未選択/g,'なし').replace(/Not selected/gi,'None'):String(value)}));
}
function wrap(ctx,text,width){
 const lines=[];let line='';
 for(const char of text){if(char==='\n'){lines.push(line);line='';continue;}if(line&&ctx.measureText(line+char).width>width){const space=line.lastIndexOf(' ');if(/[A-Za-z0-9]/.test(char)&&space>line.length/2){lines.push(line.slice(0,space));line=line.slice(space+1)+char;}else{lines.push(line);line=char;}}else line+=char;}
 if(line)lines.push(line);return lines;
}
export function imagePdf(jpeg,width,height,url,linkRect){
 const encoder=new TextEncoder(),chunks=[],offsets=[0];let length=0;
 const push=value=>{const bytes=typeof value==='string'?encoder.encode(value):value;chunks.push(bytes);length+=bytes.length;};
 const object=(id,body)=>{offsets[id]=length;push(`${id} 0 obj\n${body}\nendobj\n`);};
 push('%PDF-1.4\n');
 object(1,'<< /Type /Catalog /Pages 2 0 R >>');
 object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
 object(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R /Annots [6 0 R] >>');
 const binary=Uint8Array.from(atob(jpeg.split(',')[1]),c=>c.charCodeAt(0));
 offsets[4]=length;push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${binary.length} >>\nstream\n`);push(binary);push('\nendstream\nendobj\n');
 const content='q 595 0 0 842 0 0 cm /Im0 Do Q\n';
 object(5,`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`);
 const safe=new URL(url);if(!['http:','https:'].includes(safe.protocol))throw Error('Invalid studio URL');
 // URLs are ASCII percent-encoded; PDF literal-string delimiters are escaped.
 const uri=safe.href.replace(/[^\x20-\x7e]/g,c=>encodeURIComponent(c)).replace(/[\\()]/g,'\\$&');
 object(6,`<< /Type /Annot /Subtype /Link /Rect [${linkRect.join(' ')}] /Border [0 0 0] /A << /S /URI /URI (${uri}) >> >>`);
 const xref=length;push('xref\n0 7\n0000000000 65535 f \n');for(let i=1;i<=6;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
 push(`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
 return new Blob(chunks,{type:'application/pdf'});
}
export async function createSpecification({data,catalogue,images,lang='ja'}){
 const en=lang==='en',rows=specificationRows(data,catalogue,lang);
 const layoutUrl=new URL(data.url,location.href);layoutUrl.searchParams.set('complete','1');
 if(!images?.[0])throw Error('Completed van image unavailable');
 await document.fonts.ready;
 const [logo,photo]=await Promise.all([loadImage(new URL('./assets/hexa-logo.jpg',import.meta.url).href),loadImage(images[0])]);
 const canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1684;
 const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#fff';ctx.fillRect(0,0,595,842);
 const font=(size,bold=false)=>{ctx.font=`${bold?'600':'400'} ${size}px -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`;ctx.fillStyle=ink;};
 ctx.drawImage(logo,34,32,82,30.75);font(9);ctx.textAlign='right';
 ctx.fillText((en?'Layout number: ':'レイアウト番号：')+data.layoutNumber,561,43);
 const date=new Date().toLocaleDateString(en?'en-GB':'ja-JP');ctx.fillText((en?'Date: ':'日付：')+date,561,59);ctx.textAlign='left';
 font(23,true);ctx.fillText(en?'Specification':'仕様書',34,94);
 const box={x:34,y:110,w:527,h:272};ctx.fillStyle='#f1f2eb';ctx.fillRect(box.x,box.y,box.w,box.h);
 const scale=Math.min(box.w/photo.width,box.h/photo.height),w=photo.width*scale,h=photo.height*scale;
 ctx.drawImage(photo,box.x+(box.w-w)/2,box.y+(box.h-h)/2,w,h);
 ctx.fillStyle='#e5eddd';ctx.fillRect(34,392,527,57);font(16,true);
 const message=en?'Discuss this layout with your dealer.':'このレイアウトで、取扱店にご相談いただけます';
 ctx.fillText(message,46,426);font(17);ctx.fillText(en?'Your selected specification':'お選びいただいた仕様',34,480);
 // Reserve the complete URL before fitting the specification rows.
 font(7);
 const linkText=(data.layoutNumber?(en?'Layout ':'レイアウト番号 ')+data.layoutNumber+(en?' · ':' ・ '):'')+layoutUrl.href;
 const linkLines=wrap(ctx,linkText,503),linkHeight=58+linkLines.length*9,linkTop=812-linkHeight;
 const rowSpace=linkTop-27-494;
 // Measure first, then fit the complete list into one page. Never truncate rows.
 let size=9,measured,total;
 do{
  font(size);measured=rows.map(row=>({...row,lines:wrap(ctx,row.value,245)}));total=0;
  for(let i=0;i<measured.length;i+=2)total+=Math.max(measured[i].lines.length,measured[i+1]?.lines.length||0)*(size+3)+size+12;
  if(total<=rowSpace)break;size-=.25;
 }while(size>=6.5);
 if(total>rowSpace)throw Error('Specification exceeds one page');
 let y=494;
 for(let i=0;i<measured.length;i+=2){
  const rowHeight=Math.max(measured[i].lines.length,measured[i+1]?.lines.length||0)*(size+3)+size+12;
  for(let column=0;column<2;column++){
   const row=measured[i+column];if(!row)continue;const x=34+column*271;
   font(size);ctx.fillStyle=muted;ctx.fillText(row.label,x+4,y+size);
   font(size);row.lines.forEach((line,n)=>ctx.fillText(line,x+4,y+size+5+(n+1)*(size+3)));
   ctx.strokeStyle='#d7ded0';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x,y+rowHeight);ctx.lineTo(x+256,y+rowHeight);ctx.stroke();
  }
  y+=rowHeight;
 }
 font(8);ctx.fillText(en?'Images are for illustration only.':'画像はイメージです。',34,linkTop-12);
 ctx.strokeStyle='#bdcdae';ctx.lineWidth=1;ctx.strokeRect(34,linkTop,527,linkHeight);
 font(14,true);ctx.fillText(en?'You can open this layout anytime.':'このレイアウトは、いつでも開けます。',46,linkTop+20);
 ctx.fillStyle=ink;ctx.fillRect(46,linkTop+28,503,22);
 font(11,true);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(en?'Open in the Layout Studio ↗':'レイアウトスタジオで開く ↗',297.5,linkTop+43);ctx.textAlign='left';
 font(7);linkLines.forEach((line,i)=>ctx.fillText(line,46,linkTop+61+i*9));
 return imagePdf(canvas.toDataURL('image/jpeg',.94),canvas.width,canvas.height,layoutUrl.href,[34,30,561,842-linkTop]);
}
export async function downloadSpecification(options){
 const blob=await createSpecification(options),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`Hexa-${options.lang==='en'?'Specification':'仕様書'}-${options.data.layoutNumber}.pdf`;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
