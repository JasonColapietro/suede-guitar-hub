import { billingConfiguration } from './config';
import { createBillingEngine } from './engine';
import { webOrderStore } from './store';
import { stripeBillingProvider } from './stripe';
import type { LearningTrack, StoreEnvironment } from '../learning-account/contracts';

export function billingRuntime() {
 const config=billingConfiguration(); if(!config)return null;
 const {provider,stripe}=stripeBillingProvider(config);
 return {config,stripe,engine:createBillingEngine({store:webOrderStore(),provider,livemode:config.livemode,priceId:config.priceId,productId:config.productId})};
}
export async function getWebLifetimeAccess(accountId:string):Promise<{tracks:LearningTrack[];environment:StoreEnvironment}|null> {
 const runtime=billingRuntime();if(!runtime)return null;
 const paid=await runtime.engine.access(accountId);
 return {tracks:paid?['guitar','voice']:[],environment:runtime.config.livemode?'Production':'Sandbox'};
}

export async function webPurchaseHistory(accountId:string) {
 const config=billingConfiguration();if(!config)return [];
 return webOrderStore().history(accountId,config.livemode);
}
