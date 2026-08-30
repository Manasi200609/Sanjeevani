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

  const get = async (path) => {
    const res = await fetch(`${BASE}${path}`);
    return { status: res.status, data: await res.json() };
  };

  await sleep(3000);
  
  console.log('=== TEST 1: Get patients ===');
  const patients = await get('/api/patients');
  const patient = patients.data.patients?.[0];
  if (!patient) {
    console.log('ERROR: No patients found. Seed demo first.');
    process.exit(1);
  }
  console.log(`Found patient: ${patient.name} (${patient.patientCode}) id=${patient._id}`);
  
  console.log('\n=== TEST 2: English chat message ===');
  const t1 = Date.now();
  const chat1 = await post('/api/vaidya/chat', {
    patientId: patient._id,
    message: 'I have been feeling very tired for the past few days and I also feel dizzy sometimes.',
  });
  const elapsed1 = Date.now() - t1;
  console.log(`Status: ${chat1.status} (${elapsed1}ms)`);
  if (chat1.data.success) {
    console.log(`Response: ${chat1.data.response?.slice(0, 200)}`);
    console.log(`Event created: ${chat1.data.eventCreated}`);
    console.log(`Language: ${chat1.data.language}`);
    console.log(`Sarvam used: ${chat1.data.sarvamUsed}`);
  } else {
    console.log(`ERROR: ${chat1.data.message}`);
  }
  
  // Update patient to Marathi for test 3
  console.log('\n=== TEST 3: Update patient to Marathi ===');
  const updateRes = await fetch(`${BASE}/api/patients/${patient._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferredLanguage: 'Marathi' }),
  });
  const updateData = await updateRes.json();
  console.log(`Updated language: ${updateData.data?.patient?.preferredLanguage || updateData.patient?.preferredLanguage || 'unknown'}`);
  
  console.log('\n=== TEST 4: Marathi chat message ===');
  const t2 = Date.now();
  const chat2 = await post('/api/vaidya/chat', {
    patientId: patient._id,
    message: 'मला गेल्या काही दिवसांपासून खूप थकवा जाणवतोय आणि आता चक्करही येत आहे.',
  });
  const elapsed2 = Date.now() - t2;
  console.log(`Status: ${chat2.status} (${elapsed2}ms)`);
  if (chat2.data.success) {
    console.log(`Response: ${chat2.data.response?.slice(0, 200)}`);
    console.log(`Event created: ${chat2.data.eventCreated}`);
    console.log(`Language: ${chat2.data.language}`);
    console.log(`Sarvam used: ${chat2.data.sarvamUsed}`);
  } else {
    console.log(`ERROR: ${chat2.data.message}`);
  }
  
  // Reset patient language back to English
  await fetch(`${BASE}/api/patients/${patient._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferredLanguage: 'English' }),
  });
  
  console.log('\n=== TEST 5: Casual greeting (no health update expected) ===');
  const t3 = Date.now();
  const chat3 = await post('/api/vaidya/chat', {
    patientId: patient._id,
    message: 'Hello, how are you today?',
  });
  const elapsed3 = Date.now() - t3;
  console.log(`Status: ${chat3.status} (${elapsed3}ms)`);
  if (chat3.data.success) {
    console.log(`Response: ${chat3.data.response?.slice(0, 200)}`);
    console.log(`Event created: ${chat3.data.eventCreated} (should be false for greeting)`);
  } else {
    console.log(`ERROR: ${chat3.data.message}`);
  }
  
  console.log('\n=== SUMMARY ===');
  const allOk = chat1.status === 200 && chat2.status === 200 && chat3.status === 200;
  console.log(`All tests passed: ${allOk}`);
  console.log(`English chat: ${chat1.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`Marathi chat: ${chat2.status === 200 ? 'PASS' : 'FAIL'}`);
  console.log(`Casual greeting: ${chat3.status === 200 ? 'PASS' : 'FAIL'}`);
  
  process.exit(allOk ? 0 : 1);
}).catch(e => { console.error('FATAL:', e.message); process.exit(1); });
