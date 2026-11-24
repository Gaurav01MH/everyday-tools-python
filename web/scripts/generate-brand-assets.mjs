import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const output = fileURLToPath(new URL("../dist/", import.meta.url));
await mkdir(join(output, "icons"), { recursive: true });

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const result = Buffer.alloc(12 + data.length);
  result.writeUInt32BE(data.length, 0);
  body.copy(result, 4);
  result.writeUInt32BE(crc32(body), 8 + data.length);
  return result;
}
function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const offset = y * (width * 4 + 1);
    rows[offset] = 0;
    pixels.copy(rows, offset + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}
function canvas(width, height, background) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let p = 0; p < pixels.length; p += 4) {
    pixels[p] = background[0]; pixels[p+1] = background[1];
    pixels[p+2] = background[2]; pixels[p+3] = 255;
  }
  function rect(x, y, w, h, color) {
    const left = Math.max(0, Math.floor(x)), top = Math.max(0, Math.floor(y));
    const right = Math.min(width, Math.ceil(x+w)), bottom = Math.min(height, Math.ceil(y+h));
    for (let py = top; py < bottom; py += 1) for (let px = left; px < right; px += 1) {
      const i = (py*width+px)*4;
      pixels[i]=color[0]; pixels[i+1]=color[1]; pixels[i+2]=color[2]; pixels[i+3]=255;
    }
  }
  function roundRect(x,y,w,h,r,color) {
    for(let py=Math.floor(y);py<Math.ceil(y+h);py++) for(let px=Math.floor(x);px<Math.ceil(x+w);px++) {
      const cx=px<x+r?x+r:px>x+w-r?x+w-r:px;
      const cy=py<y+r?y+r:py>y+h-r?y+h-r:py;
      if((px-cx)*(px-cx)+(py-cy)*(py-cy)<=r*r) rect(px,py,1,1,color);
    }
  }
  return {pixels,rect,roundRect};
}
function icon(size) {
  const c=canvas(size,size,[18,47,72]);
  const x=size*.29,y=size*.17,w=size*.42,h=size*.65;
  c.roundRect(x,y,w,h,size*.04,[255,255,255]);
  c.rect(x+w*.55,y,w*.45,h*.15,[80,154,214]);
  c.rect(x+w*.18,y+h*.38,w*.64,size*.025,[80,154,214]);
  c.rect(x+w*.18,y+h*.52,w*.64,size*.022,[201,216,230]);
  c.rect(x+w*.18,y+h*.66,w*.48,size*.022,[201,216,230]);
  return encodePng(size,size,c.pixels);
}
await writeFile(join(output,"icons","icon-192.png"),icon(192));
await writeFile(join(output,"icons","icon-512.png"),icon(512));
await writeFile(join(output,"icons","apple-touch-icon.png"),icon(180));

const width=1200,height=630;
const social=canvas(width,height,[242,247,252]);
social.roundRect(48,48,1104,534,28,[255,255,255]);
social.roundRect(105,112,200,200,25,[18,47,72]);
social.roundRect(170,150,75,125,8,[255,255,255]);
social.rect(215,150,30,21,[80,154,214]);
social.rect(187,207,43,7,[80,154,214]);
social.rect(187,233,43,7,[201,216,230]);
social.rect(187,259,32,7,[201,216,230]);
social.roundRect(350,132,650,18,9,[18,47,72]);
social.roundRect(350,194,570,12,6,[80,154,214]);
social.roundRect(350,258,690,4,2,[214,225,236]);
social.roundRect(350,318,485,12,6,[78,100,120]);
social.roundRect(350,378,570,12,6,[78,100,120]);
social.roundRect(350,438,460,12,6,[78,100,120]);
social.roundRect(350,500,600,32,10,[232,241,248]);
await writeFile(join(output,"og-files-format.png"),encodePng(width,height,social.pixels));
console.log("Generated PNG app icons and 1200x630 Open Graph preview.");
