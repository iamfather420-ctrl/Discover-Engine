import { describe, expect, it } from 'vitest';
import { normalizeProjectInput, validateExperimentParams } from './validation.js';
describe('project input validation', () => {
 it('trims queries and deduplicates domains', () => expect(normalizeProjectInput(' battery research ', [' energy ', 'energy', 'controls'])).toEqual({query:'battery research',domains:['energy','controls']}));
 it('rejects invalid query values and lengths', () => { for (const q of [undefined,null,42,'','  ','ab','x'.repeat(501)]) expect(() => normalizeProjectInput(q)).toThrow(); });
 it('rejects invalid domain payloads', () => {
  expect(() => normalizeProjectInput('battery','energy')).toThrow(/array/);
  expect(() => normalizeProjectInput('battery',['a',4])).toThrow(/string/);
  expect(() => normalizeProjectInput('battery',['a','b','c','d','e','f'])).toThrow(/maximum of 5/);
  expect(() => normalizeProjectInput('battery',[''])).toThrow(/between 1 and 80/);
  expect(() => normalizeProjectInput('battery',['x'.repeat(81)])).toThrow(/between 1 and 80/);
 });
 it('leaves omitted domains available for service defaults', () => expect(normalizeProjectInput('battery')).toEqual({query:'battery'}));
});
describe('experiment parameter validation', () => {
 it('accepts inclusive supported boundaries', () => {
  expect(validateExperimentParams({trials:100,baselineNoise:0})).toEqual({trials:100,baselineNoise:0});
  expect(validateExperimentParams({trials:20000,baselineNoise:100}).trials).toBe(20000);
 });
 it('rejects out-of-range, fractional and non-finite values', () => {
  for (const p of [{trials:99,baselineNoise:3},{trials:20001,baselineNoise:3},{trials:100.5,baselineNoise:3},{trials:100,baselineNoise:-1},{trials:100,baselineNoise:101},{trials:100,baselineNoise:NaN},{trials:100,baselineNoise:Infinity}]) expect(() => validateExperimentParams(p)).toThrow();
 });
});