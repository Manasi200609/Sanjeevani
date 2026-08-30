import('./src/server.js').then(async () => {
  const BASE = 'http://localhost:5000';
  
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const post = async (path, body) => {
    const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return res.json();
  };
  const get = async (path) => {
    const res = await fetch(`${BASE}${path}`);
    return res.json();
  };

  await sleep(2000);
  
  console.log('\n=== RESET AND SEED ===');
  const seed = await post('/api/demo/reset-and-seed');
  console.log(`patient=${seed.patient?.name} code=${seed.patient?.patientCode} events=${seed.events}`);
  console.log(`carePlan interval=${seed.carePlan?.followUp?.intervalDays}d priority=${seed.carePlan?.priority}`);
  
  const patientId = seed.patient?._id;
  
  console.log('\n=== WORSENING SCENARIO ===');
  const worsening = await post('/api/demo/scenario/worsening');
  console.log(`success=${worsening.success}`);
  console.log(`BEFORE: trajectory=${worsening.before?.trajectory} risk=${worsening.before?.riskScore} followUp=${worsening.before?.followUpDays}d`);
  console.log(`AFTER:  trajectory=${worsening.after?.trajectory} followUp=${worsening.after?.followUpDays}d priority=${worsening.after?.priority}`);
  
  if (worsening.decision) {
    console.log(`DECISION: type=${worsening.decision?.decisionType} risk=${worsening.decision?.riskLevel} followUp=${worsening.decision?.recommendedFollowUpIntervalDays}d`);
    console.log(`REASONING: ${worsening.decision?.reasoning?.slice(0, 150)}`);
  } else {
    console.log('DECISION: NONE');
  }
  
  if (worsening.agentRun) {
    console.log(`AGENT RUN: status=${worsening.agentRun?.status} duration=${worsening.agentRun?.durationMs}ms`);
  }
  
  console.log(`\nAGENT EVENTS (${worsening.agentEvents?.length || 0}):`);
  for (const e of (worsening.agentEvents || [])) {
    console.log(`  ${(e.type || '?').padEnd(25)} | ${(e.title || '?').slice(0, 70)}`);
  }
  
  console.log('\n=== DEMO STATUS ===');
  const status = await get('/api/demo/status');
  console.log(`patient: trajectory=${status.patient?.trajectory} priority=${status.patient?.priority} followUp=${status.patient?.followUpDays}d`);
  if (status.carePlan) console.log(`carePlan: followUp=${status.carePlan?.followUpDays}d priority=${status.carePlan?.priority} v=${status.carePlan?.version}`);
  if (status.latestDecision) console.log(`latestDecision: type=${status.latestDecision?.type} risk=${status.latestDecision?.riskLevel} followUp=${status.latestDecision?.followUpDays}d`);
  console.log(`counts: ${JSON.stringify(status.counts)}`);
  
  console.log('\n=== TIMELINE ===');
  const timeline = await get(`/api/events/${patientId}/timeline`);
  console.log(`events: ${timeline.count}`);
  for (const e of (timeline.timeline || [])) {
    console.log(`  ${e.eventType} @ ${e.timestamp?.slice(0,10)} risk=${e.riskScore} trajectory=${e.trajectorySignal}`);
  }
  
  process.exit(0);
}).catch(e => { console.error('FATAL:', e.message); process.exit(1); });
