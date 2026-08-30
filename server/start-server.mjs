import('./src/server.js').then(async () => {
  console.log('Server started, waiting...');
  await new Promise(r => setTimeout(r, 3000));
  console.log('Server ready on port 5000');
  // Keep running
  await new Promise(() => {});
}).catch(e => { console.error('FATAL:', e.message); process.exit(1); });
