const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || '/home/shadow/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const out = path.resolve(__dirname, '../public/assets/screenshots');
fs.mkdirSync(out, {recursive:true});
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || '/home/shadow/.cache/ms-playwright/chromium-1247/chrome-linux64/chrome', args:['--no-sandbox']});
  const context = await browser.newContext({viewport:{width:430,height:900},deviceScaleFactor:2,colorScheme:'light'});
  const page = await context.newPage();
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  const save = async(name) => {await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(1000); await page.screenshot({path:path.join(out,name+'.png')}); fs.writeFileSync(path.join(out,name+'.txt'), await page.locator('body').innerText());};
  try {
    await page.goto(process.env.APP_URL || 'http://localhost:8081');
    await page.getByRole('button',{name:'Scan a landmark',exact:true}).waitFor();
    await save('home');
    await page.getByRole('button',{name:'Scan a landmark',exact:true}).click();
    await save('camera');
    console.log(await page.locator('body').innerText());
    await page.getByRole('button',{name:/Choose a starting landmark manually/}).click();
    await page.getByRole('textbox',{name:'Search places'}).fill('circuit');
    await save('origin-picker');
    await page.getByRole('button',{name:'Ayala Malls Circuit',exact:true}).click();
    await save('origin-selected');
    console.log(await page.locator('body').innerText());
    await page.getByRole('button',{name:/Destination:/}).click();
    await page.getByRole('textbox',{name:'Search places'}).fill('one ayala');
    await save('destination-picker');
    await page.getByRole('button',{name:'One Ayala by Ayala Malls',exact:true}).click();
    await save('journey');
    await page.getByText('P2P bus: Circuit Makati–One Ayala P2P',{exact:true}).scrollIntoViewIfNeeded();
    await save('boarding');
    console.log(await page.locator('body').innerText());
    await context.setOffline(true);
    // Change the actual destination first: reselecting the same state could merely
    // leave the already-rendered online results visible without a fresh lookup.
    await page.getByRole('button',{name:/Destination:/}).click();
    await page.getByRole('textbox',{name:'Search places'}).fill('glorietta');
    await page.getByRole('button',{name:'Glorietta by Ayala',exact:true}).click();
    await page.getByRole('button',{name:'Destination: Glorietta by Ayala',exact:true}).waitFor();
    await save('offline-new-destination');
    await page.getByRole('button',{name:/Destination:/}).click();
    await page.getByRole('textbox',{name:'Search places'}).fill('one ayala');
    await page.getByRole('button',{name:'One Ayala by Ayala Malls',exact:true}).click();
    await save('offline-journey');
    await page.getByText('P2P bus: Circuit Makati–One Ayala P2P',{exact:true}).scrollIntoViewIfNeeded();
    await save('offline-boarding');
    const text=await page.locator('body').innerText();
    if(!text.includes('CityFlats')) throw new Error('Offline journey did not show boarding guidance');
    fs.writeFileSync(path.join(out,'capture-evidence.json'),JSON.stringify({capturedAt:new Date().toISOString(),url:page.url(),viewport:{width:430,height:900},deviceScaleFactor:2,offlineLookupPassed:true,offlineDestinationChanges:['glorietta','one_ayala'],errors,limitations:'Web manual workflow. Initial app load online; networking disabled before changing destination to Glorietta and then back to One Ayala. No physical-device recognition capture.'},null,2));
    if(errors.length) throw new Error(errors.join('\n'));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
