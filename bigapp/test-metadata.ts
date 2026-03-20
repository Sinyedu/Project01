import exifr from 'exifr';
import path from 'path';

async function test() {
  const filePath = path.join(process.cwd(), 'samples', 'test-gps.jpg');
  console.log('Testing file:', filePath);
  try {
    const output = await exifr.parse(filePath, { gps: true });
    console.log('EXIF Output:', JSON.stringify(output, null, 2));
    
    const gps = await exifr.gps(filePath);
    console.log('GPS Method Output:', JSON.stringify(gps, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
