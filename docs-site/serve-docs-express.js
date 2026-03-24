const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const port = 3002;
const build = path.join(__dirname, 'build');
const mime = {
  '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.ico':'image/x-icon', '.woff2':'font/woff2'
};
const server = http.createServer((req,res)=>{
  try{
    const p = url.parse(req.url).pathname || '/';
    if(!p.startsWith('/docs')){
      res.writeHead(302, { Location: '/docs' + p });
      return res.end();
    }
    let rel = decodeURIComponent(p.replace(/^\/docs/, '')) || '/';
    if(rel.endsWith('/')) rel = rel + 'index.html';
    const file = path.join(build, rel);
    if(fs.existsSync(file) && fs.statSync(file).isFile()){
      const ext = path.extname(file).toLowerCase();
      res.setHeader('Content-Type', mime[ext] || 'application/octet-stream');
      const stream = fs.createReadStream(file);
      stream.pipe(res);
      stream.on('error', ()=>{ res.statusCode=500; res.end('error'); });
    } else {
      res.statusCode = 404; res.end('Not found');
    }
  } catch (e){ res.statusCode = 500; res.end('err'); }
});
server.listen(port, ()=>console.log('Serving exact build at http://localhost:'+port+'/docs'));
