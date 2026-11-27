import { randomUUID } from 'node:crypto';
import type { Evaluation, ExperimentParams, ExperimentResult, Invention, Project } from './types.js';
import { DEFAULT_LENSES, discover } from './discover.js';
import { verifySourceMetadataBatch } from './source-verification.js';
import { extractEvidenceClaims } from './claim-evidence.js';
import { understand } from './understand.js';
import { connect } from './connect.js';
import { invent, inventCustom } from './invent.js';
import { evaluate } from './evaluate.js';
import { buildExportPackage, designSpec } from './export-package.js';
import { ProjectRepository } from './project-repository.js';
import { normalizeProjectInput, validateExperimentParams } from './validation.js';
import { createMeasurementRecord } from './measurement-evidence.js';
export class InventionService {
 constructor(private repo:ProjectRepository){}
 list(){return this.repo.list();}
 get(id:string){return this.repo.get(id);}
 remove(id:string){return this.repo.remove(id);}
 async start(query:string,domains?:string[]):Promise<Project>{
  const input=normalizeProjectInput(query,domains), now=new Date().toISOString();
  const project:Project={id:randomUUID(),query:input.query,domains:(input.domains?.length?input.domains:DEFAULT_LENSES).slice(0,5),status:'running',stage:'discover',log:[],discoveries:[],evidenceClaims:[],components:[],connections:[],inventions:[],createdAt:now,updatedAt:now};
  await this.repo.save(project);
  this.runPipeline(project).catch(async error=>{
   project.status='error';project.error=error instanceof Error?error.message:String(error);project.log.push(`Error: ${project.error}`);
   try{await this.repo.save(project);}catch(saveError){console.error('[invention-service] failed to persist pipeline error:',saveError);}
  });
  return project;
 }
 private async runPipeline(project:Project){
  const log=(message:string)=>project.log.push(`${new Date().toISOString().slice(11,19)} ${message}`);
  log(`Discover: searching OpenAlex + arXiv for "${project.query}" and ${project.domains.length} adjacent domains`);
  await this.repo.save(project);
  const found=await discover(project.query,project.domains,log);
  project.discoveries=await verifySourceMetadataBatch(found);
  project.evidenceClaims=extractEvidenceClaims(project.discoveries);
  log(`Claim provenance: recorded ${project.evidenceClaims.length} exact abstract-sentence leads; none are automatically marked scientifically verified.`);
  const verified=project.discoveries.filter(d=>d.sourceVerification==='verified_metadata').length;
  const mismatched=project.discoveries.filter(d=>d.sourceVerification==='metadata_mismatch').length;
  log(`Bibliographic metadata: ${verified} matched, ${mismatched} mismatched, ${project.discoveries.length-verified-mismatched} unverified. Abstract claims are still unverified.`);
  if(!project.discoveries.length) throw new Error('No sources found — try a broader query.');
  const eligibleSources=project.discoveries.filter(d=>d.sourceVerification==='verified_metadata');
  if(!eligibleSources.length) throw new Error('No sources passed canonical identifier, title, year and abstract-integrity checks. No components or inventions were generated.');
  project.stage='understand';await this.repo.save(project);
  project.components=understand(eligibleSources,project.query);
  log(`Understand: extracted ${project.components.length} technical components`);
  project.stage='connect';await this.repo.save(project);
  project.connections=connect(project.components,eligibleSources);
  log(`Connect: ranked ${project.connections.length} candidate connections (${project.connections.filter(c=>c.type==='not_observed_in_sample').length} not observed in retrieved sample)`);
  project.stage='invent';await this.repo.save(project);
  project.inventions=invent(project.query,project.components,project.connections,eligibleSources);
  log(`Invent: generated ${project.inventions.length} engineering designs`);
  log('Experiment: no experiment is claimed; designs remain hypotheses pending measured validation');
  project.stage='ready';project.status='ready';log('Pipeline complete: designs remain hypotheses; claim review and measured validation are pending. Workflow readiness is not evidence verification.');await this.repo.save(project);
 }
 async ingestMeasurement(projectId:string,input:unknown){
  const project=await this.require(projectId);
  const record=createMeasurementRecord(input);
  project.evidenceMeasurements=[...(project.evidenceMeasurements||[]),record];
  project.log.push(`Measurement ingested: ${record.id}; status measured_unverified. No verification is implied.`);
  await this.repo.save(project);
  return record;
 }
 async inventFrom(projectId:string,componentIds:string[]):Promise<Invention>{
  if(!Array.isArray(componentIds)||componentIds.length<2||componentIds.length>4||componentIds.some(id=>typeof id!=='string'||!id.trim())||new Set(componentIds).size!==componentIds.length) throw new Error('Select 2–4 unique component IDs');
  const project=await this.require(projectId),eligible=project.discoveries.filter(d=>d.sourceVerification==='verified_metadata'),eligibleIds=new Set(eligible.map(d=>d.id)),parts=project.components.filter(c=>componentIds.includes(c.id));
  if(parts.length!==componentIds.length) throw new Error('One or more selected components were not found');
  if(parts.some(part=>part.sourceIds.length===0||part.sourceIds.some(id=>!eligibleIds.has(id)))) throw new Error('Selected components lack canonical metadata-verified source provenance');
  const invention=inventCustom(project.query,parts,project.connections,eligible);
  project.inventions=[invention,...project.inventions.filter(item=>item.id!==invention.id)];await this.repo.save(project);return invention;
 }
 async experiment(projectId:string,inventionId:string,params:ExperimentParams):Promise<ExperimentResult>{
  validateExperimentParams(params);
  throw new Error('Simulation is disabled: it cannot produce real experimental evidence. Submit traceable measured data through a validated evidence workflow.');
 }
 async evaluate(projectId:string):Promise<Evaluation>{return evaluate(await this.require(projectId));}
 async spec(projectId:string,inventionId:string):Promise<string>{
  const project=await this.require(projectId),invention=project.inventions.find(item=>item.id===inventionId);
  if(!invention) throw new Error('Invention not found');return designSpec(project,invention);
 }
 async exportPackage(projectId:string,inventionIds?:string[]):Promise<{name:string;data:Buffer}>{
  const project=await this.require(projectId),data=await buildExportPackage(project,evaluate(project),inventionIds);
  return {name:`daisy-${project.query.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40)}.zip`,data};
 }
 private async require(id:string):Promise<Project>{const project=await this.repo.get(id);if(!project)throw new Error('Project not found');return project;}
 static from(repo:ProjectRepository){return new InventionService(repo);}
}