import {createECDH} from 'node:crypto'
import {existsSync,mkdirSync,writeFileSync} from 'node:fs'
const privatePath='.env.vapid.local',publicPath='src/config/push-public-key.ts'
if(existsSync(privatePath)||existsSync(publicPath))throw Error('VAPID already exists; keep the current pair to preserve subscriptions.')
const key=createECDH('prime256v1');key.generateKeys();mkdirSync('src/config',{recursive:true})
writeFileSync(privatePath,'VAPID_PRIVATE_KEY='+key.getPrivateKey().toString('base64url')+'\nVAPID_PUBLIC_KEY='+key.getPublicKey().toString('base64url')+'\n',{flag:'wx',mode:0o600})
writeFileSync(publicPath,`export const defaultPushPublicKey=${JSON.stringify(key.getPublicKey().toString('base64url'))}\n`,{flag:'wx'})
console.log('Public key: '+publicPath+'; private server environment: '+privatePath+' (git-ignored).')
