import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
const source=readFileSync(new URL('../public/reminder-notification.js',import.meta.url),'utf8')
test('reminder notification focuses this app without navigating an unsaved form',async()=>{
 let listener,pending,focused=false,closed=false
 runInNewContext(source,{URL,self:{registration:{scope:'https://example.com/app/'},addEventListener:(_,fn)=>{listener=fn},clients:{matchAll:async()=>[{url:'https://example.com/other/',focus:()=>assert.fail('wrong app')},{url:'https://example.com/app/projects/new',focus:async()=>{focused=true}}],openWindow:()=>assert.fail('already open')}}})
 listener({notification:{tag:'lineyar-due-reminders',close:()=>{closed=true}},waitUntil:p=>{pending=p}});await pending
 assert.ok(focused&&closed)
})
test('reminder notification opens reminders under the deployment base when app is closed',async()=>{
 let listener,pending,opened
 runInNewContext(source,{URL,self:{registration:{scope:'https://example.com/app/'},addEventListener:(_,fn)=>{listener=fn},clients:{matchAll:async()=>[],openWindow:async url=>{opened=url}}}})
 listener({notification:{tag:'lineyar-due-reminders',close:()=>{}},waitUntil:p=>{pending=p}});await pending
 assert.equal(opened,'https://example.com/app/reminders')
})
