import type { ExperimentParams, ExperimentResult, Invention } from './types.js';
import { hash, seededRandom } from './text-utils.js';
import { validateExperimentParams } from './validation.js';
function normal(rand:()=>number):number{const u=Math.max(rand(),1e-12),v=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
/** Deterministic Monte Carlo model only; it does not establish physical or laboratory validity. */
export function runExperiment(inv:Invention,params:ExperimentParams,runIndex=0):ExperimentResult{
 const valid=validateExperimentParams(params),trials=valid.trials,rand=seededRandom(hash(inv.id)+runIndex*7919);
 const failureChance=(1-inv.maturity)*0.12+(inv.complexity-1)*0.02,integrationLoss=inv.complexity*1.2,samples:number[]=[];
 for(let i=0;i<trials;i++){
  if(rand()<failureChance){samples.push(-Math.abs(normal(rand))*10-5);continue;}
  const gain=inv.expectedGain+normal(rand)*inv.uncertainty,loss=Math.abs(normal(rand))*integrationLoss,baselineDrift=normal(rand)*valid.baselineNoise;
  samples.push(gain-loss-baselineDrift);
 }
 samples.sort((a,b)=>a-b);
 const mean=samples.reduce((s,x)=>s+x,0)/trials,std=Math.sqrt(samples.reduce((s,x)=>s+(x-mean)**2,0)/trials),pct=(p:number)=>samples[Math.floor(p*(trials-1))];
 const probBetter=samples.filter(x=>x>0).length/trials,probHitsTarget=samples.filter(x=>x>=inv.expectedGain*0.8).length/trials;
 const lo=Math.floor(samples[0]),hi=Math.ceil(samples[trials-1]),bins=16,width=Math.max(0.5,(hi-lo)/bins);
 const histogram=Array.from({length:bins},(_,i)=>({from:lo+i*width,to:lo+(i+1)*width,count:0}));
 for(const x of samples) histogram[Math.min(bins-1,Math.floor((x-lo)/width))].count++;
 const verdict=probBetter>=0.7&&pct(0.05)>-15?'supported':probBetter<0.4?'rejected':'inconclusive',r=(n:number)=>Math.round(n*100)/100;
 return {id:`${inv.id}-${Date.now().toString(36)}`,createdAt:new Date().toISOString(),params:{trials,baselineNoise:valid.baselineNoise},meanImprovement:r(mean),stdDev:r(std),p5:r(pct(0.05)),p95:r(pct(0.95)),probBetter:r(probBetter),probHitsTarget:r(probHitsTarget),histogram:histogram.map(h=>({from:r(h.from),to:r(h.to),count:h.count})),verdict};
}