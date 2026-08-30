import('./src/server.js').then(async () => {
  const BASE = 'http://localhost:5000';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  const post = async (path, body) => {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json() };
  };

  await sleep(3000);
  
  // Get patient
  const patients = await (await fetch(`${BASE}/api/patients`)).json();
  const patient = patients.patients?.[0];
  if (!patient) { console.log('No patients'); process.exit(1); }
  console.log(`Patient: ${patient.name} (${patient._id})`);
  
  // Test 1: English chat
  console.log('\n--- English chat ---');
  const t1 = Date.now();
  const r1 = await post('/api/vaidya/chat', { patientId: patient._id, message: 'I have been feeling very tired for the past few days and I also feel dizzy sometimes.' });
  console.log(`Status: ${r1.status} (${Date.now()-t1}ms)`);
  console.log(`Response: ${r1.data.response?.slice(0, 150)}`);
  console.log(`Event created: ${r1.data.eventCreated}`);
  
  // Test 2: Greeting
  console.log('\n--- Greeting ---');
  const t2 = Date.now();
  const r2 = await post('/api/vaidya/chat', { patientId: patient._id, message: 'Hello, how are you today?' });
  console.log(`Status: ${r2.status} (${Date.now()-t2}ms)`);
  console.log(`Response: ${r2.data.response?.slice(0, 150)}`);
  console.log(`Event created: ${r2.data.eventCreated} (should be false)`);
  
  // Test 3: TTS English
  console.log('\n--- TTS English ---');
  const r3 = await post('/api/vaidya/voice/speak', { text: 'Hello, I am Vaidya.', languageCode: 'en-IN' });
  console.log(`TTS: success=${r3.data.success} audio=${r3.data.audio?.length || 0} bytes`);
  
  // Test 4: TTS Marathi (using Node fetch to avoid Windows encoding issues)
  console.log('\n--- TTS Marathi ---');
  const r4 = await fetch(`${BASE}/api/vaidya/voice/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'नमस्कार, मी वैद्य आहे.', languageCode: 'mr-IN' }),
  });
  const d4 = await r4.json();
  console.log(`TTS: success=${d4.success} audio=${d4.audio?.length || 0} bytes`);
  
  console.log('\n--- RESULTS ---');
  const pass = r1.status === 200 && r2.status === 200 && r3.data.success && d4.success;
  console.log(`English chat: ${r1.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`Greeting: ${r2.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`TTS English: ${r3.data.success ? 'PASS' : 'FAIL'}`);
  console.log(`TTS Marathi: ${d4.success ? 'PASS' : 'FAIL'}`);
  console.log(`Overall: ${pass ? 'ALL PASS' : 'SOME FAILED'}`);
  
  process.exit(pass ? 0 : 1);
}).catch(e => { console.error('FATAL:', e.message); process.exit(1); });
