import { describe, expect, it } from 'vitest';
import { initialState, reducer, type Action } from './reducer';
import { monitoringAlert, workflowStage } from './presentation';
const run = (...actions: Action[]) => actions.reduce(reducer, initialState()).incident;
const repaired: Action[] = [{type:'RUN_SCENARIO'}, {type:'APPROVE_NOTICE'}, {type:'ASSIGN_CREW'}, {type:'CHECK',item:'isolate'}, {type:'CHECK',item:'repair'}, {type:'CHECK',item:'flush'}];
describe('state-driven workflow presentation', () => {
  it('shows risk inspection before an incident', () => expect(workflowStage(null)).toBe(1));
  it('shows human review after detection', () => expect(workflowStage(run({type:'RUN_SCENARIO'}))).toBe(4));
  it('shows field work after human approval', () => expect(workflowStage(run({type:'RUN_SCENARIO'},{type:'APPROVE_NOTICE'}))).toBe(5));
  it('shows sampling after repair', () => expect(workflowStage(run(...repaired))).toBe(6));
  it('two clear samples show operator clearance, not automatic resolution', () => {
    const inc = run(...repaired,{type:'RECORD_SAMPLE',id:'A',result:'clear'},{type:'RECORD_SAMPLE',id:'B',result:'clear'});
    expect(workflowStage(inc)).toBe(7);
    expect(monitoringAlert(inc)).toBe(true);
  });
  it('failed samples return to retesting with zero clear streak', () => {
    const inc = run(...repaired,{type:'RECORD_SAMPLE',id:'A',result:'clear'},{type:'RECORD_SAMPLE',id:'B',result:'fail'});
    expect(workflowStage(inc)).toBe(6);
    expect(inc?.clearStreak).toBe(0);
  });
  it('only operator clearance restores normal monitoring', () => {
    expect(monitoringAlert(run(...repaired,{type:'RECORD_SAMPLE',id:'A',result:'clear'},{type:'RECORD_SAMPLE',id:'B',result:'clear'},{type:'APPROVE_CLEARANCE'}))).toBe(false);
  });
});