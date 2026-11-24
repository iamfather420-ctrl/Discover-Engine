import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { InventionService } from './invention-service.js';
import { ProjectRepository, connectDb } from './project-repository.js';
import { randomUUID } from 'node:crypto';
import { reviewAssertion, bearerMatches } from './assertion-api.js';
import { normalizeProjectInput } from './validation.js';
import type { AddressInfo } from 'node:net';
type Handler = (req: Request, res: Response) => Promise<unknown>;
const wrap = (fn: Handler) => (req: Request, res: Response, _next: NextFunction) => {
 fn(req,res).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  console.error('[invention-service]',message);
  if (!res.headersSent) res.status(/not found/i.test(message)?404:400).json({message});
 });
};
function requireApiBearer(req: Request, res: Response, next: NextFunction) {
 const expected = process.env.DISCOVERY_API_TOKEN ?? '';
 if (expected.length < 32) return res.status(503).json({ error: 'discovery_auth_not_configured', publishable: false });
 if (!bearerMatches(req.header('authorization'), expected)) return res.status(401).json({ error: 'discovery_authentication_required', publishable: false });
 next();
}
export async function run() {
 const app=express();
 const useDb=await connectDb();
 console.log(`[invention-service] storage: ${useDb?'MongoDB':'in-memory (MONGO_URL not set)'}`);
 const engine=InventionService.from(new ProjectRepository(useDb));
 const port=process.env.PORT||4000;
 app.use(express.json({limit:'1mb'}));
 app.get('/',(_req,res)=>res.json({name:'daisy-invention-engine',status:'ok',storage:useDb?'mongodb':'memory'}));
 // All project APIs are authenticated. Missing credentials fail closed with 503.
 app.use('/projects', requireApiBearer);
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
 app.delete('/projects/:id',wrap(async(_req,res)=>{await engine.remove(String(_req.params.id));res.status(204).end();}));
 app.post('/projects/:id/evidence/measurements',wrap(async(req,res)=>{
  const record=await engine.ingestMeasurement(String(req.params.id),req.body);
  res.status(201).json(record);
 }));
 app.post('/projects/:id/inventions',wrap(async(req,res)=>{
  const ids=req.body?.componentIds;
  if(!Array.isArray(ids)||ids.some((id:unknown)=>typeof id!=='string')) throw new Error('componentIds must be an array of component ID strings');
  res.status(201).json(await engine.inventFrom(String(req.params.id),ids));
 }));
 // Permanently disabled: simulation output is not experimental evidence.
 app.post('/projects/:id/inventions/:inv/experiments',(_req,res)=>{
  res.status(410).json({message:'Simulation disabled: synthetic model output is not real experimental evidence.'});
 });
 app.get('/projects/:id/evaluation',wrap(async(req,res)=>res.json(await engine.evaluate(String(req.params.id)))));
 app.get('/projects/:id/inventions/:inv/spec',wrap(async(req,res)=>res.type('text/markdown').send(await engine.spec(String(req.params.id),String(req.params.inv)))));
 app.get('/projects/:id/export',wrap(async(req,res)=>{
  const ids=typeof req.query.inventions==='string'?req.query.inventions.split(',').filter(Boolean):undefined;
  const {name,data}=await engine.exportPackage(String(req.params.id),ids);
  res.setHeader('Content-Type','application/zip');
  res.setHeader('Content-Disposition',`attachment; filename="${name}"`);
  res.send(data);
 }));
 app.post('/v1/assertions', (req, res) => {
  const expected = process.env.DISCOVERY_API_TOKEN ?? '';
  if (expected.length < 32) return res.status(503).json({ error: 'discovery_auth_not_configured', publishable: false });
  if (!bearerMatches(req.header('authorization'), expected)) return res.status(401).json({ error: 'discovery_authentication_required', publishable: false });
  const discovery = req.body?.discovery;
  const claim = req.body?.claim;
  if (!discovery || !claim || typeof claim.text !== 'string' || typeof discovery.abstract !== 'string') {
    return res.status(400).json({ error: 'invalid_assertion', publishable: false });
  }
  const requestId = /^[A-Za-z0-9._:-]{8,80}$/.test(req.header('x-request-id') ?? '') ? String(req.header('x-request-id')) : randomUUID();
  res.setHeader('x-request-id', requestId);
  res.json({ ...reviewAssertion(discovery, claim), request_id: requestId });
 });
 const server=app.listen(port);
 await new Promise<void>((resolve, reject) => {
  server.once('listening', () => resolve());
  server.once('error', reject);
 });
 const bound=(server.address() as AddressInfo).port;
 console.log(`[invention-service] ready port=${bound}`);
 return {port: bound, stop:async()=>{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}};
}
