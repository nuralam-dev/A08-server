import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {MongoClient}=require('mongodb');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || '/tmp/a08-delete-booking-browser/node_modules/playwright');
const client=new MongoClient(process.env.MONGODB_URI);await client.connect();
const accounts=[];let browser;let success=false;
try{
 browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const owner=await browser.newContext();const creator=await browser.newContext();
 const page=await owner.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 
 for(const [context,name]of [[owner,'Owner'],[creator,'Creator']]){
  const email=`audit-${randomUUID()}@example.com`;const password=`AuditAa!${randomUUID()}`;
  accounts.push({email,password});const signup=await context.request.post('http://localhost:3000/api/auth/sign-up/email',{headers:{Origin:'http://localhost:3000'},data:{name,email,password}});assert.equal(signup.status(),200);
 }
 const cookies=await owner.cookies();assert.ok(cookies.some(c=>c.httpOnly&&c.sameSite==='Lax'));console.log('PASS: Local session cookie HttpOnly and SameSite=Lax.');
 await owner.clearCookies();
 await page.goto('http://localhost:3000/login?next=%2Fdashboard%2Fadd-facility',{waitUntil:'domcontentloaded',timeout:90000});
 await page.getByLabel('Email Address').fill(accounts[0].email);await page.getByLabel('Password',{exact:true}).fill(accounts[0].password);await page.getByRole('button',{name:'Sign In',exact:true}).click();
 await page.waitForURL('**/dashboard/add-facility',{timeout:90000});
 await page.getByLabel('Studio Name *',{exact:true}).fill('Browser Audit Studio');
 await page.locator('#category').click();await page.getByRole('option',{name:'Photo Studio',exact:true}).click();
 await page.locator('#image').fill('http://localhost:3000/images/studio-1.jpg');await page.locator('#location').fill('Audit Location');
 await page.locator('#pricePerHour').fill('45');await page.locator('#capacity').fill('5');await page.locator('#securityDeposit').fill('20');await page.locator('#description').fill('Disposable studio for the full browser booking journey.');
 await page.getByRole('button',{name:'Add Studio',exact:true}).click();await page.getByText('Studio added successfully!',{exact:true}).waitFor();
 await page.goto('http://localhost:3000/dashboard/manage-facilities',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Browser Audit Studio'}).waitFor();
 assert.ok(await page.locator('article img').evaluate(img=>img.complete&&img.naturalWidth>0));
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));}
 await page.screenshot({path:'/tmp/studiospace-audit/dashboard-desktop.png',fullPage:true});
 await page.getByRole('link',{name:'Edit Browser Audit Studio'}).click();await page.waitForURL('**/dashboard/edit-facility/**');await page.locator('#name').fill('Edited Browser Audit Studio');await page.getByRole('button',{name:'Save Changes'}).click();await page.waitForURL('**/dashboard/manage-facilities');await page.getByRole('heading',{name:'Edited Browser Audit Studio'}).waitFor();
 const list=await(await owner.request.get('http://localhost:3000/api/backend/facilities/mine')).json();const id=list[0]._id;
 console.log('PASS: Browser sign-in, add studio, owner list with image, dedicated edit route and save.');
 const other=await creator.newPage();other.setDefaultTimeout(30000);other.on('pageerror',e=>errors.push(e.message));
 await other.goto('http://localhost:3000/dashboard/manage-facilities',{waitUntil:'domcontentloaded'});await other.getByRole('heading',{name:'No facilities added yet.'}).waitFor();
 await other.goto(`http://localhost:3000/dashboard/edit-facility/${id}`,{waitUntil:'domcontentloaded'});await other.getByRole('alert').filter({hasText:'You can only edit studios you added.'}).waitFor();
 await other.goto(`http://localhost:3000/facilities/${id}`,{waitUntil:'domcontentloaded'});await other.locator('#booking-date').fill('2030-12-20');await other.locator('#booking-start').fill('10:00');await other.locator('#booking-end').fill('11:00');await other.locator('#booking-guests').fill('2');await other.getByRole('button',{name:'Request booking'}).click();await other.getByText('Booking request saved!',{exact:true}).waitFor();
 await other.goto('http://localhost:3000/dashboard/my-booking',{waitUntil:'domcontentloaded'});await other.getByRole('heading',{name:'Studio Reservation'}).waitFor();
 await page.goto('http://localhost:3000/dashboard/my-booking',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'No bookings found'}).waitFor();
 console.log('PASS: Other user cannot see/edit owner facilities; books studio; own booking visible; first user sees no private bookings.');
 await other.getByRole('button',{name:'Delete Booking',exact:true}).click();await other.getByRole('alertdialog').getByRole('button',{name:'Delete',exact:true}).click();await other.getByRole('heading',{name:'No bookings found'}).waitFor();
 await page.goto('http://localhost:3000/dashboard/manage-facilities',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Delete Edited Browser Audit Studio'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Delete Facility',exact:true}).click();await page.getByRole('heading',{name:'No facilities added yet.'}).waitFor();
 await other.getByRole('button',{name:'Account menu for Creator'}).click();await other.getByRole('menuitem',{name:'Log Out'}).click();await other.waitForURL(url=>url.pathname==='/'||url.pathname==='/login');
 assert.equal((await creator.request.get('http://localhost:3000/api/backend/facilities/mine')).status(),401);
 await other.goto('http://localhost:3000/dashboard/my-booking',{waitUntil:'domcontentloaded'});await other.waitForURL('**/login?next=**');
 assert.deepEqual(errors,[]);console.log('PASS: Browser booking deletion, facility deletion, sign-out, auth redirect; no browser runtime errors.');success=true;
}finally{
 if(browser)await browser.close();
 const authDb=client.db();const users=await authDb.collection('user').find({email:{$in:accounts.map(a=>a.email)}}).toArray();
 const ids=users.flatMap(u=>[u._id,String(u._id)]);const apiDb=client.db('A08');
 const facilities=await apiDb.collection('facilities').find({ownerId:{$in:ids}}).toArray();
 await apiDb.collection('facilitiesBooking').deleteMany({userId:{$in:ids}});
 await apiDb.collection('bookingLocks').deleteMany({_id:{$in:facilities.map(f=>String(f._id))}});
 await apiDb.collection('facilities').deleteMany({ownerId:{$in:ids}});
 for(const collection of ['session','account'])await authDb.collection(collection).deleteMany({userId:{$in:ids}});
 await authDb.collection('user').deleteMany({email:{$in:accounts.map(a=>a.email)}});
 await client.close();console.log('Cleaned disposable browser accounts and their records only.');
}
process.exit(success?0:1);
