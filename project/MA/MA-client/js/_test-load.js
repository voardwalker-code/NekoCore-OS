const http = require('http');
function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3850' + path, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}
(async () => {
  const html = await get('/');
  const re = /script src="js\/(ma-ui[^"]*\.js)"/g;
  const scripts = [];
  let m;
  while ((m = re.exec(html)) !== null) scripts.push(m[1]);
  console.log('Scripts in HTML (' + scripts.length + '):');
  scripts.forEach((s, i) => console.log('  ' + (i+1) + '. ' + s));

  const expected = ['ma-ui.js','ma-ui-chat.js','ma-ui-nav.js','ma-ui-config.js','ma-ui-editor.js','ma-ui-workspace.js','ma-ui-input.js','ma-ui-bootstrap.js'];
  console.log('Order correct:', JSON.stringify(scripts) === JSON.stringify(expected));

  // Now test: fetch each script and try to eval in a fake browser context
  console.log('\n--- Checking for parse errors ---');
  for (const file of scripts) {
    const src = await get('/js/' + file);
    try {
      new Function(src); // parse check only
      console.log('  OK: ' + file);
    } catch (e) {
      console.log('  PARSE ERROR in ' + file + ': ' + e.message);
    }
  }
})();
