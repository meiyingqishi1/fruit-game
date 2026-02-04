// server.js - Fly.io 静态文件服务器
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = __dirname;

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// 安全文件路径检查
function isSafePath(filePath) {
  const normalized = path.normalize(filePath);
  return normalized.startsWith(PUBLIC_DIR);
}

// 获取文件扩展名
function getExtname(filePath) {
  return path.extname(filePath).toLowerCase();
}

// 创建服务器
const server = http.createServer((req, res) => {
  try {
    const parsedUrl = url.parse(req.url);
    let filePath = parsedUrl.pathname;
    
    // 默认首页
    if (filePath === '/') {
      filePath = '/index.html';
    }
    
    // 构建完整路径
    const fullPath = path.join(PUBLIC_DIR, filePath);
    
    // 安全路径检查
    if (!isSafePath(fullPath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('403 Forbidden');
      return;
    }
    
    // 读取文件
    fs.readFile(fullPath, (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          // 文件不存在，返回 index.html（支持SPA路由）
          fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err, data) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('500 Internal Server Error');
            } else {
              res.writeHead(200, { 
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache'
              });
              res.end(data);
            }
          });
        } else {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('500 Internal Server Error');
        }
        return;
      }
      
      // 获取MIME类型
      const ext = getExtname(fullPath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      
      // 设置响应头
      const headers = {
        'Content-Type': contentType
      };
      
      // 缓存策略
      if (ext.match(/\.(html|css|js|json)$/)) {
        headers['Cache-Control'] = 'no-cache, max-age=0';
      } else if (ext.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp3|wav|ogg)$/)) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      }
      
      // 安全头
      headers['X-Content-Type-Options'] = 'nosniff';
      headers['X-Frame-Options'] = 'DENY';
      headers['X-XSS-Protection'] = '1; mode=block';
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
      
      // 对于文本文件，添加字符集
      if (contentType.startsWith('text/') || contentType.includes('application/json')) {
        if (!contentType.includes('charset=')) {
          headers['Content-Type'] = `${contentType}; charset=utf-8`;
        }
      }
      
      res.writeHead(200, headers);
      res.end(data);
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Internal Server Error');
  }
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`
🚀 水果接龙游戏服务器启动成功！
📡 地址: http://localhost:${PORT}
🌍 环境: ${process.env.NODE_ENV || 'development'}
⏰ 时间: ${new Date().toLocaleString()}
  `);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  server.close(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 健康检查端点
setInterval(() => {
  http.get(`http://localhost:${PORT}/`, (res) => {
    if (res.statusCode !== 200) {
      console.error(`健康检查失败: ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.error('健康检查错误:', err.message);
  });
}, 30000); // 每30秒检查一次
