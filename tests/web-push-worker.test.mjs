import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
const source=readFileSync(new URL('../public/reminder-notification.js',import.meta.url),'utf8')
function setup(){const handlers={},notices=[],opened=[];runInNewContext(source,{URL,self:{addEventListener:(name,fn)=>handlers[name]=fn,registration:{scope:'https://example.com/app/',showNotification:async(...args)=>notices.push(args)},clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}}});return {handlers,notices,opened}}
test('every push displays a notification, including malformed payload',async()=>{for(const data of [undefined,{json:()=>{throw Error('bad')}},{json:()=>null},{json:()=>({title:'سلام',body:'یادآوری',url:'projects/p1'})}]){const {handlers,notices}=setup();let pending;handlers.push({data,waitUntil:p=>pending=p});await pending;assert.equal(notices.length,1);assert.equal(notices[0][1].tag,'lineyar-push');assert.ok(notices[0][0])}})
test('push clicks only open scoped URLs and never follow external or script targets',async()=>{for(const [input,expected] of [['projects/p1','https://example.com/app/projects/p1'],['https://evil.example/','https://example.com/app/reminders'],['javascript:alert(1)','https://example.com/app/reminders'],['../outside','https://example.com/app/reminders']]){const {handlers,opened}=setup();let pending;handlers.notificationclick({notification:{tag:'lineyar-push',data:{url:input},close(){}},waitUntil:p=>pending=p});await pending;assert.equal(opened[0],expected)}})
