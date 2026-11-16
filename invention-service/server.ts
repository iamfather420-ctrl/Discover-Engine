import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { InventionService } from './invention-service.js';
import { ProjectRepository, connectDb } from './project-repository.js';
import { normalizeProjectInput } from './validation.js';
type Handler = (req: Request, res: Response) => Promise<unknown>;
const wrap = (fn: Handler) => (req: Request, res: Response, _next: NextFunction) => {
 fn(req,res).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  console.error('[invention-service]',message);
  if (!res.headersSent) res.status(/not found/i.test(message)?404:400).json({message});
 });
};
export async function run() {
 const app=express();
 const useDb=await connectDb();
 console.log(`[invention-service] storage: ${useDb?'MongoDB':'in-memory (MONGO_URL not set)'}`);
 const engine=InventionService.from(new ProjectRepository(useDb));
 const port=process.env.PORT||4000;
 app.use(express.json({limit:'1mb'}));
 app.get('/',(_req,res)=>res.json({name:'daisy-invention-engine',status:'ok',storage:useDb?'mongodb':'memory'}));
 app.get('/projects',wrap(async(_req,res)=>res.json(await engine.list())));
 app.post('/projects',wrap(async(req,res)=>{
  const input=normalizeProjectInput(req.body?.query,req.body?.domains);
  res.status(201).json(await engine.start(input.query,input.domains));
 }));
 app.get('/projects/:id',wrap(async(req,res)=>{
  const project=await engine.get(String(req.params.id));
  if(!project) throw new Error('Project not found');
  res.json(project);
 }));
 app.delete('/projects/:id',wrap(async(req,res)=>{await engine.remove(String(req.params.id));res.status(204).end();}));
 app.post('/projects/:id/inventions',wrap(async(req,res)=>{
  const ids=req.body?.componentIds;
  if(!Array.isArray(ids)||ids.some((id:unknown)=>typeof id!=='string')) throw new Error('componentIds must be an array of component ID strings');
  res.status(201).json(await engine.inventFrom(String(req.params.id),ids));
 }));
 app.post('/projects/:id/inventions/:inv/experiments',wrap(async(req,res)=>{
  const trials=req.body?.trials??2000, baselineNoise=req.body?.baselineNoise??3;
  if(typeof trials!=='number'||typeof baselineNoise!=='number') throw new Error('Trials and baseline noise must be numbers');
  res.status(201).json(await engine.experiment(String(req.params.id),String(req.params.inv),{trials,baselineNoise}));
 }));
 app.get('/projects/:id/evaluation',wrap(async(req,res)=>res.json(await engine.evaluate(String(req.params.id)))));
 app.get('/projects/:id/inventions/:inv/spec',wrap(async(req,res)=>res.type('text/markdown').send(await engine.spec(String(req.params.id),String(req.params.inv)))));
 app.get('/projects/:id/export',wrap(async(req,res)=>{
  const ids=typeof req.query.inventions==='string'?req.query.inventions.split(',').filter(Boolean):undefined;
  const {name,data}=await engine.exportPackage(String(req.params.id),ids);
  res.setHeader('Content-Type','application/zip');
  res.setHeader('Content-Disposition',`attachment; filename="${name}"`);
  res.send(data);
 }));
 const server=app.listen(port,()=>console.log(`🚀  Invention service ready at: http://localhost:${port}`));
 return {port,stop:async()=>{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}};
}